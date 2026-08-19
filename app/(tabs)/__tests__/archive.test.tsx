import { render, fireEvent, within, act } from "@testing-library/react-native";
import { router } from "expo-router";

import Archive from "../archive";

import { label as labelColor, primary } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { useDay } from "@/features/home/model/day";
import type { Schedule } from "@/features/home/model/types";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

/** 일정 store 는 서버에서 채워진다 — 화면 테스트에서는 필요한 줄만 직접 넣는다 */
const schedule = (id: string, date: string, title: string, done: boolean): Schedule => ({
  id,
  date,
  title,
  time: null,
  source: "manual",
  externalId: null,
  done,
  doneAt: done ? `${date}T11:20:00` : null,
  emotions: [],
  hidden: false,
});

beforeEach(() => {
  useDiary.getState().reset(); // 샘플 12편으로 되돌린다
  useDay.setState({ schedules: [] });
  jest.clearAllMocks();
});

describe("A1 · 보관함 달력", () => {
  it("보는 방법은 「달력」과 「목록」이다 — 「캘린더」·「리스트」라고 쓰지 않는다", async () => {
    // 외부 캘린더 앱과 구분한다 (A1.md) — 시안의 「캘린더/리스트」를 따르지 않는다.
    // 세그먼트가 아이콘 스위처로 바뀌면서 그 말은 낭독기 이름에서 산다
    const r = await render(<Archive />);

    expect(r.getByLabelText("달력으로 보기")).toBeTruthy();
    expect(r.getByLabelText("목록으로 보기")).toBeTruthy();
    expect(r.queryByLabelText(/캘린더|리스트/)).toBeNull();
    expect(r.queryByText(/캘린더|리스트/)).toBeNull();
  });

  it("지금 보고 있는 쪽을 낭독기도 안다 — 색으로만 말하지 않는다", async () => {
    const r = await render(<Archive />);

    expect(r.getByLabelText("달력으로 보기").props.accessibilityState.selected).toBe(true);
    expect(r.getByLabelText("목록으로 보기").props.accessibilityState.selected).toBe(false);

    await fireEvent.press(r.getByLabelText("목록으로 보기"));

    expect(r.getByLabelText("목록으로 보기").props.accessibilityState.selected).toBe(true);
  });

  it("그날 일정도 함께 보인다 — A1 은 그날의 일기 + 일정이다", async () => {
    // design.md 「보관함」 — 일기가 없어도 일정이 있는 날이 있다
    useDay.setState({ schedules: [schedule("s-a1", "2026-07-27", "팀 회의", true)] });
    const r = await render(<Archive />);

    expect(r.getByText("팀 회의")).toBeTruthy();
  });

  it("연속 일수를 세지 않고 화살표로 압박하지 않는다", async () => {
    const { queryByText } = await render(<Archive />);

    expect(queryByText(/연속|일째|스트릭/)).toBeNull();
    expect(queryByText(/↓|↑/)).toBeNull();
  });

  it("여는 달은 오늘이 속한 달이고 `‹ ›` 로 옮긴다", async () => {
    const r = await render(<Archive />);

    expect(r.getByText("2026년 7월")).toBeTruthy();

    await fireEvent.press(r.getByLabelText("이전 달"));
    expect(r.getByText("2026년 6월")).toBeTruthy();

    await fireEvent.press(r.getByLabelText("다음 달"));
    expect(r.getByText("2026년 7월")).toBeTruthy();
  });

  it("일기가 있는 날도 없는 날도 칸은 있다", async () => {
    const { getByLabelText } = await render(<Archive />);

    // 7월 22일은 일기가 있다
    expect(getByLabelText("22일")).toBeTruthy();
    // 없는 날도 칸은 있다 — 달력이 성기면 날짜를 못 찾는다
    expect(getByLabelText("23일")).toBeTruthy();
  });

  it("날짜를 누르면 그날 일기가 이름과 함께 열린다 — 색만으로 판단하지 않게", async () => {
    const r = await render(<Archive />);

    await fireEvent.press(r.getByLabelText("22일"));

    expect(r.getByText("7월 22일의 기록")).toBeTruthy();
    expect(r.getByText("7월 22일 수요일")).toBeTruthy();
    expect(r.getByText("화남/답답")).toBeTruthy(); // 얼굴이 아니라 이름으로
    expect(r.getByText("뿌듯함")).toBeTruthy();
    expect(r.getByText("일기 열어보기 ›")).toBeTruthy();
  });

  it("링크는 「일기 열어보기」다 — 여는 것은 그날의 한 장이다", async () => {
    const r = await render(<Archive />);
    await fireEvent.press(r.getByLabelText("22일"));

    expect(r.queryByText(/전체 일기 보기/)).toBeNull();
  });

  it("일기가 없는 날은 같은 자리에 한 장만 바뀐다 — 빈 상태 전용 화면이 아니다", async () => {
    const r = await render(<Archive />);

    await fireEvent.press(r.getByLabelText("23일"));

    expect(r.getByText("7월 23일의 기록")).toBeTruthy();
    expect(r.getByText(/이 날은 기록이 없어요/)).toBeTruthy();
    expect(r.queryByText("일기 열어보기 ›")).toBeNull();
  });

  it("선택된 날은 테두리 2px 로 표시한다 — 색만으로 구분하지 않는다", async () => {
    const r = await render(<Archive />);

    expect(flatten(r.getByLabelText("22일").props.style).borderWidth).toBeUndefined();
    await fireEvent.press(r.getByLabelText("22일"));
    expect(flatten(r.getByLabelText("22일").props.style).borderWidth).toBe(2);
  });
});

describe("A2 · 보관함 목록 + 감정 필터", () => {
  /** 감정 이름은 알약에도 나온다 — 필터 안에서만 찾는다 */
  const openList = async () => {
    const r = await render(<Archive />);
    await fireEvent.press(r.getByLabelText("목록으로 보기"));
    const filter = within(r.getByTestId("emotion-filter"));
    return { r, filter, chip: (name: string) => filter.getByText(name).parent };
  };

  it("감정 9종을 전부 둔다 — 셋만 남기지 않는다", async () => {
    const { filter } = await openList();

    for (const name of [
      "불안함",
      "우울함",
      "화남/답답",
      "행복함",
      "막막함",
      "무기력",
      "피곤함",
      "뿌듯함",
      "평온함",
    ]) {
      expect(filter.getByText(name)).toBeTruthy();
    }
  });

  it("「전체」 칩은 없다 — 고른 칩을 다시 눌러 푼다", async () => {
    // 새 디자인 §4.4 — 초기화 버튼을 따로 두지 않는다
    const { r, filter, chip } = await openList();

    expect(filter.queryByText(/전체/)).toBeNull();

    await fireEvent.press(filter.getByText("우울함"));
    expect(chip("우울함")?.props.accessibilityState.selected).toBe(true);
    expect(r.queryByText("7월 22일 수요일")).toBeNull();

    await fireEvent.press(filter.getByText("우울함"));
    expect(chip("우울함")?.props.accessibilityState.selected).toBe(false);
    expect(r.getByText("7월 22일 수요일")).toBeTruthy();
  });

  it("한 번에 하나만 고른다 — 다른 감정을 누르면 앞 선택이 풀린다", async () => {
    const { filter, chip } = await openList();

    await fireEvent.press(filter.getByText("행복함"));
    expect(chip("행복함")?.props.accessibilityState.selected).toBe(true);

    await fireEvent.press(filter.getByText("평온함"));
    expect(chip("행복함")?.props.accessibilityState.selected).toBe(false);
    expect(chip("평온함")?.props.accessibilityState.selected).toBe(true);
  });

  it("고른 칩은 색뿐 아니라 테두리 굵기·글자색으로도 표시한다", async () => {
    // 새 DS 의 칩은 면 + 테두리 1→2px + 글자색 셋을 함께 바꾼다 (design.md §9)
    const { filter, chip } = await openList();

    expect(flatten(chip("평온함")?.props.style).borderWidth).toBe(1);
    expect(flatten(filter.getByText("평온함").props.style).color).toBe(labelColor.neutral);

    await fireEvent.press(filter.getByText("평온함"));

    expect(flatten(chip("평온함")?.props.style).borderWidth).toBe(2);
    expect(flatten(filter.getByText("평온함").props.style).color).toBe(labelColor.strong);
  });

  it("감정 칩에 감정색을 쓰지 않는다 — 브랜드 초록으로 통일한다", async () => {
    // design.md §1 — 시안은 칩마다 감정색을 칠했지만 정본이 이긴다.
    // 「무슨 감정인가」와 「골랐는가」가 같은 채널을 쓰면 둘 다 흐려진다
    const { filter, chip } = await openList();

    await fireEvent.press(filter.getByText("평온함"));

    expect(flatten(chip("평온함")?.props.style).borderColor).toBe(primary.normal);
  });

  it("기본 정렬은 최신순이고 정렬 옵션을 두지 않는다", async () => {
    const { r } = await openList();

    expect(r.queryByText(/정렬|오래된 순|최신순/)).toBeNull();
    // 27일이 1일보다 먼저 나온다
    expect(r.getByText("7월 27일 월요일")).toBeTruthy();
  });

  it("감정을 고르면 그 감정이 붙은 일기만 남는다", async () => {
    const { r, filter } = await openList();

    await fireEvent.press(filter.getByText("우울함"));

    // 우울함(2)은 7/17 · 7/27 두 편이다
    expect(r.getByText("7월 27일 월요일")).toBeTruthy();
    expect(r.getByText("7월 17일 금요일")).toBeTruthy();
    expect(r.queryByText("7월 22일 수요일")).toBeNull();
  });

  it("검색은 일기 본문을 찾는다", async () => {
    const { r } = await openList();

    await fireEvent.changeText(r.getByLabelText("일기 내용 검색"), "회의");

    expect(r.getByText("7월 22일 수요일")).toBeTruthy();
    expect(r.queryByText("7월 27일 월요일")).toBeNull();
  });

  it("결과가 없으면 같은 자리에 한 줄만 남는다", async () => {
    const { r } = await openList();

    await fireEvent.changeText(r.getByLabelText("일기 내용 검색"), "없는말없는말");

    expect(r.getByText("조건에 맞는 일기가 없어요.")).toBeTruthy();
  });

  it("미리보기는 두 줄 말줄임이다 — 목록이 벽이 되지 않게", async () => {
    const { r } = await openList();
    const preview = r.getByText(
      "회의는 답답했지만, 그 답답함은 내 의견을 전하고 싶다는 마음에서 왔다.",
    );

    expect(preview.props.numberOfLines).toBe(2);
  });
});

describe("삭제 되돌리기 — 확인 모달 대신 되돌릴 길을 남긴다", () => {
  const ID = "d-sample-27";

  it("지운 직후에만 [삭제했어요 · 되돌리기] 가 뜬다", async () => {
    const before = await render(<Archive />);
    expect(before.queryByText("되돌리기")).toBeNull();

    await act(async () => {
      useDiary.getState().remove(ID);
    });

    const after = await render(<Archive />);
    expect(after.getByText("삭제했어요")).toBeTruthy();
    expect(after.getByText("되돌리기")).toBeTruthy();
  });

  it("되돌리면 일기가 목록으로 돌아온다", async () => {
    useDiary.getState().remove(ID);
    const r = await render(<Archive />);
    await fireEvent.press(r.getByLabelText("목록으로 보기"));
    expect(r.queryByText("7월 27일 월요일")).toBeNull();

    await fireEvent.press(r.getByText("되돌리기"));

    expect(r.getByText("7월 27일 월요일")).toBeTruthy();
    expect(r.queryByText("되돌리기")).toBeNull(); // 줄도 함께 사라진다
  });

  it("잠시 뒤 스스로 사라진다 — 그 뒤에는 되돌릴 수 없다", async () => {
    jest.useFakeTimers();
    useDiary.getState().remove(ID);
    const r = await render(<Archive />);
    expect(r.getByText("되돌리기")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(7000);
    });

    expect(r.queryByText("되돌리기")).toBeNull();
    expect(useDiary.getState().recentlyDeleted).toBeNull();
    jest.useRealTimers();
  });
});

describe("하단 탭 — 다섯 칸이 전부 이어진다", () => {
  const tabNamed = (r: Awaited<ReturnType<typeof render>>, name: string) =>
    r.getAllByRole("tab").find((t) => within(t).queryByText(name) != null);

  it("보관함이 활성이고 홈으로 옮겨갈 수 있다", async () => {
    const r = await render(<Archive />);

    expect(tabNamed(r, "보관함")?.props.accessibilityState.selected).toBe(true);

    await fireEvent.press(tabNamed(r, "홈")!);

    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home");
  });

  it("리포트·마이도 간다", async () => {
    const r = await render(<Archive />);

    await fireEvent.press(tabNamed(r, "리포트")!);
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/report");

    await fireEvent.press(tabNamed(r, "마이")!);
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/my");
  });

  it("자기 탭을 누르면 아무 일도 없다 — 같은 화면을 다시 열지 않는다", async () => {
    const r = await render(<Archive />);

    await fireEvent.press(tabNamed(r, "보관함")!);

    expect(jest.mocked(router.replace)).not.toHaveBeenCalled();
  });
});
