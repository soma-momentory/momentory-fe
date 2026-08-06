import { render, fireEvent } from "@testing-library/react-native";

import Interests from "../interests";
import Nickname from "../nickname";
import Profile from "../profile";
import CalendarLink from "../calendar";
import Done from "../done";
import RetroTime from "../retro-time";

import { useDraft } from "@/features/onboarding/model/draft";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

// 초안은 모듈 store 라 테스트 사이에 값이 샌다 — 각 테스트가 빈 상태에서 시작해야
// "입력 전 버튼이 잠겨 있다" 같은 단언이 앞 테스트에 기대지 않는다.
beforeEach(() => useDraft.getState().reset());

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

describe("04 · 닉네임", () => {
  const button = (r: Awaited<ReturnType<typeof render>>) => r.getByText("이렇게 불러주세요").parent;

  it("입력 전에도 버튼이 사라지지 않는다 — 비활성으로 남는다", async () => {
    // 다음에 무엇이 오는지 보여야 한다 (04.md)
    const r = await render(<Nickname />);

    expect(r.getByText("이렇게 불러주세요")).toBeTruthy();
    expect(flatten(button(r)?.props.style).opacity).toBe(0.36);
  });

  it("이름을 적으면 열린다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("실명도, 별명도 괜찮아요"), "지현");

    expect(flatten(button(r)?.props.style).opacity).toBeUndefined();
  });

  it("공백만 적은 것은 이름이 아니다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("실명도, 별명도 괜찮아요"), "   ");

    expect(flatten(button(r)?.props.style).opacity).toBe(0.36);
  });

  it("무엇을·왜 묻는지를 두 줄로 나눠 말한다", async () => {
    const { getByText } = await render(<Nickname />);

    expect(getByText("어떻게 불러드리면 좋을까요?")).toBeTruthy();
    expect(
      getByText("당신의 이야기를 편안하게 나눌 수 있도록, 좋아하는 이름을 알려주세요."),
    ).toBeTruthy();
  });
});

describe("05-b · 나이 · 성별", () => {
  it("선택 질문이라 비워도 [다음] 이 열린다", async () => {
    // 나이·성별은 말 거는 방식에만 쓰인다 (05-b.md)
    const { getByText } = await render(<Profile />);

    expect(flatten(getByText("다음").parent?.props.style).opacity).toBeUndefined();
  });

  it("선택 질문임을 라벨 옆 태그로 밝힌다", async () => {
    const { getAllByText } = await render(<Profile />);

    expect(getAllByText("선택")).toHaveLength(2); // 나이 · 성별
  });

  it("비워둔 것과 「선택 안 함」을 구별한다", async () => {
    // 둘 다 답이지만 뜻이 다르다 — 앞은 묻지 않기를 고른 것, 뒤는 해당 없음을 고른 것.
    const { getByText } = await render(<Profile />);
    const noneChip = () => getByText("선택 안 함").parent;

    expect(noneChip()?.props.accessibilityState.selected).toBe(false); // 비어 있음
    await fireEvent.press(getByText("선택 안 함"));
    expect(noneChip()?.props.accessibilityState.selected).toBe(true); //  고른 것
  });

  it("성별은 하나만 고른다 — 다른 것을 누르면 옮겨간다", async () => {
    const { getByText } = await render(<Profile />);

    await fireEvent.press(getByText("여성"));
    await fireEvent.press(getByText("남성"));

    expect(getByText("남성").parent?.props.accessibilityState.selected).toBe(true);
    expect(getByText("여성").parent?.props.accessibilityState.selected).toBe(false);
  });

  it("같은 것을 다시 누르면 미선택으로 돌아간다", async () => {
    // 고른 뒤 무를 길이 있어야 한다 — 선택 질문이므로.
    const { getByText } = await render(<Profile />);

    await fireEvent.press(getByText("여성"));
    await fireEvent.press(getByText("여성"));

    expect(getByText("여성").parent?.props.accessibilityState.selected).toBe(false);
  });
});

describe("06 · 관심 분야", () => {
  const pick = async (r: Awaited<ReturnType<typeof render>>, ...labels: string[]) => {
    for (const l of labels) await fireEvent.press(r.getByText(l));
  };

  it("칩 8개를 한 화면에 다 보인다", async () => {
    // 스크롤로 감추면 뒤쪽은 선택되지 않는다 (06.md)
    const { getByText } = await render(<Interests />);

    for (const label of ["학업", "취업·진로", "일·직장생활", "인간관계", "가족", "나 자신", "건강", "기타"]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it("하나도 안 고르면 버튼이 열리지 않는다 — 필수 질문이다", async () => {
    const r = await render(<Interests />);

    expect(flatten(r.getByText("다음").parent?.props.style).opacity).toBe(0.36);
    expect(r.getByText("하나 이상 골라주세요")).toBeTruthy();
  });

  it("고르면 열리고 개수를 한 줄이 말한다", async () => {
    const r = await render(<Interests />);
    await pick(r, "가족", "건강");

    expect(flatten(r.getByText("다음").parent?.props.style).opacity).toBeUndefined();
    expect(r.getByText("최대 3개 · 2개 선택")).toBeTruthy();
  });

  it("상한을 넘기면 새 선택이 들어가지 않는다 — 고른 것을 밀어내지 않는다", async () => {
    // 무엇이 빠졌는지 모른 채 목록이 바뀌면 되돌릴 수가 없다.
    const r = await render(<Interests />);
    await pick(r, "학업", "가족", "건강", "인간관계");

    expect(r.getByText("인간관계").parent?.props.accessibilityState.selected).toBe(false);
    for (const kept of ["학업", "가족", "건강"]) {
      expect(r.getByText(kept).parent?.props.accessibilityState.selected).toBe(true);
    }
  });

  it("거부를 한 줄로 흡수한다 — 모달을 띄우지 않는다", async () => {
    const r = await render(<Interests />);
    await pick(r, "학업", "가족", "건강", "인간관계");

    expect(r.getByText("최대 3개까지 고를 수 있어요")).toBeTruthy();
  });

  it("하나 빼면 안내가 원래대로 돌아온다", async () => {
    const r = await render(<Interests />);
    await pick(r, "학업", "가족", "건강", "인간관계"); // 거부됨
    await pick(r, "학업"); //                            취소

    expect(r.getByText("최대 3개 · 2개 선택")).toBeTruthy();
  });
});

// 화면 로컬 state 로 두면 04 → 05-b 로 넘어가는 순간 닉네임이 사라지고,
// 10(완료)에서 제출할 데이터 자체가 남지 않는다. (ARCHITECTURE §3)
describe("온보딩 초안 — 답이 화면을 넘어 남는가", () => {
  it("04 에서 적은 닉네임이 초안에 쌓인다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("실명도, 별명도 괜찮아요"), "지현");

    expect(useDraft.getState().nickname).toBe("지현");
  });

  it("새로 그려도 적은 것이 남아 있다 — 뒤로 갔다 와도 같다", async () => {
    // 수동 unmount 를 쓰지 않는다 — RNTL 의 자동 정리와 부딪혀 다음 테스트의
    // render 까지 깨진다. 새 인스턴스가 값을 들고 뜨는 것이 곧 재진입 검증이다.
    const first = await render(<Nickname />);
    await fireEvent.changeText(first.getByPlaceholderText("실명도, 별명도 괜찮아요"), "지현");

    const again = await render(<Nickname />);
    expect(again.getAllByDisplayValue("지현").length).toBeGreaterThan(0);
  });

  it("세 화면의 답이 한 초안에 모인다", async () => {
    const n = await render(<Nickname />);
    await fireEvent.changeText(n.getByPlaceholderText("실명도, 별명도 괜찮아요"), "지현");

    const p = await render(<Profile />);
    await fireEvent.press(p.getByText("여성"));

    const i = await render(<Interests />);
    await fireEvent.press(i.getByText("가족"));

    // 초안에는 라벨이 아니라 **id** 가 담긴다 — 문구가 바뀌어도 저장된 답은 그대로여야 한다
    expect(useDraft.getState()).toMatchObject({
      nickname: "지현",
      gender: "female",
      interests: ["family"],
    });
  });

  it("미선택과 「선택 안 함」이 초안에서도 구별된다", async () => {
    // null 은 묻지 않기를 고른 것, "none" 은 해당 없음을 고른 것이다.
    expect(useDraft.getState().gender).toBeNull();

    const p = await render(<Profile />);
    await fireEvent.press(p.getByText("선택 안 함"));

    expect(useDraft.getState().gender).toBe("none");
  });

  it("reset 은 앞 사람의 답을 남기지 않는다", async () => {
    const n = await render(<Nickname />);
    await fireEvent.changeText(n.getByPlaceholderText("실명도, 별명도 괜찮아요"), "지현");

    useDraft.getState().reset();

    expect(useDraft.getState()).toMatchObject({ nickname: "", gender: null, interests: [] });
  });
});

describe("08 · 회고 시간", () => {
  it("거절을 같은 화면에 둔다 — 막다른 길이 아니게", async () => {
    // "알림 허용"은 앱의 요구, "편한 시간"은 사용자의 선택 (08.md)
    const { getByText } = await render(<RetroTime />);

    expect(getByText("다음")).toBeTruthy();
    expect(getByText("알림 없이 쓸게요")).toBeTruthy();
  });

  it("고르지 않아도 넘어간다 — [다음] 이 잠기지 않는다", async () => {
    const { getByText } = await render(<RetroTime />);

    expect(flatten(getByText("다음").parent?.props.style).opacity).toBeUndefined();
  });

  it("시간 칸은 아직 편집할 수 없다 — 08-b 가 MVP 밖이다", async () => {
    // 키보드로 아무 문자열이나 받으면 시각이 아닌 값이 초안에 들어간다.
    const { getByPlaceholderText } = await render(<RetroTime />);

    expect(getByPlaceholderText("시간 선택").props.editable).toBe(false);
  });

  it("고르지 않아도 시각은 정해져 있다 — 스키마 기본값 21:30", async () => {
    // 값이 없으면 10 의 요약 카드와 홈의 「밤 9:30」 문구가 할 말을 잃는다.
    await render(<RetroTime />);

    expect(useDraft.getState().retroTime).toBe("21:30");
  });

  it("「알림 없이 쓸게요」 도 회고 시각을 지우지 않는다", async () => {
    // 알림만 끄고 홈의 「밤 9:30엔 제가 먼저 말 걸어요」 는 시각을 계속 쓴다.
    useDraft.getState().set("retroTime", "21:30");
    const { getByText } = await render(<RetroTime />);

    await fireEvent.press(getByText("알림 없이 쓸게요"));

    expect(useDraft.getState().retroTime).toBe("21:30");
  });
});

describe("09 · 캘린더", () => {
  it("무엇을 가져가지 않는지를 카드로 못박는다", async () => {
    // 권한 요청에서 가장 알고 싶은 것은 "무엇을 읽는가" 다 (09.md)
    const { getByText } = await render(<CalendarLink />);

    expect(getByText("일정 제목만 참고하며, 내용은 저장하거나 공유하지 않아요.")).toBeTruthy();
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
  });
});

describe("10 · 완료", () => {
  it("받은 답을 그대로 돌려준다", async () => {
    useDraft.getState().set("calendarLinked", true);
    const { getByText } = await render(<Done />);

    expect(getByText("캘린더 연결 완료")).toBeTruthy();
    expect(getByText("밤 9:30")).toBeTruthy(); // 21:30 을 홈과 같은 말투로
  });

  it("연결하지 않았으면 그 줄을 지운다 — 회색 처리하지 않는다", async () => {
    // 있지도 않은 것을 흐리게 남기면 "뭔가 실패했다" 로 읽힌다 (10.md)
    useDraft.getState().set("calendarLinked", false);
    const { queryByText, getByText } = await render(<Done />);

    expect(queryByText("캘린더 연결 완료")).toBeNull();
    expect(getByText("돌아보는 시간")).toBeTruthy(); // 남은 줄은 회고 시각 하나
  });

  it("쉬는 방법 줄이 없다 — 07 을 묻지 않았으므로 돌려줄 답도 없다", async () => {
    const { queryByText } = await render(<Done />);

    expect(queryByText(/쉬는/)).toBeNull();
  });

  it("시작하면 초안을 비운다 — 다음 사람에게 앞 답이 남지 않게", async () => {
    useDraft.getState().set("nickname", "지현");
    const { getByText } = await render(<Done />);

    await fireEvent.press(getByText("모멘토리 시작하기"));

    expect(useDraft.getState().nickname).toBe("");
  });
});
