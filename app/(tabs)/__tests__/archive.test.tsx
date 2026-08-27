import { render, fireEvent, within, act } from "@testing-library/react-native";
import { router } from "expo-router";

import Archive from "../archive";

import { label as labelColor, primary } from "@/design/ds";
import { useMonthSchedules } from "@/features/archive/model/monthSchedules";
import { useDiary } from "@/features/diary/model/diary";
import * as scheduleApi from "@/features/home/data/scheduleApi";
import type { Schedule } from "@/features/home/model/types";
import { seedDiaries } from "@/testing/fixtures";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
  // 리포트에서 「이 주의 기록 보기」로 건너올 때만 값이 있다 — 기본은 빈 파라미터
  useLocalSearchParams: jest.fn(() => ({})),
}));

const routeParams = jest.requireMock("expo-router") as { useLocalSearchParams: jest.Mock };

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
  seedDiaries(); // 일기 12편을 심는다 (src/testing/fixtures.ts)
  useMonthSchedules.getState().reset();
  jest.clearAllMocks();
  routeParams.useLocalSearchParams.mockReturnValue({});
  // 보관함은 마운트 때 그달 일정을 `/schedules/period` 로 받는다 — 기본은 「받은
  // 일정 없음」이고, 일정이 필요한 테스트만 이 목을 갈아끼운다
  jest
    .spyOn(scheduleApi, "fetchSchedulesInPeriod")
    .mockResolvedValue({ ok: false, code: "network" });
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

  it("그날 일정도 함께 보인다 — 「○월 ○일의 일정」 아래, 완료·미완료를 점으로", async () => {
    // design.md 「보관함」 — 일기가 없어도 일정이 있는 날이 있다. 그달 일정은
    // 서버에서 받아온다(`/schedules/period`) — 홈의 완료가 이 점에 비친다
    jest.spyOn(scheduleApi, "fetchSchedulesInPeriod").mockResolvedValue({
      ok: true,
      data: [
        schedule("s-done", "2026-07-27", "팀 회의", true),
        schedule("s-open", "2026-07-27", "장보기", false),
      ],
    });
    const r = await render(<Archive />);

    // 일정은 자기 머리글로 일기와 나뉜다
    expect(await r.findByText("7월 27일의 일정")).toBeTruthy();
    expect(r.getByText("팀 회의")).toBeTruthy();
    expect(r.getByText("장보기")).toBeTruthy();
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

    expect(r.getByText("7월 22일의 일기")).toBeTruthy();
    expect(r.getByText("화남·답답함")).toBeTruthy(); // 얼굴이 아니라 이름으로
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

    expect(r.getByText(/이 날은 기록이 없어요/)).toBeTruthy();
    expect(r.queryByText("일기 열어보기 ›")).toBeNull();
  });

  it("선택된 날은 감정 박스 테두리를 굵혀 표시한다 — 색만으로 구분하지 않는다", async () => {
    // 채움 모드에선 선택 표시가 셀이 아니라 **가로로 좁은 감정 박스**에 붙는다.
    // 박스는 날짜 숫자를 감싸므로 그 숫자 Text 의 부모가 박스다.
    const r = await render(<Archive />);
    const boxOf = (label: string, day: string) =>
      within(r.getByLabelText(label)).getByText(day).parent;

    expect(flatten(boxOf("22일", "22")?.props.style).borderWidth).not.toBe(2);
    await fireEvent.press(r.getByLabelText("22일"));
    expect(flatten(boxOf("22일", "22")?.props.style).borderWidth).toBe(2);
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
      "화남·답답함",
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
    expect(r.queryByText("7월 22일의 일기")).toBeNull();

    await fireEvent.press(filter.getByText("우울함"));
    expect(chip("우울함")?.props.accessibilityState.selected).toBe(false);
    expect(r.getByText("7월 22일의 일기")).toBeTruthy();
  });

  it("여러 감정을 함께 고른다 — 합집합(하나라도 붙은 일기)으로 넓히고 앞 선택이 풀리지 않는다", async () => {
    // 2026-08-24 「한 번에 하나만」 → 다중 선택(교집합) → 2026-08-28 합집합
    // (PRODUCT.md 상류와 차이). 칩을 더 누를수록 결과가 사라지는 것이
    // 필터를 「끄는」 것처럼 읽혔다 — 칩 하나는 이제 「이 감정도 보여줘」다.
    // 7/22[3,8] = 화남·답답함 + 뿌듯함 · 7/8[4,8] = 뿌듯함만
    const { r, filter, chip } = await openList();

    // 화남·답답함만 — 그게 붙은 7/22 는 남고 7/8 은 빠진다
    await fireEvent.press(filter.getByText("화남·답답함"));
    expect(r.getByText("7월 22일의 일기")).toBeTruthy();
    expect(r.queryByText("7월 8일의 일기")).toBeNull();

    // 뿌듯함을 더 고르면 앞 선택이 유지되고, **둘 중 하나라도** 가진 일기가 남는다
    await fireEvent.press(filter.getByText("뿌듯함"));
    expect(chip("화남·답답함")?.props.accessibilityState.selected).toBe(true);
    expect(chip("뿌듯함")?.props.accessibilityState.selected).toBe(true);
    expect(r.getByText("7월 22일의 일기")).toBeTruthy();
    expect(r.getByText("7월 8일의 일기")).toBeTruthy(); // 뿌듯함만 있어도 들어온다

    // 뿌듯함을 다시 누르면 그 하나만 풀린다 — 화남·답답함은 남고 7/8 이 다시 빠진다
    await fireEvent.press(filter.getByText("뿌듯함"));
    expect(chip("화남·답답함")?.props.accessibilityState.selected).toBe(true);
    expect(chip("뿌듯함")?.props.accessibilityState.selected).toBe(false);
    expect(r.queryByText("7월 8일의 일기")).toBeNull();
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
    expect(r.getByText("7월 27일의 일기")).toBeTruthy();
  });

  it("감정을 고르면 그 감정이 붙은 일기만 남는다", async () => {
    const { r, filter } = await openList();

    await fireEvent.press(filter.getByText("우울함"));

    // 우울함(2)은 7/17 · 7/27 두 편이다
    expect(r.getByText("7월 27일의 일기")).toBeTruthy();
    expect(r.getByText("7월 17일의 일기")).toBeTruthy();
    expect(r.queryByText("7월 22일의 일기")).toBeNull();
  });

  it("검색은 일기 본문을 찾는다", async () => {
    const { r } = await openList();

    await fireEvent.changeText(r.getByLabelText("일기 내용 검색"), "회의");

    expect(r.getByText("7월 22일의 일기")).toBeTruthy();
    expect(r.queryByText("7월 27일의 일기")).toBeNull();
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

describe("A2 · 기간 선택 — 달 고르기 · 전체 보기", () => {
  /** 이번 달 밖(6월) 일기 한 편을 더 심는다 — 다른 달을 보는 걸 확인하려면 필요하다 */
  const seedJune = () => {
    const base = useDiary.getState().diaries[0]!;
    useDiary.setState((s) => ({
      diaries: [
        ...s.diaries,
        { ...base, id: "d-june", date: "2026-06-10", body: "6월의 어느 날, 오래 걸었다." },
      ],
    }));
  };

  const openList = async () => {
    const r = await render(<Archive />);
    await fireEvent.press(r.getByLabelText("목록으로 보기"));
    return r;
  };

  it("목록은 이번 달로 열리고, 그 자리를 눌러 기간 시트를 연다", async () => {
    const r = await openList();

    // 오른쪽에 지금 보는 기간이 뜬다 — 처음엔 오늘이 속한 달이다
    expect(r.getByLabelText("기간 선택, 지금 2026년 7월")).toBeTruthy();

    await fireEvent.press(r.getByLabelText("기간 선택, 지금 2026년 7월"));

    // 시트가 열리고 「전체 보기」와 달을 고를 수 있다.
    // **제목 줄은 두지 않는다**(2026-08-24) — 고를 것들이 그 자체로 자리를 말한다
    expect(r.getByTestId("ds-bottom-sheet")).toBeTruthy();
    expect(r.queryByText("기간 선택")).toBeNull();
    expect(r.getByText("전체 보기")).toBeTruthy();
  });

  it("전체 보기를 고르면 이번 달 밖의 일기도 함께 나온다", async () => {
    seedJune();
    const r = await openList();

    // 이번 달(7월)만 볼 때는 6월 일기가 없다
    expect(r.queryByText(/6월 10일/)).toBeNull();

    await fireEvent.press(r.getByLabelText("기간 선택, 지금 2026년 7월"));
    await fireEvent.press(r.getByText("전체 보기"));

    // 6월과 7월이 한 목록에 함께 나온다
    expect(r.getByText(/6월 10일/)).toBeTruthy();
    expect(r.getByText("7월 27일의 일기")).toBeTruthy();
    // 그 자리도 「전체 보기」로 바뀐다
    expect(r.getByLabelText("기간 선택, 지금 전체 보기")).toBeTruthy();
  });

  it("달을 고르면 그달만 남는다 — 기록이 있는 달을 시트에서 고른다", async () => {
    seedJune();
    const r = await openList();

    await fireEvent.press(r.getByLabelText("기간 선택, 지금 2026년 7월"));
    await fireEvent.press(r.getByText("2026년 6월"));

    expect(r.getByText(/6월 10일/)).toBeTruthy();
    expect(r.queryByText("7월 27일의 일기")).toBeNull();
    expect(r.getByLabelText("기간 선택, 지금 2026년 6월")).toBeTruthy();
  });
});

/**
 * ⚠ **되돌리기 줄을 없앴다**(2026-08-21). 삭제 앞에 확인 모달이 있으므로 같은 것을
 * 두 번 묻는 셈이었다(`DESIGN.md` 「삭제는 확인 모달 1회」 · `docs/PRODUCT.md`).
 * 지운 일기는 목록에서 곧바로 빠지고, 결과는 토스트 한 줄로만 말한다.
 */
describe("삭제 — 되돌리기 줄을 두지 않는다", () => {
  const ID = "d-fixture-27";

  it("지워도 [되돌리기] 가 뜨지 않는다", async () => {
    await act(async () => {
      useDiary.getState().remove(ID);
    });
    const r = await render(<Archive />);

    expect(r.queryByText("되돌리기")).toBeNull();
    expect(r.queryByText("삭제했어요")).toBeNull();
  });

  it("지운 일기는 목록에서 곧바로 빠진다", async () => {
    const r = await render(<Archive />);
    await fireEvent.press(r.getByLabelText("목록으로 보기"));
    expect(r.getByText("7월 27일의 일기")).toBeTruthy();

    await act(async () => {
      useDiary.getState().remove(ID);
    });

    expect(r.queryByText("7월 27일의 일기")).toBeNull();
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

/**
 * 리포트가 「이 주의 기록 보기」로 건너보내는 길 — 그 주의 **일요일**을 들고 온다
 * (`app/(tabs)/report.tsx`). 날짜를 안 주면 오늘이 든 달로 열려서, 지난 주를 보다
 * 누른 사람은 자기가 보던 주를 다시 찾아가야 한다.
 */
describe("A1 · 리포트에서 건너오기", () => {
  it("건너온 날이 든 달을 열고 그 칸을 고른 채로 선다", async () => {
    // 7월 19일(일) — 고정 하루(7/27)가 든 달과 같은 7월이지만 **다른 날**이다
    routeParams.useLocalSearchParams.mockReturnValue({ date: "2026-07-19" });

    const r = await render(<Archive />);

    expect(r.getByText("2026년 7월")).toBeTruthy();
    expect(r.getByLabelText("19일").props.accessibilityState.selected).toBe(true);
    // 오늘(27일)이 아니라 건너온 날이 고른 칸이다
    expect(r.getByLabelText("27일").props.accessibilityState.selected).toBe(false);
  });

  it("지난 달의 주로 건너오면 그 달이 열린다", async () => {
    routeParams.useLocalSearchParams.mockReturnValue({ date: "2026-06-28" });

    const r = await render(<Archive />);

    expect(r.getByText("2026년 6월")).toBeTruthy();
    expect(r.getByLabelText("28일").props.accessibilityState.selected).toBe(true);
  });

  it("날짜 없이 탭으로 들어오면 여느 때처럼 오늘이다", async () => {
    const r = await render(<Archive />);

    expect(r.getByText("2026년 7월")).toBeTruthy();
    expect(r.getByLabelText("27일").props.accessibilityState.selected).toBe(true);
  });

  it("모양이 어긋난 날짜는 없는 것으로 친다 — 깨진 달을 그리지 않는다", async () => {
    routeParams.useLocalSearchParams.mockReturnValue({ date: "지난주" });

    const r = await render(<Archive />);

    expect(r.getByText("2026년 7월")).toBeTruthy();
    expect(r.getByLabelText("27일").props.accessibilityState.selected).toBe(true);
  });
});
