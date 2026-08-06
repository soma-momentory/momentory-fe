import { render, fireEvent, within, act } from "@testing-library/react-native";
import { router } from "expo-router";

import Archive from "../archive";

import { useDiary } from "@/features/diary/model/diary";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

beforeEach(() => {
  useDiary.getState().reset(); // 샘플 12편으로 되돌린다
  jest.clearAllMocks();
});

describe("A1 · 보관함 달력", () => {
  it("탭 이름은 「달력」이다 — 「캘린더」라고 쓰지 않는다", async () => {
    // 외부 캘린더 앱과 구분한다 (A1.md)
    const { getByText, queryByText } = await render(<Archive />);

    expect(getByText("달력")).toBeTruthy();
    expect(getByText("목록")).toBeTruthy();
    expect(queryByText("캘린더")).toBeNull();
  });

  it("요약 3칸은 기록 수치만 쓴다", async () => {
    const { getByText } = await render(<Archive />);

    expect(getByText("12편")).toBeTruthy();
    expect(getByText("이번 달 기록")).toBeTruthy();
    expect(getByText("가장 많이 기록")).toBeTruthy();
  });

  it("이번 달 가장 많이 기록한 감정은 행복함이다", async () => {
    // 기간마다 다른 값이다 — 한 값을 세 곳에 넣지 않는다 (RULES 샘플 데이터)
    const { getByText } = await render(<Archive />);

    expect(getByText("행복함")).toBeTruthy();
  });

  it("지난달과 비교는 얼마나 줄었는지를 말한다 — 화살표가 아니다", async () => {
    const { getByText, queryByText } = await render(<Archive />);

    expect(getByText("불안 2회 감소")).toBeTruthy();
    expect(getByText("지난달과 비교")).toBeTruthy();
    expect(queryByText(/↓|↑/)).toBeNull();
  });

  it("연속 일수를 세지 않는다", async () => {
    const { queryByText } = await render(<Archive />);

    expect(queryByText(/연속|일째|스트릭/)).toBeNull();
  });

  it("일기가 있는 날만 누를 수 있고 감정 점이 붙는다", async () => {
    const { getByLabelText } = await render(<Archive />);

    // 7월 22일은 일기가 있다
    expect(getByLabelText("22일")).toBeTruthy();
    // 없는 날도 칸은 있다 — 달력이 성기면 날짜를 못 찾는다
    expect(getByLabelText("23일")).toBeTruthy();
  });

  it("날짜를 누르면 그날 일기가 이름과 함께 열린다 — 색만으로 판단하지 않게", async () => {
    const r = await render(<Archive />);

    await fireEvent.press(r.getByLabelText("22일"));

    expect(r.getByText("7월 22일 수요일")).toBeTruthy();
    expect(r.getByText("화남/답답")).toBeTruthy(); // 점이 아니라 이름으로
    expect(r.getByText("뿌듯함")).toBeTruthy();
    expect(r.getByText("일기 열어보기 ›")).toBeTruthy();
  });

  it("링크는 「일기 열어보기」다 — 여는 것은 그날의 한 장이다", async () => {
    const r = await render(<Archive />);
    await fireEvent.press(r.getByLabelText("22일"));

    expect(r.queryByText(/전체 일기 보기/)).toBeNull();
  });

  it("일기가 없는 날을 고르면 카드가 뜨지 않는다", async () => {
    const r = await render(<Archive />);

    await fireEvent.press(r.getByLabelText("23일"));

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
  /** 감정 이름은 요약칸·알약에도 나온다 — 필터 안에서만 찾는다 */
  const openList = async () => {
    const r = await render(<Archive />);
    await fireEvent.press(r.getByText("목록"));
    const filter = within(r.getByTestId("emotion-filter"));
    return { r, filter, chip: (name: string) => filter.getByText(name).parent };
  };

  it("감정 9종을 전부 둔다 — 셋만 남기지 않는다", async () => {
    const { filter } = await openList();

    for (const name of [
      "불안함", "우울함", "화남/답답", "행복함", "막막함",
      "무기력", "피곤함", "뿌듯함", "평온함",
    ]) {
      expect(filter.getByText(name)).toBeTruthy();
    }
  });

  it("「전체 24」의 24 는 감정 기록 수다 — 「12편」과 다른 값", async () => {
    // 일기 12편 × 감정 2개 (A2.md)
    const { r, filter } = await openList();

    expect(filter.getByText("전체 24")).toBeTruthy();
    expect(r.getByText("12편")).toBeTruthy();
  });

  it("한 번에 하나만 고른다 — 다른 감정을 누르면 앞 선택이 풀린다", async () => {
    const { filter, chip } = await openList();

    await fireEvent.press(filter.getByText("행복함"));
    expect(chip("행복함")?.props.accessibilityState.selected).toBe(true);
    expect(chip("전체 24")?.props.accessibilityState.selected).toBe(false);

    await fireEvent.press(filter.getByText("평온함"));
    expect(chip("행복함")?.props.accessibilityState.selected).toBe(false);
    expect(chip("평온함")?.props.accessibilityState.selected).toBe(true);
  });

  it("[전체] 는 초기화다", async () => {
    const { filter, chip } = await openList();
    await fireEvent.press(filter.getByText("행복함"));
    await fireEvent.press(filter.getByText("전체 24"));

    expect(chip("전체 24")?.props.accessibilityState.selected).toBe(true);
  });

  it("고른 칩은 색뿐 아니라 글자 굵기로도 표시한다", async () => {
    const { filter } = await openList();

    expect(flatten(filter.getByText("평온함").props.style).fontFamily).toBe("Pretendard-Medium");
    await fireEvent.press(filter.getByText("평온함"));
    expect(flatten(filter.getByText("평온함").props.style).fontFamily).toBe("Pretendard-SemiBold");
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

  it("미리보기는 두 줄 말줄임이다 — 목록이 벽이 되지 않게", async () => {
    const { r } = await openList();
    const preview = r.getByText("회의는 답답했지만, 그 답답함은 내 의견을 전하고 싶다는 마음에서 왔다.");

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
    await fireEvent.press(r.getByText("목록"));
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

  it("삭제하면 12편이 11편이 된다 — 요약도 함께 준다", async () => {
    useDiary.getState().remove(ID);
    const r = await render(<Archive />);

    expect(r.getByText("11편")).toBeTruthy();
  });
});

describe("하단 탭 — 네 칸이 전부 이어진다", () => {
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
