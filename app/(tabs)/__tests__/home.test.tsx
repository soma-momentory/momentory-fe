import { act, render, fireEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";

import Home from "../home";

import { useDay } from "@/features/home/model/day";
import type { Schedule } from "@/features/home/model/types";
import { SAMPLE_MOMENTS, SAMPLE_SCHEDULES } from "@/mocks/sample";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

// 모듈 store 라 테스트 사이에 값이 샌다 — 매번 샘플 하루로 되돌린다
beforeEach(() => {
  jest.clearAllMocks();
  useDay.setState({
    schedules: SAMPLE_SCHEDULES.map((s) => ({ ...s, emotions: [...s.emotions] })),
    moments: SAMPLE_MOMENTS,
  });
});

/** ⋮ 를 눌러 그 줄의 메뉴를 연다 — 메뉴는 누른 지점 아래에 뜬다 */
const openMenu = async (r: Awaited<ReturnType<typeof render>>, title: string) =>
  fireEvent.press(r.getByLabelText(`${title} 더보기`), { nativeEvent: { pageY: 300 } });

describe("12 · 홈 — 날짜 · CTA · 이번 주 감정 · 오늘 일정", () => {
  it("날씨 씬이 사라졌다 — 날씨를 말하지 않는다 (PLAN.md A-3)", async () => {
    const { queryByText } = await render(<Home />);

    expect(queryByText("맑음 · 27°")).toBeNull();
  });

  it("날짜와 요일을 두 줄로 말한다", async () => {
    const { getByText } = await render(<Home />);

    expect(getByText("7월 27일")).toBeTruthy();
    expect(getByText("월요일")).toBeTruthy();
  });

  it("하루 돌아보기는 화면의 유일한 주 버튼이다", async () => {
    const { getByText, getByRole } = await render(<Home />);

    expect(getByText("오늘 하루는 어땠어요?")).toBeTruthy();
    // 인사 화면(`C1`)이 사라져 **곧바로 일정 확인**으로 간다(`design.md` 「일기」 1)
    await fireEvent.press(getByRole("button", { name: "지금 하루 돌아보기" }));
    expect(router.push).toHaveBeenCalledWith("/retro/confirm");
  });

  it("알림을 켠 사람에게만 정한 시각을 말한다", async () => {
    const { getByText } = await render(<Home />);

    expect(getByText("밤 9:30엔 제가 먼저 말 걸어요")).toBeTruthy();
  });

  it("종은 갈 곳이 있다 — 알림 설정으로 간다", async () => {
    const { getByLabelText } = await render(<Home />);

    // 옛 `/my/notify` 는 마이 이관에서 **시트가 됐다** — 그 시트를 여는 곳이 `M1` 이다
    await fireEvent.press(getByLabelText("알림 설정"));
    expect(router.push).toHaveBeenCalledWith("/my");
  });

  it("이번 주 감정은 요일마다 한 칸이고, 이름을 낭독기에 준다", async () => {
    const { getByText, getByLabelText } = await render(<Home />);

    expect(getByText("이번 주 감정")).toBeTruthy();
    // 샘플 하루(7/27 월)의 일기 감정은 불안함이다 — 색만으로 말하지 않는다
    expect(getByLabelText("월요일 · 불안함")).toBeTruthy();
    expect(getByLabelText("금요일 · 기록 없음")).toBeTruthy();
  });

  it("요일을 누르면 이름이 글자로도 선다", async () => {
    const { getByLabelText, getByText, queryByText } = await render(<Home />);

    expect(queryByText("월요일 · 불안함")).toBeNull();
    await fireEvent.press(getByLabelText("월요일 · 불안함"));
    expect(getByText("월요일 · 불안함")).toBeTruthy();
  });

  it("일정 4건과 「2개 남음」을 보인다 — 남은 수이지 달성률이 아니다", async () => {
    const { getByText } = await render(<Home />);

    for (const title of ["팀 회의", "발표 준비", "면접 스터디", "운동 가기"]) {
      expect(getByText(title)).toBeTruthy();
    }
    expect(getByText("2개 남음")).toBeTruthy();
  });

  it("진행률·연속·배지를 두지 않는다", async () => {
    const { queryByText } = await render(<Home />);

    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/연속/)).toBeNull();
    expect(queryByText(/일째/)).toBeNull();
    expect(queryByText("2/4 마침")).toBeNull();
  });

  it("일정 줄에 감정 알약이 없다 — 감정은 회고에서만 받는다 (N7)", async () => {
    const { queryByText } = await render(<Home />);

    // 샘플의 「팀 회의 · 화남/답답」·「발표 준비 · 행복함」이 줄에 붙지 않는다
    expect(queryByText("화남/답답")).toBeNull();
    expect(queryByText("행복함")).toBeNull();
  });

  it("다 마치면 그 사실만 말한다 — 점수를 매기지 않는다", async () => {
    await act(() =>
      useDay.setState({ schedules: SAMPLE_SCHEDULES.map((s) => ({ ...s, done: true })) }),
    );
    const { getByText } = await render(<Home />);

    expect(getByText("모두 완료")).toBeTruthy();
    expect(getByText("오늘 일정을 모두 마쳤어요.")).toBeTruthy();
  });
});

describe("일정 순서 — 꾹 눌러 끈다 (design.md 「일정」)", () => {
  it("끌 수 없어도 옮길 수 있다 — 제목의 접근성 동작", async () => {
    // 끌기만 있으면 스크린리더로는 순서를 못 바꾼다 (RULES.md 「접근성」)
    const { getByLabelText } = await render(<Home />);
    const before = useDay.getState().schedules.map((s) => s.title);

    await fireEvent(getByLabelText("발표 준비"), "accessibilityAction", {
      nativeEvent: { actionName: "moveUp" },
    });

    const after = useDay.getState().schedules.map((s) => s.title);
    expect(after[0]).toBe("발표 준비");
    expect(after[1]).toBe(before[0]);
  });

  it("갈 곳이 없으면 아무 일도 없다", async () => {
    const { getByLabelText } = await render(<Home />);
    const before = useDay.getState().schedules.map((s) => s.id);

    await fireEvent(getByLabelText("팀 회의"), "accessibilityAction", {
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

describe("일정 행 — 체크박스와 ⋮", () => {
  it("체크는 즉시 마침/취소이고 **감정을 묻지 않는다** (N7)", async () => {
    const { getByLabelText, getByText } = await render(<Home />);

    await fireEvent.press(getByLabelText("면접 스터디 마침"));
    expect(getByText("1개 남음")).toBeTruthy();
    expect(useDay.getState().schedules[2]?.done).toBe(true);
    // 감정 시트로 가는 길이 사라졌다 — 라우트 자체가 없다
    expect(router.push).not.toHaveBeenCalled();

    await fireEvent.press(getByLabelText("면접 스터디 마침"));
    expect(getByText("2개 남음")).toBeTruthy();
  });

  it("마침은 doneAt 을 남기고 취소하면 지운다", async () => {
    const { getByLabelText } = await render(<Home />);

    await fireEvent.press(getByLabelText("운동 가기 마침"));
    expect(useDay.getState().schedules[3]?.doneAt).not.toBeNull();

    await fireEvent.press(getByLabelText("운동 가기 마침"));
    expect(useDay.getState().schedules[3]?.doneAt).toBeNull();
  });

  it("체크박스는 20 이지만 히트 영역은 44 다", async () => {
    // 작은 글리프는 시각 크기를 키우지 말고 hitSlop 으로 44 를 확보한다 (RULES.md)
    const { getByLabelText } = await render(<Home />);

    expect(getByLabelText("팀 회의 마침").props.hitSlop).toBe(12); // (44 - 20) / 2
  });

  it("마친 줄은 취소선으로 목록에 남는다 — 사라지지 않는다", async () => {
    const { getByText } = await render(<Home />);

    expect(flatten(getByText("팀 회의").props.style).textDecorationLine).toBe("line-through");
    expect(flatten(getByText("운동 가기").props.style).textDecorationLine).toBeUndefined();
  });

  it("직접 추가한 일정의 ⋮ 는 수정과 삭제를 준다", async () => {
    const r = await render(<Home />);
    await openMenu(r, "운동 가기");

    expect(r.getByText("수정하기")).toBeTruthy();
    expect(r.getByText("삭제하기")).toBeTruthy();

    await fireEvent.press(r.getByText("수정하기"));
    expect(router.push).toHaveBeenCalledWith("/home/schedule/s4");
  });

  it("가져온 일정은 지우는 것이 아니라 숨기는 것이다", async () => {
    const r = await render(<Home />);
    await openMenu(r, "면접 스터디");

    expect(r.queryByText("삭제하기")).toBeNull();
    await fireEvent.press(r.getByText("홈에서 숨기기"));

    // 배열에는 남아 있다 — hidden 플래그만 켠다 (캘린더 원본은 지우지 않는다)
    expect(useDay.getState().schedules.find((s) => s.id === "s3")?.hidden).toBe(true);
    expect(useDay.getState().schedules).toHaveLength(4);
    expect(r.getByText("홈에서만 보이지 않게 돼요 · 캘린더 원본은 그대로 있어요")).toBeTruthy();
  });

  it("바깥을 누르면 메뉴가 닫힌다", async () => {
    const r = await render(<Home />);
    await openMenu(r, "운동 가기");

    await fireEvent.press(r.getByLabelText("메뉴 닫기"));
    expect(r.queryByText("수정하기")).toBeNull();
  });

  it("삭제는 한 번 묻는다 — 되돌릴 수 없다", async () => {
    const r = await render(<Home />);
    await openMenu(r, "운동 가기");
    await fireEvent.press(r.getByText("삭제하기"));

    // 아직 지워지지 않았다 — 확인이 먼저다
    expect(r.getByText("이 일정을 삭제할까요?")).toBeTruthy();
    expect(useDay.getState().schedules).toHaveLength(4);

    await fireEvent.press(r.getByRole("button", { name: "취소" }));
    expect(r.queryByText("이 일정을 삭제할까요?")).toBeNull();
    expect(useDay.getState().schedules).toHaveLength(4);
  });

  it("확인하면 지워지고 한 줄로 알린다", async () => {
    const r = await render(<Home />);
    await openMenu(r, "운동 가기");
    await fireEvent.press(r.getByText("삭제하기"));
    await fireEvent.press(r.getByRole("button", { name: "삭제" }));

    expect(useDay.getState().schedules).toHaveLength(3);
    expect(r.getByText("일정을 삭제했어요.")).toBeTruthy();
  });
});

describe("목록이 길 때 — 5개까지 펼친다 (12.md)", () => {
  const many = (): Schedule[] =>
    Array.from({ length: 7 }, (_, i) => ({
      ...SAMPLE_SCHEDULES[3]!,
      id: `m${i}`,
      title: `일정 ${i}`,
      done: false,
      emotions: [],
    }));

  it("접힌 줄은 그리지 않고, 누르면 펼쳐진다", async () => {
    await act(() => useDay.setState({ schedules: many() }));
    const { getByText, queryByText } = await render(<Home />);

    expect(queryByText("일정 5")).toBeNull();
    await fireEvent.press(getByText("2개 더 보기"));

    expect(getByText("일정 5")).toBeTruthy();
    expect(getByText("일정 6")).toBeTruthy();
    expect(queryByText("2개 더 보기")).toBeNull();
  });
});

describe("12-b · 일정이 없는 경우", () => {
  const emptyDay = () => act(() => useDay.setState({ schedules: [] }));

  it("빈 상태 전용 레이아웃을 만들지 않는다 — 머리도 CTA 도 그대로 있다", async () => {
    await emptyDay();
    const { getByText, getByRole } = await render(<Home />);

    expect(getByText("오늘 일정")).toBeTruthy();
    expect(getByText("＋ 추가")).toBeTruthy();
    // 일정이 없어도 회고는 열린다 (12-b.md)
    expect(getByRole("button", { name: "지금 하루 돌아보기" })).toBeTruthy();
  });

  it("목록 슬롯의 줄만 초대 문구로 바뀐다", async () => {
    await emptyDay();
    const { getByText, queryByText } = await render(<Home />);

    expect(getByText("오늘 하루를 차곡차곡 담아볼까요?")).toBeTruthy();
    expect(
      getByText("일정을 추가하면 하루를 돌아볼 때 더 풍부한 대화를 나눌 수 있어요."),
    ).toBeTruthy();
    // 셀 것이 없으면 세지 않는다
    expect(queryByText(/개 남음/)).toBeNull();
    expect(queryByText("모두 완료")).toBeNull();
  });

  it("숨긴 일정은 세지 않는다", async () => {
    await act(() => useDay.getState().hide("s1"));
    const { getByText } = await render(<Home />);

    // 4건 중 마침이던 「팀 회의」를 숨겼으므로 남은 것은 그대로 2 다
    expect(getByText("2개 남음")).toBeTruthy();
    expect(useDay.getState().schedules).toHaveLength(4);
  });
});

describe("하단 탭", () => {
  it("다섯 칸이다 — 쉼터가 들어왔다 (design.md §10)", async () => {
    const { getByText, getAllByRole } = await render(<Home />);

    expect(getAllByRole("tab")).toHaveLength(5);
    for (const tab of ["홈", "쉼터", "보관함", "리포트", "마이"]) {
      expect(getByText(tab)).toBeTruthy();
    }
  });

  it("활성 칸을 색만으로 표시하지 않는다 — 굵기도 함께 바뀐다", async () => {
    const { getAllByRole } = await render(<Home />);
    const [home, , archive] = getAllByRole("tab");

    expect(home?.props.accessibilityState.selected).toBe(true);
    expect(archive?.props.accessibilityState.selected).toBe(false);

    const weightOf = (tab: typeof home) =>
      flatten(within(tab!).getByText(/./).props.style).fontFamily;
    // 활성 label2(600) / 비활성 caption1(500) — `design.md` §10
    expect(weightOf(home)).toBe("Pretendard-SemiBold");
    expect(weightOf(archive)).toBe("Pretendard-Medium");
  });

  it("탭 이동은 쌓이지 않는다", async () => {
    const { getByLabelText } = await render(<Home />);

    await fireEvent.press(getByLabelText("보관함"));
    expect(router.replace).toHaveBeenCalledWith("/archive");
  });
});
