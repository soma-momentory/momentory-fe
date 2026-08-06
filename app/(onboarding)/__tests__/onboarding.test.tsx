import { act, render, fireEvent } from "@testing-library/react-native";

import Interests from "../interests";
import Nickname from "../nickname";
import Profile from "../profile";
import CalendarLink from "../calendar";
import Done from "../done";
import Rest from "../rest";
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
    await fireEvent.changeText(r.getByPlaceholderText("이름 또는 별명"), "지현");

    expect(flatten(button(r)?.props.style).opacity).toBeUndefined();
  });

  it("공백만 적은 것은 이름이 아니다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("이름 또는 별명"), "   ");

    expect(flatten(button(r)?.props.style).opacity).toBe(0.36);
  });

  it("무엇을·왜 묻는지를 두 줄로 나눠 말한다", async () => {
    const { getByText } = await render(<Nickname />);

    expect(getByText("어떻게 불러드리면 좋을까요?")).toBeTruthy();
    expect(getByText("편하게 불리고 싶은 이름을 알려주세요.\n실명도, 별명도 괜찮아요.")).toBeTruthy();
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
    expect(flatten(button(r)?.props.style).opacity).toBe(0.36);

    await fireEvent.changeText(r.getByPlaceholderText("이름 또는 별명"), "바바님");
    expect(r.queryByText(/다른 이름을 알려주세요/)).toBeNull();
  });
});

describe("05-b · 나이 · 성별", () => {
  it("선택 질문이라 비워도 넘어간다 — 라벨이 [건너뛰기] 로 바뀐다", async () => {
    // 같은 자리에서 같은 동작을 하되 무엇을 하는지 말이 달라진다 (05-b.md)
    const { getByText } = await render(<Profile />);

    expect(flatten(getByText("건너뛰기").parent?.props.style).opacity).toBeUndefined();
  });

  it("하나라도 답하면 [다음] 이 된다", async () => {
    const { getByText, queryByText } = await render(<Profile />);
    await fireEvent.press(getByText("여성"));

    expect(getByText("다음")).toBeTruthy();
    expect(queryByText("건너뛰기")).toBeNull();
  });

  it("선택 항목임을 「선택사항」 배지로 밝힌다", async () => {
    // "선택"이 아니라 "선택사항" — "선택"은 "고르라"는 뜻으로도 읽힌다 (05-b.md)
    const { getAllByText } = await render(<Profile />);

    expect(getAllByText("선택사항")).toHaveLength(2); // 나이 · 성별
  });

  it("값이 들어간 나이에는 지우기 × 가 붙는다", async () => {
    // 선택을 되돌릴 길이 없으면 선택이 아니다 (05-b.md)
    const r = await render(<Profile />);
    expect(r.queryByLabelText("지우기")).toBeNull(); // 지울 것이 없는 자리에 지우기를 두지 않는다

    await act(() => useDraft.getState().set("age", "25"));
    const filled = await render(<Profile />);
    await fireEvent.press(filled.getByLabelText("지우기"));

    expect(useDraft.getState().age).toBe("");
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

describe("06 · 관심 분야 (+ 06-b·06-c 기타 입력)", () => {
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

  it("고르면 열리고 안내는 사실만 말한다", async () => {
    // "N개 선택됨 · …" — 제한 경고를 미리 띄우지 않는다 (06-c.md)
    const r = await render(<Interests />);
    await pick(r, "가족", "건강");

    expect(flatten(r.getByText("다음").parent?.props.style).opacity).toBeUndefined();
    expect(r.getByText("2개 선택됨 · 다시 누르면 취소돼요")).toBeTruthy();
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
    expect(r.getByText("3개 선택됨 · 다시 누르면 취소돼요")).toBeTruthy();
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

    expect(flatten(r.getByText("다음").parent?.props.style).opacity).toBe(0.36);
    expect(r.getByText("기타에 무엇을 적을지 알려주세요.")).toBeTruthy();
  });

  it("적으면 열리고 지우기 × 가 나타난다", async () => {
    const r = await render(<Interests />);
    await pick(r, "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "이사 준비");

    expect(r.getByText("5/12")).toBeTruthy();
    expect(r.getByLabelText("기타 지우기")).toBeTruthy();
    expect(flatten(r.getByText("다음").parent?.props.style).opacity).toBeUndefined();
    expect(r.queryByText("기타에 무엇을 적을지 알려주세요.")).toBeNull();
  });

  it("공백뿐이면 확정하지 않고 기타 선택을 취소한다 — 빈 칩을 만들지 않는다", async () => {
    // 확정 3경로(키보드 완료 · 바깥 탭 · [다음]) 전부 같은 규칙 (06-c.md)
    const r = await render(<Interests />);
    await pick(r, "가족", "기타");
    await fireEvent.changeText(r.getByPlaceholderText("직접 입력"), "   ");
    await fireEvent(r.getByPlaceholderText("직접 입력"), "blur");

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

    for (const label of ["😴 잠자기", "🎵 음악 듣기", "🚶 산책하기", "🔄 그때마다 달라요", "😶 멍하니 쉬기", "기타"]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it("필수 질문이다 — 하나도 안 고르면 잠긴다", async () => {
    const r = await render(<Rest />);

    expect(flatten(r.getByText("다음").parent?.props.style).opacity).toBe(0.36);
    expect(r.getByText("하나 이상 골라주세요")).toBeTruthy();
  });

  it("복수 선택 · 상한 없음 · 다시 누르면 취소", async () => {
    const r = await render(<Rest />);
    for (const l of ["🎵 음악 듣기", "🚶 산책하기", "😴 잠자기", "🧘 명상하기"]) {
      await fireEvent.press(r.getByText(l));
    }

    expect(r.getByText("4개 선택됨 · 다시 누르면 취소돼요")).toBeTruthy();

    await fireEvent.press(r.getByText("🧘 명상하기"));
    expect(r.getByText("3개 선택됨 · 다시 누르면 취소돼요")).toBeTruthy();
    expect(useDraft.getState().restMethods).toEqual(["🎵 음악 듣기", "🚶 산책하기", "😴 잠자기"]);
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

describe("08 · 회고 시간", () => {
  it("거절을 같은 화면에 둔다 — 막다른 길이 아니게", async () => {
    // "알림 허용"은 앱의 요구, "편한 시간"은 사용자의 선택 (08.md)
    const { getByText } = await render(<RetroTime />);

    expect(getByText("다음")).toBeTruthy();
    expect(getByText("알림 없이 쓸게요")).toBeTruthy();
  });

  it("「마지막으로,」를 쓰지 않는다 — 마지막이라는 말은 캘린더 한 곳에만", async () => {
    const { getByText, queryByText } = await render(<RetroTime />);

    expect(getByText("하루를 언제 돌아보면 가장 편안할까요?")).toBeTruthy();
    expect(queryByText(/마지막으로/)).toBeNull();
  });

  it("고르지 않아도 넘어간다 — [다음] 이 잠기지 않는다", async () => {
    const { getByText } = await render(<RetroTime />);

    expect(flatten(getByText("다음").parent?.props.style).opacity).toBeUndefined();
  });

  it("고르지 않아도 시각은 정해져 있다 — 스키마 기본값 21:30", async () => {
    // 값이 없으면 10 의 요약 카드와 홈의 「밤 9:30」 문구가 할 말을 잃는다.
    const { getByText } = await render(<RetroTime />);

    // 고르기 전에는 placeholder — 기본값을 「고른 것」처럼 보이지 않는다
    expect(getByText("시간 선택")).toBeTruthy();
    expect(useDraft.getState().retroTime).toBe("21:30");
  });

  it("「알림 없이 쓸게요」 는 알림만 끈다 — 회고 시각은 남는다", async () => {
    const { getByText } = await render(<RetroTime />);

    await fireEvent.press(getByText("알림 없이 쓸게요"));

    expect(useDraft.getState().notifyRetro).toBe(false);
    expect(useDraft.getState().retroTime).toBe("21:30");
  });

  it("[다음] 은 알림 의도를 켠 채 넘어간다", async () => {
    useDraft.getState().set("notifyRetro", false);
    const { getByText } = await render(<RetroTime />);

    await fireEvent.press(getByText("다음"));

    expect(useDraft.getState().notifyRetro).toBe(true);
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
  });
});

describe("10 · 완료 (+ 10-b 건너뜀)", () => {
  it("받은 답을 그대로 돌려준다", async () => {
    useDraft.getState().set("calendarLinked", true);
    const { getByText } = await render(<Done />);

    expect(getByText("캘린더 연결 완료")).toBeTruthy();
    expect(getByText("밤 9:30")).toBeTruthy(); // 21:30 을 홈과 같은 말투로
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
    expect(getByText("캘린더 연결과 돌아보는 시간은 마이에서 언제든 설정할 수 있어요.")).toBeTruthy();
    expect(getByText("모멘토리 시작하기")).toBeTruthy(); // CTA 는 두 화면이 같다
  });

  it("쉬는 방법 줄이 없다 — 07 은 묻지만 요약 줄은 쉼터 연쇄라 제외다", async () => {
    // 답은 User.restMethods 로 저장만 한다 (07.md · RULES.md)
    useDraft.getState().set("restMethods", ["🎵 음악 듣기"]);
    const { queryByText } = await render(<Done />);

    expect(queryByText(/쉬는/)).toBeNull();
    expect(queryByText(/음악 듣기/)).toBeNull();
  });

  it("시작하면 초안을 비운다 — 다음 사람에게 앞 답이 남지 않게", async () => {
    useDraft.getState().set("nickname", "지현");
    const { getByText } = await render(<Done />);

    await fireEvent.press(getByText("모멘토리 시작하기"));

    expect(useDraft.getState().nickname).toBe("");
  });
});
