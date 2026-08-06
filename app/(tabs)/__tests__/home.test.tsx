import { render, fireEvent, within } from "@testing-library/react-native";

import Home from "../home";

import { fill } from "@/design/tokens.mvp";
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

describe("12 · 홈 — 세 칸", () => {
  it("칸의 순서는 오늘 일정 → 오늘의 순간 → 돌아보기 다", async () => {
    // 세 칸의 순서는 어떤 상태에서도 바뀌지 않는다 (RULES.md 「홈」)
    const { getByText } = await render(<Home />);
    const order = ["오늘 일정", "오늘의 순간", "지금 하루 돌아보기"].map(
      (label) => getByText(label),
    );

    expect(order.every(Boolean)).toBe(true);
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

  it("채운 버튼은 화면에 하나뿐이다 — 일정 추가", async () => {
    const { getByText } = await render(<Home />);
    const add = getByText("＋ 일정 추가하기").parent;

    expect(flatten(add?.props.style).backgroundColor).toBe(fill.primaryDeep);
    // 순간 추가는 한 단계 연한 톤이다 (테두리만)
    const moment = getByText("지금 떠오른 걸 한 줄로 적어요").parent;
    expect(flatten(moment?.props.style).backgroundColor).not.toBe(fill.primaryDeep);
  });

  it("돌아보기 줄은 정한 시각을 말한다", async () => {
    const { getByText } = await render(<Home />);

    expect(getByText("밤 9:30엔 제가 먼저 말 걸어요")).toBeTruthy();
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
  const emptyDay = () => useDay.setState({ schedules: [] });

  it("빈 상태 전용 레이아웃을 만들지 않는다 — 세 칸이 그대로 있다", async () => {
    emptyDay();
    const { getByText } = await render(<Home />);

    expect(getByText("오늘 일정")).toBeTruthy();
    expect(getByText("오늘의 순간")).toBeTruthy();
    // 일정이 없어도 회고는 열린다 (12-b.md)
    expect(getByText("지금 하루 돌아보기")).toBeTruthy();
  });

  it("목록 슬롯의 줄만 초대 문구로 바뀐다", async () => {
    emptyDay();
    const { getByText, queryByText } = await render(<Home />);

    expect(getByText("오늘 하루를 차곡차곡 담아볼까요?")).toBeTruthy();
    expect(
      getByText("일정을 추가하면 하루를 돌아볼 때 더 풍부한 대화를 나눌 수 있어요."),
    ).toBeTruthy();
    expect(queryByText("2/4 마침")).toBeNull();
  });

  it("일정 추가 버튼은 있든 없든 같은 크기·모양·색이다", async () => {
    const filled = await render(<Home />);
    const before = flatten(filled.getByText("＋ 일정 추가하기").parent?.props.style);

    emptyDay();
    const empty = await render(<Home />);
    const after = flatten(empty.getByText("＋ 일정 추가하기").parent?.props.style);

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
  it("네 칸이다 — 쉼터가 없다", async () => {
    const { getByText, queryByText, getAllByRole } = await render(<Home />);

    expect(getAllByRole("tab")).toHaveLength(4);
    for (const tab of ["홈", "보관함", "리포트", "마이"]) {
      expect(getByText(tab)).toBeTruthy();
    }
    expect(queryByText("쉼터")).toBeNull();
  });

  it("활성 칸을 색만으로 표시하지 않는다 — 굵기도 함께 바뀐다", async () => {
    const { getAllByRole } = await render(<Home />);
    const [home, archive] = getAllByRole("tab");

    expect(home?.props.accessibilityState.selected).toBe(true);
    expect(archive?.props.accessibilityState.selected).toBe(false);

    const weightOf = (tab: typeof home) =>
      flatten(within(tab!).getByText(/./).props.style).fontFamily;
    expect(weightOf(home)).toBe("Pretendard-SemiBold");
    expect(weightOf(archive)).toBe("Pretendard-Medium");
  });
});
