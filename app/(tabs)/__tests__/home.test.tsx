import { act, render, fireEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";

import Home from "../home";

import { paperColors } from "@/design/paper";
import { useDay } from "@/features/home/model/day";
import { SAMPLE_MOMENTS, SAMPLE_SCHEDULES } from "@/mocks/sample";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

// 모듈 store 라 테스트 사이에 값이 샌다 — 매번 샘플 하루로 되돌린다
beforeEach(() =>
  useDay.setState({ schedules: SAMPLE_SCHEDULES.map((s) => ({ ...s })), moments: SAMPLE_MOMENTS }),
);

describe("12 · 홈 — 날씨와 일정 둘뿐", () => {
  it("메모(오늘의 순간)를 두지 않는다 — 시안에 없다 (PLAN.md D9)", async () => {
    const { queryByText } = await render(<Home />);

    expect(queryByText("오늘의 순간")).toBeNull();
    expect(queryByText("지금 떠오른 걸 한 줄로 적어요")).toBeNull();
  });

  it("회고는 씬의 병아리가 연다 — 별도 줄을 두지 않는다", async () => {
    // app-flow.md §1 「홈 ─ 병아리 탭 ─▶ 하루 회고」
    const { getByLabelText } = await render(<Home />);
    const chick = getByLabelText("지금 하루 돌아보기");

    await fireEvent.press(chick);
    expect(router.push).toHaveBeenCalledWith("/retro/intro");
  });

  it("날씨를 이름과 온도로 말한다", async () => {
    const { getByText } = await render(<Home />);

    expect(getByText("맑음 · 27°")).toBeTruthy();
  });

  it("일정 4건과 「2/4 마침」을 보인다 — 사실이지 성취가 아니다", async () => {
    const { getByText } = await render(<Home />);

    for (const title of ["팀 회의", "발표 준비", "면접 스터디", "운동 가기"]) {
      expect(getByText(title)).toBeTruthy();
    }
    expect(getByText("2/4 마침")).toBeTruthy();
  });

  it("진행률·연속·배지를 두지 않는다", async () => {
    const { queryByText } = await render(<Home />);

    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/연속/)).toBeNull();
    expect(queryByText(/일째/)).toBeNull();
  });

  it("감정은 색만이 아니라 이름으로도 말한다", async () => {
    // 색만으로 감정을 판단하게 하지 않는다 (RULES.md)
    const { getByText } = await render(<Home />);

    expect(getByText("화남/답답")).toBeTruthy();
    expect(getByText("행복함")).toBeTruthy();
  });

  it("마침 2 · 감정 3 이 함께 있다 — 서로를 요구하지 않는다", async () => {
    // 스키마 샘플 「면접 스터디 · 불안함」은 마침 없이 감정만 있다.
    // C1 의 「감정 기록 3개」가 여기서 나온다
    const { getByText } = await render(<Home />);

    expect(getByText("2/4 마침")).toBeTruthy();
    expect(getByText("불안함")).toBeTruthy();
  });

  it("추가는 카드 머리의 테두리 알약이다 — 채운 버튼이 아니다", async () => {
    // 시안의 `＋ 추가` 는 면을 채우지 않는다 (PLAN.md D9)
    const { getByText } = await render(<Home />);
    const add = flatten(getByText("＋ 추가").parent?.props.style);

    expect(add.backgroundColor).toBe(paperColors.bg.card);
    expect(add.borderColor).toBe(paperColors.line.ink);
  });

  it("병아리 말풍선이 정한 시각을 말한다", async () => {
    const { getByText } = await render(<Home />);

    expect(getByText("밤 9:30엔 제가 먼저 말 걸어요")).toBeTruthy();
  });
});

describe("일정 순서 — 손잡이를 꾹 눌러 끈다 (PLAN.md D10)", () => {
  it("줄마다 손잡이가 있다", async () => {
    const { getByLabelText } = await render(<Home />);

    for (const title of ["팀 회의", "발표 준비", "면접 스터디", "운동 가기"]) {
      expect(getByLabelText(`${title} 순서 변경`)).toBeTruthy();
    }
  });

  it("끌 수 없어도 옮길 수 있다 — 손잡이의 접근성 동작", async () => {
    // 끌기만 있으면 스크린리더로는 순서를 못 바꾼다 (RULES.md 「접근성」)
    const { getByLabelText } = await render(<Home />);
    const before = useDay.getState().schedules.map((s) => s.title);

    await fireEvent(getByLabelText("발표 준비 순서 변경"), "accessibilityAction", {
      nativeEvent: { actionName: "moveUp" },
    });

    const after = useDay.getState().schedules.map((s) => s.title);
    expect(after[0]).toBe("발표 준비");
    expect(after[1]).toBe(before[0]);
  });

  it("갈 곳이 없으면 아무 일도 없다", async () => {
    const { getByLabelText } = await render(<Home />);
    const before = useDay.getState().schedules.map((s) => s.id);

    await fireEvent(getByLabelText("팀 회의 순서 변경"), "accessibilityAction", {
      nativeEvent: { actionName: "moveUp" },
    });

    expect(useDay.getState().schedules.map((s) => s.id)).toEqual(before);
  });

  it("여러 칸을 건너뛰어 놓아도 사이의 줄이 밀린다", () => {
    // 끌어 놓기가 부르는 것 — 첫 줄을 셋째 자리로. 화면 없이 store 만 본다
    const before = useDay.getState().schedules.map((s) => s.title);
    useDay.getState().reorderSchedule(useDay.getState().schedules[0]!.id, 2);

    const after = useDay.getState().schedules.map((s) => s.title);
    expect(after).toEqual([before[1], before[2], before[0], before[3]]);
  });
});

describe("일정 행 — 터치가 둘이다", () => {
  it("체크 원은 즉시 마침/취소 — 확인을 묻지 않는다", async () => {
    // 되돌릴 수 있게 만든다: 토글이고 확인 모달이 없다 (RULES.md)
    const { getByLabelText, getByText } = await render(<Home />);

    await fireEvent.press(getByLabelText("면접 스터디 마침"));
    expect(getByText("3/4 마침")).toBeTruthy();
    expect(useDay.getState().schedules[2]?.done).toBe(true);

    await fireEvent.press(getByLabelText("면접 스터디 마침"));
    expect(getByText("2/4 마침")).toBeTruthy();
  });

  it("마침은 doneAt 을 남기고 취소하면 지운다", async () => {
    const { getByLabelText } = await render(<Home />);

    await fireEvent.press(getByLabelText("운동 가기 마침"));
    expect(useDay.getState().schedules[3]?.doneAt).not.toBeNull();

    await fireEvent.press(getByLabelText("운동 가기 마침"));
    expect(useDay.getState().schedules[3]?.doneAt).toBeNull();
  });

  it("체크 원은 22 지만 히트 영역은 44 다", async () => {
    // 작은 글리프는 시각 크기를 키우지 말고 hitSlop 으로 44 를 확보한다 (RULES.md)
    const { getByLabelText } = await render(<Home />);

    expect(getByLabelText("팀 회의 마침").props.hitSlop).toBe(11); // (44 - 22) / 2
  });
});

describe("12-b · 일정이 없는 경우", () => {
  const emptyDay = () => act(() => useDay.setState({ schedules: [] }));

  it("빈 상태 전용 레이아웃을 만들지 않는다 — 카드도 씬도 그대로 있다", async () => {
    await emptyDay();
    const { getByText, getByLabelText } = await render(<Home />);

    expect(getByText("오늘 일정")).toBeTruthy();
    expect(getByText("＋ 추가")).toBeTruthy();
    // 일정이 없어도 회고는 열린다 (12-b.md)
    expect(getByLabelText("지금 하루 돌아보기")).toBeTruthy();
  });

  it("목록 슬롯의 줄만 초대 문구로 바뀐다", async () => {
    await emptyDay();
    const { getByText, queryByText } = await render(<Home />);

    expect(getByText("오늘 하루를 차곡차곡 담아볼까요?")).toBeTruthy();
    expect(
      getByText("일정을 추가하면 하루를 돌아볼 때 더 풍부한 대화를 나눌 수 있어요."),
    ).toBeTruthy();
    expect(queryByText("2/4 마침")).toBeNull();
  });

  it("일정 추가 버튼은 있든 없든 같은 크기·모양·색이다", async () => {
    const filled = await render(<Home />);
    const before = flatten(filled.getByText("＋ 추가").parent?.props.style);

    await emptyDay();
    const empty = await render(<Home />);
    const after = flatten(empty.getByText("＋ 추가").parent?.props.style);

    expect(after.minHeight).toBe(before.minHeight);
    expect(after.borderRadius).toBe(before.borderRadius);
    expect(after.backgroundColor).toBe(before.backgroundColor);
  });

  it("숨긴 일정은 세지 않는다 — 캘린더 원본은 지우지 않는다", async () => {
    useDay.getState().hide("s1");
    const { getByText } = await render(<Home />);

    // 4건 중 하나를 숨겼으므로 1/3 (마침이던 「팀 회의」가 빠진다)
    expect(getByText("1/3 마침")).toBeTruthy();
    // 배열에는 남아 있다 — hidden 플래그만 켠다
    expect(useDay.getState().schedules).toHaveLength(4);
  });
});

describe("하단 탭", () => {
  it("다섯 칸이다 — 쉼터가 들어왔다 (PLAN.md D1)", async () => {
    const { getByText, getAllByRole } = await render(<Home />);

    expect(getAllByRole("tab")).toHaveLength(5);
    for (const tab of ["홈", "쉼터", "보관함", "리포트", "마이"]) {
      expect(getByText(tab)).toBeTruthy();
    }
  });

  it("활성 칸을 색만으로 표시하지 않는다 — 굵기도 함께 바뀐다", async () => {
    const { getAllByRole } = await render(<Home />);
    const [home, archive] = getAllByRole("tab");

    expect(home?.props.accessibilityState.selected).toBe(true);
    expect(archive?.props.accessibilityState.selected).toBe(false);

    const weightOf = (tab: typeof home) =>
      flatten(within(tab!).getByText(/./).props.style).fontFamily;
    // 새 디자인 리스킨(PLAN.md Phase 2) — 활성 700 / 비활성 400
    expect(weightOf(home)).toBe("Pretendard-Bold");
    expect(weightOf(archive)).toBe("Pretendard-Regular");
  });
});
