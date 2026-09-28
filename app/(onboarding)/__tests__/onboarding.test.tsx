import { act, render, fireEvent, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";

import Interests from "../interests";
import Nickname from "../nickname";
import Age from "../age";
import Gender from "../gender";
import CalendarLink from "../calendar";
import Done from "../done";
import Rest from "../rest";
import RetroTime from "../retro-time";

import { SESSION_KEY } from "@/features/auth/model/auth";
import { completeOnboarding } from "@/features/onboarding/data/completeOnboardingApi";
import { UNSPECIFIED_GENDER, useDraft } from "@/features/onboarding/model/draft";
import { requestCalendarAccess } from "@/lib/calendar";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

/**
 * `10` 의 서버 커밋. **어댑터 아래는 `completeOnboardingApi.test` 가 본다** —
 * 여기서 보는 것은 「성공해야 홈으로 간다 · 실패하면 한 줄」이라는 화면의 규칙이다.
 */
jest.mock("@/features/onboarding/data/completeOnboardingApi", () => ({
  completeOnboarding: jest.fn(),
}));

/**
 * `09` 의 OS 권한 다이얼로그. **경계 아래는 `lib/__tests__/calendar.test` 가 본다** —
 * 여기서 보는 것은 「허용 여부가 초안에 그대로 옮겨진다 · 어느 쪽이든 막지 않는다」다.
 */
jest.mock("@/lib/calendar", () => ({ requestCalendarAccess: jest.fn() }));

jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  track: jest.fn(),
}));

/** 첫 적재. 화면이 **기다리지 않는다**는 것만 보므로 호출 여부로 충분하다 */
const mockCalendarSync = jest.fn();
jest.mock("@/features/calendar/model/calendarSync", () => ({
  useCalendarSync: { getState: () => ({ sync: mockCalendarSync }) },
}));

const submit = jest.mocked(completeOnboarding);
const calendarAccess = jest.mocked(requestCalendarAccess);

/** `08` 의 OS 권한 다이얼로그. 기본은 허용이고, 거부 경로만 각 테스트가 바꾼다 */
const notifications = jest.requireMock("expo-notifications") as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
};

// 초안은 모듈 store 라 테스트 사이에 값이 샌다 — 각 테스트가 빈 상태에서 시작해야
// "입력 전 버튼이 잠겨 있다" 같은 단언이 앞 테스트에 기대지 않는다.
beforeEach(() => {
  useDraft.getState().reset();
  jest.clearAllMocks();
  notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
  submit.mockResolvedValue({ ok: true, data: { onboardingRequired: false } });
  calendarAccess.mockResolvedValue({ granted: true, canAskAgain: false });
  mockCalendarSync.mockResolvedValue({ kind: "unchanged" });
});

/**
 * 「잠긴다」를 **동작으로** 본다. 옛 테스트는 `opacity 0.36`(옛 AppButton 의 비활성
 * 표현)을 봤는데, 그건 디자인이 바뀌면 같이 깨지는 단언이다. 새 DS 의 비활성은
 * 면 색이 바뀌고 `accessibilityState.disabled` 가 선다 — 뒤엣것이 규칙이다.
 */
const disabled = (labelNode: { parent: unknown }) => {
  const pressable = labelNode.parent as { props?: { accessibilityState?: { disabled?: boolean } } };
  return pressable?.props?.accessibilityState?.disabled === true;
};

describe("04 · 닉네임", () => {
  const button = (r: Awaited<ReturnType<typeof render>>) => r.getByText("이렇게 불러주세요");

  it("입력 전에도 버튼이 사라지지 않는다 — 비활성으로 남는다", async () => {
    // 다음에 무엇이 오는지 보여야 한다 (04.md)
    const r = await render(<Nickname />);

    expect(r.getByText("이렇게 불러주세요")).toBeTruthy();
    expect(disabled(button(r))).toBe(true);
  });

  it("이름을 적으면 열린다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("이름 또는 별명"), "지현");

    expect(disabled(button(r))).toBe(false);
  });

  it("공백만 적은 것은 이름이 아니다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("이름 또는 별명"), "   ");

    expect(disabled(button(r))).toBe(true);
  });

  it("무엇을·왜 묻는지를 한 메시지 안의 두 문장으로 말한다", async () => {
    const { getByText } = await render(<Nickname />);

    // 시안이 「제목 + 설명」을 한 버블로 합쳤다 (Onboarding.dc.html 「설문형에서 바뀐 것」).
    // 문안은 정본(04.md)을 그대로 두고 줄만 합친다
    expect(
      getByText(
        "어떻게 불러드리면 좋을까요?\n편하게 불리고 싶은 이름을 알려주세요. 실명도, 별명도 괜찮아요.",
      ),
    ).toBeTruthy();
  });

  it("1~10자 — 카운터가 세고, 상한은 maxLength 가 막는다", async () => {
    // 11자부터는 더 입력되지 않고 오류 문구 없이 카운터 색만 바뀐다 (04.md)
    const r = await render(<Nickname />);
    expect(r.getByPlaceholderText("이름 또는 별명").props.maxLength).toBe(10);

    await fireEvent.changeText(r.getByPlaceholderText("이름 또는 별명"), "지현");
    expect(r.getByText("2/10")).toBeTruthy();
  });

  it("금지어(바바·모멘토리)일 때만 한 줄이 붙고 버튼이 잠긴다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("이름 또는 별명"), "바바");

    expect(r.getByText(/다른 이름을 알려주세요/)).toBeTruthy();
    expect(disabled(button(r))).toBe(true);

    await fireEvent.changeText(r.getByPlaceholderText("이름 또는 별명"), "바바님");
    expect(r.queryByText(/다른 이름을 알려주세요/)).toBeNull();
  });
});

/**
 * 옛 `05-b` 는 나이와 성별을 **한 화면의 폼 두 칸**으로 받았다. 새 디자인은 대화형이라
 * 질문 하나에 답 하나가 원칙이고, 시안도 `05-a·b`(나이) / `05-c·d`(성별)로 나눈다.
 * **선택 항목임을 말하는 방식도 바뀌었다** — 「선택사항」 배지 → 우상단 건너뛰기.
 */
describe("05-a · 나이 (선택)", () => {
  it("선택 항목이라 우상단에 빠져나갈 길이 있다", async () => {
    const { getByText } = await render(<Age />);

    expect(getByText("건너뛰기")).toBeTruthy();
  });

  it("건너뛰면 적던 값도 지운다 — 안 고른 것이 답이다", async () => {
    await act(() => useDraft.getState().set("age", "25"));
    const { getByText } = await render(<Age />);

    await fireEvent.press(getByText("건너뛰기"));

    expect(useDraft.getState().age).toBe("");
    expect(router.push).toHaveBeenCalledWith("/gender");
  });

  it("숫자만 받는다 — 적으면 [다음] 이 열린다", async () => {
    const r = await render(<Age />);
    expect(disabled(r.getByText("다음"))).toBe(true);

    await fireEvent.changeText(r.getByPlaceholderText("나이"), "25살");

    expect(useDraft.getState().age).toBe("25");
    expect(disabled(r.getByText("다음"))).toBe(false);
  });
});

describe("05-c · 성별 (선택)", () => {
  it("선택 항목이라 우상단에 빠져나갈 길이 있다", async () => {
    const { getByText } = await render(<Gender />);

    expect(getByText("건너뛰기")).toBeTruthy();
  });

  it("고르기 전에는 [다음] 이 잠긴다 — 건너뛰기가 그 길이다", async () => {
    const { getByText } = await render(<Gender />);

    expect(disabled(getByText("다음"))).toBe(true);
    await fireEvent.press(getByText("여성"));
    expect(disabled(getByText("다음"))).toBe(false);
  });

  it("건너뛰면 고른 것도 지운다 — 「선택 안 함」과 다른 답이다", async () => {
    await act(() => useDraft.getState().set("gender", UNSPECIFIED_GENDER));
    const { getByText } = await render(<Gender />);

    await fireEvent.press(getByText("건너뛰기"));

    expect(useDraft.getState().gender).toBeNull();
  });

  it("비워둔 것과 「선택 안 함」을 구별한다", async () => {
    // 둘 다 답이지만 뜻이 다르다 — 앞은 묻지 않기를 고른 것, 뒤는 해당 없음을 고른 것.
    const { getByText } = await render(<Gender />);
    const noneChip = () => getByText("선택 안 함").parent;

    expect(noneChip()?.props.accessibilityState.selected).toBe(false); // 비어 있음
    await fireEvent.press(getByText("선택 안 함"));
    expect(noneChip()?.props.accessibilityState.selected).toBe(true); //  고른 것
  });

  it("성별은 하나만 고른다 — 다른 것을 누르면 옮겨간다", async () => {
    const { getByText } = await render(<Gender />);

    await fireEvent.press(getByText("여성"));
    await fireEvent.press(getByText("남성"));

    expect(getByText("남성").parent?.props.accessibilityState.selected).toBe(true);
    expect(getByText("여성").parent?.props.accessibilityState.selected).toBe(false);
  });

  it("같은 것을 다시 누르면 미선택으로 돌아간다", async () => {
    // 고른 뒤 무를 길이 있어야 한다 — 선택 질문이므로.
    const { getByText } = await render(<Gender />);

    await fireEvent.press(getByText("여성"));
    await fireEvent.press(getByText("여성"));

    expect(getByText("여성").parent?.props.accessibilityState.selected).toBe(false);
  });
});

describe("06 · 관심 분야 (+ 06-b·06-c 기타 입력)", () => {
  const pick = async (r: Awaited<ReturnType<typeof render>>, ...labels: string[]) => {
    for (const l of labels) await fireEvent.press(r.getByText(l));
  };

  it("칩 8개를 한 화면에 다 보인다", async () => {
    // 스크롤로 감추면 뒤쪽은 선택되지 않는다 (06.md)
    const { getByText } = await render(<Interests />);

    for (const label of [
      "학업",
      "취업·진로",
      "일·직장생활",
      "인간관계",
      "가족",
      "나 자신",
      "건강",
      "기타",
    ]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it("하나도 안 고르면 버튼이 열리지 않는다 — 필수 질문이다", async () => {
    const r = await render(<Interests />);

    expect(disabled(r.getByText("다음"))).toBe(true);
    expect(r.getByText("하나 이상 골라주세요")).toBeTruthy();
  });

  it("고르면 열리고 안내는 사실만 말한다", async () => {
    // "N개 선택됨 · …" — 제한 경고를 미리 띄우지 않는다 (06-c.md)
    const r = await render(<Interests />);
    await pick(r, "가족", "건강");

    expect(disabled(r.getByText("다음"))).toBe(false);
    expect(r.getByText("2개 선택됨 · 다시 누르면 선택이 해제돼요")).toBeTruthy();
  });

  it("넷째부터는 눌러도 켜지지 않는다 — 경고도 띄우지 않는다", async () => {
    // 고른 것을 밀어내지 않고, 제한 경고를 미리 띄우지 않는다 (06.md · 06-c.md)
    const r = await render(<Interests />);
    await pick(r, "학업", "가족", "건강", "인간관계");

    expect(r.getByText("인간관계").parent?.props.accessibilityState.selected).toBe(false);
    for (const kept of ["학업", "가족", "건강"]) {
      expect(r.getByText(kept).parent?.props.accessibilityState.selected).toBe(true);
    }
    expect(r.queryByText(/최대/)).toBeNull();
    expect(r.getByText("3개 선택됨 · 다시 누르면 선택이 해제돼요")).toBeTruthy();
  });

  it("[기타]를 누르면 칩 바로 아래에 한 줄 입력이 열린다", async () => {
    const r = await render(<Interests />);
    expect(r.queryByPlaceholderText("직접 입력")).toBeNull();

    await pick(r, "기타");

    expect(r.getByPlaceholderText("직접 입력")).toBeTruthy();
    expect(r.getByText("0/12")).toBeTruthy();
  });

  it("기타를 켠 채 비워 두면 [다음] 이 잠기고 경고 한 줄이 붙는다", async () => {
    // 켠 것은 "적을 게 있다"는 뜻 — 조용히 꺼버리면 적으려던 것을 놓친다 (06-b.md)
    const r = await render(<Interests />);
    await pick(r, "기타");

    expect(disabled(r.getByText("다음"))).toBe(true);
    expect(r.getByText("기타에 무엇을 적을지 알려주세요.")).toBeTruthy();
  });

  it("적으면 열리고 지우기 × 가 나타난다", async () => {
    const r = await render(<Interests />);
    await pick(r, "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "이사 준비");

    expect(r.getByText("5/12")).toBeTruthy();
    expect(r.getByLabelText("기타 지우기")).toBeTruthy();
    expect(disabled(r.getByText("다음"))).toBe(false);
    expect(r.queryByText("기타에 무엇을 적을지 알려주세요.")).toBeNull();
  });

  it("[확인] 을 누르면 그걸로 확정된다 — 앞뒤 공백은 잘라낸다", async () => {
    const r = await render(<Interests />);
    await pick(r, "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), " 이사 준비 ");

    await fireEvent.press(r.getByText("확인"));

    expect(useDraft.getState().interestOther).toBe("이사 준비");
    expect(useDraft.getState().interests).toEqual(["OTHER"]);
  });

  it("확정하면 「기타」 칩이 적은 값으로 바뀐다", async () => {
    // 「완료를 누르면 칩이 됩니다」 (06-c.md) — 칩이 「기타」로만 남으면
    // 무엇을 골랐는지 나중에 못 읽는다
    const r = await render(<Interests />);
    await pick(r, "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), " 이사 준비 ");

    await fireEvent.press(r.getByText("확인"));

    expect(r.getByText("이사 준비")).toBeTruthy();
    expect(r.queryByText("기타")).toBeNull();
  });

  it("적는 중에는 칩이 아직 「기타」다 — 확정을 지나야 바뀐다", async () => {
    // 타자마다 칩이 바뀌면 「확인을 누르면 저장돼요」와 어긋난다 (06-c.md)
    const r = await render(<Interests />);
    await pick(r, "기타");

    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "이사 준비");

    expect(r.getByText("기타")).toBeTruthy();
    expect(r.queryByText("이사 준비")).toBeNull();
  });

  it("키보드 [완료] 도 칩을 바꾼다 — 확정은 한 규칙이다", async () => {
    const r = await render(<Interests />);
    await pick(r, "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "이사 준비");

    await fireEvent(r.getByPlaceholderText("직접 입력"), "submitEditing");

    expect(r.getByText("이사 준비")).toBeTruthy();
  });

  it("확정하면 「확인을 누르면 저장돼요」가 사라진다 — 끝난 일을 할 일처럼 남기지 않는다", async () => {
    const r = await render(<Interests />);
    await pick(r, "가족", "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "이사 준비");
    expect(r.getByText("2개 선택됨 · 확인을 누르면 저장돼요")).toBeTruthy();

    await fireEvent.press(r.getByText("확인"));

    expect(r.getByText("2개 선택됨 · 다시 누르면 선택이 해제돼요")).toBeTruthy();
  });

  it("확정하면 입력 줄과 [확인] 이 사라진다 — 답은 칩이 들고 있다", async () => {
    // 같은 답을 두 자리에 두지 않는다 (06-c.md 「완료를 누르면 칩이 됩니다」)
    const r = await render(<Interests />);
    await pick(r, "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "이사 준비");

    await fireEvent.press(r.getByText("확인"));

    expect(r.queryByPlaceholderText("직접 입력")).toBeNull();
    expect(r.queryByText("확인")).toBeNull();
    expect(r.getByText("이사 준비")).toBeTruthy();
  });

  it("기타를 껐다 다시 켜면 빈 줄이 다시 열린다 — 고쳐 적는 길이다", async () => {
    const r = await render(<Interests />);
    await pick(r, "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "이사 준비");
    await fireEvent.press(r.getByText("확인"));

    await fireEvent.press(r.getByText("이사 준비"));
    await fireEvent.press(r.getByText("기타"));

    expect(r.getByPlaceholderText("직접 입력")).toBeTruthy();
    expect(r.getByText("0/12")).toBeTruthy();
  });

  it("확정한 뒤 기타를 끄면 칩 이름이 「기타」로 돌아온다", async () => {
    const r = await render(<Interests />);
    await pick(r, "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "이사 준비");
    await fireEvent.press(r.getByText("확인"));

    await fireEvent.press(r.getByText("이사 준비"));

    expect(r.getByText("기타")).toBeTruthy();
    expect(useDraft.getState().interestOther).toBe("");
  });

  it("공백뿐이면 [확인] 이 잠긴다 — 빈 답을 확정할 수 없다", async () => {
    // design.md §7 「전송/확인 — 값이 비면 비활성」
    const r = await render(<Interests />);
    await pick(r, "가족", "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "   ");

    expect(disabled(r.getByText("확인"))).toBe(true);
  });

  it("공백뿐인 채로 넘어가면 기타 선택이 취소된다 — 빈 칩을 만들지 않는다", async () => {
    // 확정은 [확인] 이지만 키보드 완료·[다음] 도 같은 규칙을 지난다 (06-c.md).
    // ⚠ **밖 탭(blur)은 더 이상 확정이 아니다** — 확정 버튼을 둔 이상 하나여야 한다
    const r = await render(<Interests />);
    await pick(r, "가족", "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "   ");
    await fireEvent(r.getByPlaceholderText("직접 입력"), "submitEditing");

    expect(r.getByText("기타").parent?.props.accessibilityState.selected).toBe(false);
    expect(useDraft.getState().interestOther).toBe("");
  });

  it("기타를 끄면 적던 값도 함께 비운다", async () => {
    const r = await render(<Interests />);
    await pick(r, "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "이사 준비");
    // 입력 줄이 열리면 "기타"가 칩과 줄 라벨 둘이 된다 — 칩(첫 번째)을 눌러 끈다
    await fireEvent.press(r.getAllByText("기타")[0]!);

    expect(useDraft.getState().interestOther).toBe("");
    expect(r.queryByPlaceholderText("직접 입력")).toBeNull();
  });
});

describe("07 · 쉬는 방법", () => {
  it("선택지 15개를 한 화면에 다 보인다 — 이모지는 라벨의 일부다", async () => {
    // 아이콘을 선 아이콘으로 바꾼 규칙의 유일한 예외 (07.md)
    const { getByText } = await render(<Rest />);

    for (const label of [
      "😴 잠자기",
      "🎵 음악 듣기",
      "🚶 산책하기",
      "🔄 그때마다 달라요",
      "😶 멍하니 쉬기",
      "기타",
    ]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it("필수 질문이다 — 하나도 안 고르면 잠긴다", async () => {
    const r = await render(<Rest />);

    expect(disabled(r.getByText("다음"))).toBe(true);
    expect(r.getByText("하나 이상 골라주세요")).toBeTruthy();
  });

  it("복수 선택 · 상한 없음 · 다시 누르면 취소", async () => {
    const r = await render(<Rest />);
    for (const l of ["🎵 음악 듣기", "🚶 산책하기", "😴 잠자기", "🧘 명상하기"]) {
      await fireEvent.press(r.getByText(l));
    }

    expect(r.getByText("4개 선택됨 · 다시 누르면 선택이 해제돼요")).toBeTruthy();

    await fireEvent.press(r.getByText("🧘 명상하기"));
    expect(r.getByText("3개 선택됨 · 다시 누르면 선택이 해제돼요")).toBeTruthy();
    // **라벨이 아니라 서버 코드가 남는다** — 이모지 문자열을 id 로 쓰면 서버가
    // 받지 못하고, 항목을 늘렸을 때 그 칩만 조용히 사라진다
    expect(useDraft.getState().restMethods).toEqual(["LISTENING_TO_MUSIC", "WALKING", "SLEEP"]);
  });

  it("[기타] 를 누르면 적을 자리가 열리고, 비워 두면 [다음] 이 잠긴다", async () => {
    // 서버가 OTHER 와 함께 직접 입력 값을 요구한다 — 없으면 제출이 400 이다
    // (DISCUSSION §1-7). 시안에 없는 줄이라 PRODUCT.md 「상류와 차이」 15번.
    const r = await render(<Rest />);

    await fireEvent.press(r.getByText("기타"));

    expect(r.getByPlaceholderText("직접 입력")).toBeTruthy();
    expect(disabled(r.getByText("다음"))).toBe(true);
    expect(r.getByText("기타에 무엇을 적을지 알려주세요.")).toBeTruthy();
  });

  it("기타에 적으면 열리고, 그 값이 초안에 남는다", async () => {
    const r = await render(<Rest />);
    await fireEvent.press(r.getByText("기타"));

    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), " 뜨개질 ");
    await fireEvent(r.getByPlaceholderText("직접 입력"), "submitEditing");

    expect(useDraft.getState().restMethodOther).toBe("뜨개질");
    expect(useDraft.getState().restMethods).toEqual(["OTHER"]);
    expect(disabled(r.getByText("다음"))).toBe(false);
  });

  it("기타를 끄면 적던 값도 함께 비운다 — 꺼진 답을 초안에 남기지 않는다", async () => {
    const r = await render(<Rest />);
    await fireEvent.press(r.getByText("기타"));
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "뜨개질");

    // 줄이 열리면 「기타」가 둘이다 — 칩과 입력 줄의 이름. 앞의 것이 칩이다
    await fireEvent.press(r.getAllByText("기타")[0]!);

    expect(useDraft.getState().restMethods).toEqual([]);
    expect(useDraft.getState().restMethodOther).toBe("");
  });

  it("공백만 적고 확정하면 기타 선택이 취소된다 — 빈 칩을 만들지 않는다", async () => {
    const r = await render(<Rest />);
    await fireEvent.press(r.getByText("기타"));

    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "   ");
    await fireEvent(r.getByPlaceholderText("직접 입력"), "submitEditing");

    expect(useDraft.getState().restMethods).toEqual([]);
    expect(useDraft.getState().restMethodOther).toBe("");
  });
});

// 화면 로컬 state 로 두면 04 → 05-b 로 넘어가는 순간 닉네임이 사라지고,
// 10(완료)에서 제출할 데이터 자체가 남지 않는다. (ARCHITECTURE §3)
describe("온보딩 초안 — 답이 화면을 넘어 남는가", () => {
  it("04 에서 적은 닉네임이 초안에 쌓인다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("이름 또는 별명"), "지현");

    expect(useDraft.getState().nickname).toBe("지현");
  });

  it("새로 그려도 적은 것이 남아 있다 — 뒤로 갔다 와도 같다", async () => {
    // 수동 unmount 를 쓰지 않는다 — RNTL 의 자동 정리와 부딪혀 다음 테스트의
    // render 까지 깨진다. 새 인스턴스가 값을 들고 뜨는 것이 곧 재진입 검증이다.
    const first = await render(<Nickname />);
    await fireEvent.changeText(first.getByPlaceholderText("이름 또는 별명"), "지현");

    const again = await render(<Nickname />);
    expect(again.getAllByDisplayValue("지현").length).toBeGreaterThan(0);
  });

  it("세 화면의 답이 한 초안에 모인다", async () => {
    const n = await render(<Nickname />);
    await fireEvent.changeText(n.getByPlaceholderText("이름 또는 별명"), "지현");

    const p = await render(<Gender />);
    await fireEvent.press(p.getByText("여성"));

    const i = await render(<Interests />);
    await fireEvent.press(i.getByText("가족"));

    // 초안에는 라벨이 아니라 **서버 코드**가 담긴다 — 문구가 바뀌어도 저장된
    // 답은 그대로여야 하고, 그 코드가 그대로 서버로 나간다
    expect(useDraft.getState()).toMatchObject({
      nickname: "지현",
      gender: "FEMALE",
      interests: ["FAMILY"],
    });
  });

  it("미선택과 「선택 안 함」이 초안에서도 구별된다", async () => {
    // null 은 묻지 않기를 고른 것, UNSPECIFIED 는 해당 없음을 고른 것이다.
    expect(useDraft.getState().gender).toBeNull();

    const p = await render(<Gender />);
    await fireEvent.press(p.getByText("선택 안 함"));

    expect(useDraft.getState().gender).toBe(UNSPECIFIED_GENDER);
  });

  it("reset 은 앞 사람의 답을 남기지 않는다", async () => {
    const n = await render(<Nickname />);
    await fireEvent.changeText(n.getByPlaceholderText("이름 또는 별명"), "지현");

    await act(() => useDraft.getState().reset());

    expect(useDraft.getState()).toMatchObject({
      nickname: "",
      gender: null,
      interests: [],
      restMethods: [],
      notifyRetro: true,
    });
  });
});

/**
 * 시간 칩 → 바텀시트 휠 → `완료`. 시안이 정한 경로 그대로다
 * (`08-a` 미선택 → `08-b` 시트 → `08-c` 완료).
 */
const pickTime = async (getByText: (t: string) => unknown) => {
  await fireEvent.press(getByText("시간 선택") as never);
  await fireEvent.press(getByText("9시") as never);
  await fireEvent.press(getByText("완료") as never);
};

describe("08 · 회고 시간", () => {
  it("거절을 같은 화면에 둔다 — 막다른 길이 아니게", async () => {
    // "알림 허용"은 앱의 요구, "편한 시간"은 사용자의 선택 (08.md)
    const { getByText } = await render(<RetroTime />);

    expect(getByText("다음")).toBeTruthy();
    expect(getByText("알림 없이 쓸게요")).toBeTruthy();
  });

  it("「마지막으로,」를 쓰지 않는다 — 마지막이라는 말은 캘린더 한 곳에만", async () => {
    const { getByText, queryByText } = await render(<RetroTime />);

    expect(getByText(/하루를 언제 돌아보면 가장 편안할까요\?/)).toBeTruthy();
    expect(queryByText(/마지막으로/)).toBeNull();
  });

  it("고르기 전에는 [다음] 이 잠긴다 — 빠져나갈 길은 [알림 없이 쓸게요] 다", async () => {
    // ⚠ 옛 동작(안 골라도 넘어감)이 뒤집혔다 — 시안 08-a 「시간 미선택」이
    // CTA 를 disabled 로 그린다. 대신 거절 경로가 같은 화면에 그대로 있다
    const { getByText } = await render(<RetroTime />);

    expect(disabled(getByText("다음"))).toBe(true);
    expect(disabled(getByText("알림 없이 쓸게요"))).toBe(false);
  });

  it("고르지 않아도 시각은 정해져 있다 — 스키마 기본값 21:30", async () => {
    // 값이 없으면 10 의 요약 카드와 홈의 「밤 9:30」 문구가 할 말을 잃는다.
    const { getByText } = await render(<RetroTime />);

    // 고르기 전에는 시간 칩 — 기본값을 「고른 것」처럼 보이지 않는다
    expect(getByText("시간 선택")).toBeTruthy();
    expect(useDraft.getState().retroTime).toBe("21:30");
  });

  it("「알림 없이 쓸게요」 는 알림만 끈다 — 회고 시각은 남는다", async () => {
    const { getByText } = await render(<RetroTime />);

    await fireEvent.press(getByText("알림 없이 쓸게요"));

    expect(useDraft.getState().notifyRetro).toBe(false);
    expect(useDraft.getState().retroTime).toBe("21:30");
  });

  // `[다음]` 은 OS 다이얼로그를 기다린다 — 누른 직후가 아니라 답이 온 뒤에 본다
  it("[다음] 은 알림 의도를 켠 채 넘어간다", async () => {
    useDraft.getState().set("notifyRetro", false);
    const { getByText } = await render(<RetroTime />);
    await pickTime(getByText);

    await fireEvent.press(getByText("다음"));

    await waitFor(() => expect(useDraft.getState().notifyRetro).toBe(true));
  });

  it("[다음] 저장 직후 OS 가 권한을 묻는다 — 커스텀 화면을 만들지 않는다", async () => {
    // 원본 `P*` 는 OS 가 그린다 (RULES.md 「OS 권한」 · 08.md)
    const { getByText } = await render(<RetroTime />);
    await pickTime(getByText);

    await fireEvent.press(getByText("다음"));

    await waitFor(() => expect(notifications.requestPermissionsAsync).toHaveBeenCalled());
  });

  it("[알림 없이 쓸게요] 는 묻지도 않는다 — 이미 답한 사람에게 다시 묻지 않는다", async () => {
    const { getByText } = await render(<RetroTime />);

    await fireEvent.press(getByText("알림 없이 쓸게요"));

    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("거부해도 온보딩은 멈추지 않는다 — 알림만 꺼지고 시각은 남는다", async () => {
    // 거부는 오류가 아니라 답이다. 안내도 재시도도 없이 결과가
    // [알림 없이 쓸게요] 와 같아진다 (RULES.md 4)
    notifications.requestPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    const { getByText, queryByText } = await render(<RetroTime />);
    await pickTime(getByText);

    await fireEvent.press(getByText("다음"));

    await waitFor(() => expect(jest.mocked(router.push)).toHaveBeenCalledWith("/calendar"));
    expect(useDraft.getState().notifyRetro).toBe(false);
    expect(useDraft.getState().retroTime).toBe("21:30");
    expect(queryByText(/다시|허용해|설정에서/)).toBeNull();
  });
});

describe("09 · 캘린더", () => {
  it("안내는 실제 처리와 같은 말이다 — 저장한다고 말한다", async () => {
    // 일정 제목은 Schedule 로 저장되므로 "저장하지 않아요"라고 쓸 수 없다 (09.md)
    const { getByText } = await render(<CalendarLink />);

    expect(
      getByText(
        "일정 제목을 모멘토리에 저장해 회고 질문을 만드는 데 사용해요. 캘린더 원본은 수정하지 않고, 다른 사람에게 공유하지 않아요.",
      ),
    ).toBeTruthy();
  });

  it("거절 경로를 숨기지 않는다 — 보이지 않으면 허용이 강요가 된다", async () => {
    const { getByText } = await render(<CalendarLink />);

    expect(getByText("캘린더 연결하기")).toBeTruthy();
    expect(getByText("나중에 할게요")).toBeTruthy();
  });

  it("연결하든 미루든 온보딩은 이어진다 — 실패가 막지 않는다", async () => {
    const a = await render(<CalendarLink />);
    await fireEvent.press(a.getByText("나중에 할게요"));
    expect(useDraft.getState().calendarLinked).toBe(false);

    const b = await render(<CalendarLink />);
    await fireEvent.press(b.getByText("캘린더 연결하기"));
    expect(useDraft.getState().calendarLinked).toBe(true);
    expect(router.push).toHaveBeenCalledWith("/done");
  });

  it("무엇을 골랐는지 남긴다 — 마이에서 다시 이은 사람과 진입점을 가른다", async () => {
    const { track } = jest.requireMock("@/features/analytics") as { track: jest.Mock };
    const a = await render(<CalendarLink />);
    await fireEvent.press(a.getByText("나중에 할게요"));
    const b = await render(<CalendarLink />);
    await fireEvent.press(b.getByText("캘린더 연결하기"));

    const chosen = track.mock.calls.filter(([name]) => name === "calendar_link_chosen");
    expect(chosen.map(([, props]) => props)).toEqual([
      { source: "onboarding", choice: "later" },
      { source: "onboarding", choice: "link" },
    ]);
  });

  it("허용하지 않으면 연결됐다고 하지 않는다 — 안내와 처리가 같아야 한다", async () => {
    // 거부해도 온보딩은 이어진다. 다만 완료 화면은 `10-b` 가 된다
    calendarAccess.mockResolvedValue({ granted: false, canAskAgain: false });

    const { getByText } = await render(<CalendarLink />);
    await fireEvent.press(getByText("캘린더 연결하기"));

    expect(useDraft.getState().calendarLinked).toBe(false);
    expect(router.push).toHaveBeenCalledWith("/done");
  });

  it("커스텀 권한 화면을 만들지 않는다 — OS 다이얼로그를 부른다", async () => {
    const { getByText } = await render(<CalendarLink />);
    await fireEvent.press(getByText("캘린더 연결하기"));

    expect(calendarAccess).toHaveBeenCalledTimes(1);
  });

  it("허용했을 때만 첫 적재를 건다 — 화면은 기다리지 않는다", async () => {
    // 적재는 사용자에게 묶인다 — 세션이 있어야 어느 사용자 것인지 정해진다
    const secureStore = jest.requireMock("expo-secure-store") as { __store: Map<string, string> };
    secureStore.__store.set(
      SESSION_KEY,
      JSON.stringify({
        accessToken: "a",
        refreshToken: "r",
        expiresAt: Date.now() + 60_000,
        userId: 7,
      }),
    );

    const allowed = await render(<CalendarLink />);
    await fireEvent.press(allowed.getByText("캘린더 연결하기"));
    await waitFor(() => expect(mockCalendarSync).toHaveBeenCalledWith(7));

    mockCalendarSync.mockClear();
    calendarAccess.mockResolvedValue({ granted: false, canAskAgain: false });

    const denied = await render(<CalendarLink />);
    await fireEvent.press(denied.getByText("캘린더 연결하기"));
    expect(mockCalendarSync).not.toHaveBeenCalled();
  });
});

describe("10 · 완료 (+ 10-b 건너뜀)", () => {
  it("받은 답을 그대로 돌려준다", async () => {
    useDraft.getState().set("calendarLinked", true);
    const { getByText, getByTestId } = await render(<Done />);

    const summary = within(getByTestId("onboarding-summary"));
    expect(summary.getByText("캘린더 연결 완료")).toBeTruthy();
    expect(summary.getByText("밤 9:30")).toBeTruthy(); // 21:30 을 홈과 같은 말투로
    expect(getByText("마이에서 언제든 바꿀 수 있어요.")).toBeTruthy();
  });

  it("캘린더만 건너뛰면 그 줄을 지운다 — 회색 처리하지 않는다", async () => {
    // 있지도 않은 것을 흐리게 남기면 "뭔가 실패했다" 로 읽힌다 (10.md · 10-b.md)
    useDraft.getState().set("calendarLinked", false);
    const { queryByText, getByText } = await render(<Done />);

    expect(queryByText("캘린더 연결 완료")).toBeNull();
    expect(getByText("돌아보는 시간")).toBeTruthy(); // 남은 줄은 회고 시각 하나
  });

  it("알림만 끄면 캘린더 줄이 남는다", async () => {
    useDraft.getState().set("calendarLinked", true);
    useDraft.getState().set("notifyRetro", false);
    const { queryByText, getByText } = await render(<Done />);

    expect(getByText("캘린더 연결 완료")).toBeTruthy();
    expect(queryByText("돌아보는 시간")).toBeNull();
  });

  it("둘 다 건너뛰면 카드에는 안내 한 줄만 남는다 — 10-b", async () => {
    // 고르지 않은 것을 부정형으로 강조하지 않는다 (10-b.md)
    useDraft.getState().set("calendarLinked", false);
    useDraft.getState().set("notifyRetro", false);
    const { queryByText, getByText } = await render(<Done />);

    expect(queryByText("캘린더 연결 완료")).toBeNull();
    expect(queryByText("돌아보는 시간")).toBeNull();
    expect(
      getByText("캘린더 연결과 돌아보는 시간은 마이에서 언제든 설정할 수 있어요."),
    ).toBeTruthy();
    expect(getByText("모멘토리 시작하기")).toBeTruthy(); // CTA 는 두 화면이 같다
  });

  it("요약 카드에 쉬는 방법 줄이 없다 — 07 은 묻지만 요약 줄은 쉼터 연쇄라 제외다", async () => {
    // 답은 User.restMethods 로 저장만 한다 (07.md · RULES.md).
    // ⚠ **대화에는 내가 한 답이 남는다** — 그게 대화형의 요점이다. 여기서 보는 것은
    // 요약 카드가 그 답을 「정해진 것」으로 다시 세우지 않는다는 것이다
    useDraft.getState().set("restMethods", ["🎵 음악 듣기"]);
    const { queryByText, getByTestId } = await render(<Done />);

    const summary = within(getByTestId("onboarding-summary"));
    expect(queryByText(/쉬는/)).toBeNull();
    expect(summary.queryByText(/음악 듣기/)).toBeNull();
  });

  it("시작하면 초안을 비운다 — 다음 사람에게 앞 답이 남지 않게", async () => {
    useDraft.getState().set("nickname", "지현");
    const { getByText } = await render(<Done />);

    await fireEvent.press(getByText("모멘토리 시작하기"));

    await waitFor(() => expect(useDraft.getState().nickname).toBe(""));
  });

  it("답을 서버에 남기고서야 홈으로 간다", async () => {
    useDraft.getState().set("nickname", "지현");
    useDraft.getState().set("restMethods", ["SLEEP"]);
    const { getByText } = await render(<Done />);

    await fireEvent.press(getByText("모멘토리 시작하기"));

    await waitFor(() => expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home"));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: "지현", restMethods: ["SLEEP"] }),
    );
  });

  it("보내지 못하면 홈으로 가지 않는다 — 초안도 그대로 둔다", async () => {
    // 완료의 정본은 서버다(`syncMe`). 보내지 못한 채 넘어가면 앱을 다시 열었을 때
    // 열한 화면을 처음부터 다시 답하게 된다.
    submit.mockResolvedValue({ ok: false, code: "network" });
    useDraft.getState().set("nickname", "지현");
    const { getByText } = await render(<Done />);

    await fireEvent.press(getByText("모멘토리 시작하기"));

    await waitFor(() =>
      expect(getByText("지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.")).toBeTruthy(),
    );
    expect(jest.mocked(router.replace)).not.toHaveBeenCalled();
    expect(useDraft.getState().nickname).toBe("지현");
  });

  it("200 인데 아직 「온보딩 필요」면 성공으로 보지 않는다", async () => {
    submit.mockResolvedValue({ ok: true, data: { onboardingRequired: true } });
    const { getByText } = await render(<Done />);

    await fireEvent.press(getByText("모멘토리 시작하기"));

    await waitFor(() =>
      expect(getByText("지금은 저장할 수 없어요. 잠시 뒤 다시 시도해 주세요.")).toBeTruthy(),
    );
    expect(jest.mocked(router.replace)).not.toHaveBeenCalled();
  });

  it("실패해도 모달·재시도 버튼을 두지 않는다 — 다시 누를 곳은 CTA 하나다", async () => {
    submit.mockResolvedValue({ ok: false, code: "server" });
    const { getByText, queryByText } = await render(<Done />);

    await fireEvent.press(getByText("모멘토리 시작하기"));

    await waitFor(() => expect(queryByText(/저장할 수 없어요/)).toBeTruthy());
    expect(queryByText(/다시 시도하기|재시도/)).toBeNull();
    expect(getByText("모멘토리 시작하기")).toBeTruthy();
  });
});
