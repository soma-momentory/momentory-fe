import { act, render, fireEvent, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { View } from "react-native";
import { useEffect as mockUseEffect } from "react";

import Home from "../home";

import { useDiary } from "@/features/diary/model/diary";
import { useAuth } from "@/features/auth/model/auth";
import { useDay } from "@/features/home/model/day";
import { useHomeWeather } from "@/features/home/model/useHomeWeather";
import type { Schedule } from "@/features/home/model/types";
import { fetchLetters } from "@/features/letter/data/letterApi";
import { useLetters } from "@/features/letter/model/letter";
import { seedDiaries, testSchedules } from "@/testing/fixtures";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
  useFocusEffect: (effect: () => void | (() => void)) => mockUseEffect(effect, [effect]),
}));
jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  track: jest.fn(),
}));
jest.mock("@/features/home/model/useHomeWeather", () => ({ useHomeWeather: jest.fn() }));
jest.mock("@/features/letter/data/letterApi", () => ({
  fetchLetters: jest.fn(async () => ({ ok: true, data: [] })),
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

// 모듈 store 라 테스트 사이에 값이 샌다 — 매번 샘플 하루로 되돌린다
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.setState({ status: "anonymous" });
  useLetters.getState().reset();
  jest.mocked(fetchLetters).mockResolvedValue({ ok: true, data: [] });
  jest.mocked(useHomeWeather).mockReturnValue({
    status: "hidden",
    weather: null,
    ownerUserId: null,
    acceptIntro: jest.fn(async () => {}),
    dismissIntro: jest.fn(async () => {}),
  });
  // 이번 주 감정 줄은 일기에서 나온다 — store 기본값이 비어 있으니 샘플로 seed 한다
  // (운영은 `load()` 가 채운다 · 다른 diary 테스트와 같은 결)
  seedDiaries();
  useDay.setState({ schedules: testSchedules() });
});

/** 일정 · 이번 주 감정은 홈의 메모를 눌러 올라오는 시트 안에 있다 */
const renderSchedule = async () => {
  const r = await render(<Home />);
  await fireEvent.press(r.getByRole("button", { name: /오늘 일정 보기/ }));
  return r;
};
const renderWeek = async () => {
  const r = await render(<Home />);
  await fireEvent.press(r.getByRole("button", { name: /이번 주 감정 보기/ }));
  return r;
};

/** 터치 좌표와 다른 버튼 경계를 재게 해 메뉴가 실제 행을 기준으로 뜨는지 본다. */
const openMenu = async (r: Awaited<ReturnType<typeof render>>, title: string) => {
  const measure = jest.spyOn(View.prototype, "measureInWindow").mockImplementation((callback) => {
    callback(0, 280, 44, 44);
  });
  try {
    await fireEvent.press(r.getByLabelText(`${title} 더보기`), { nativeEvent: { pageY: 300 } });
  } finally {
    measure.mockRestore();
  }
};

describe("12 · 홈 — 날짜 · CTA · 이번 주 감정 · 오늘 일정", () => {
  it("날씨 API 전에는 스티커와 오류 문구를 표시하지 않는다", async () => {
    const { queryByText, queryByTestId } = await render(<Home />);

    expect(queryByTestId("home-v2-weather")).toBeNull();
    expect(queryByText(/날씨를 확인/)).toBeNull();
  });

  it("날짜와 요일을 두 줄로 말한다", async () => {
    const { getByText } = await render(<Home />);

    expect(getByText("7월 27일")).toBeTruthy();
    expect(getByText("월요일")).toBeTruthy();
  });

  it("일기 작성하기는 화면의 유일한 주 버튼이다", async () => {
    // 오늘 일기가 없는 날 — 샘플에는 오늘 일기가 있어 걷어 낸다
    useDiary.setState({
      diaries: useDiary.getState().diaries.filter((d) => d.date !== "2026-07-27"),
    });
    const { getByText, getByRole } = await render(<Home />);

    expect(getByText("오늘 하루는\n어땠어요?")).toBeTruthy();
    // 인사 화면(`C1`)이 사라져 **곧바로 일정 확인**으로 간다(`DESIGN.md` 「일기」 1)
    await fireEvent.press(getByRole("button", { name: "일기 작성하기" }));
    expect(router.push).toHaveBeenCalledWith("/retro/confirm");
    // 홈에서 회고로 들어간 길을 남긴다 — 조회만으로는 어디서 왔는지 모른다
    const { track } = jest.requireMock("@/features/analytics") as { track: jest.Mock };
    expect(track).toHaveBeenCalledWith("retro_cta_clicked", { source: "home" });
    expect(track).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(track.mock.invocationCallOrder[0]).toBeLessThan(
      (router.push as jest.Mock).mock.invocationCallOrder[0]!,
    );
  });

  it("오늘 일기를 이미 썼으면 일정 확인을 건너뛰고 대화(「이미 마쳤어요」)로 바로 간다", async () => {
    const [sample] = useDiary.getState().diaries;
    useDiary.setState({ diaries: [{ ...sample!, date: "2026-07-27" }] });
    const { getByRole } = await render(<Home />);

    await fireEvent.press(getByRole("button", { name: "일기 작성하기" }));
    expect(router.push).toHaveBeenCalledWith("/retro/talk");
  });

  it("알림을 켜도 홈 안내 문구를 표시하지 않는다", async () => {
    const { queryByText } = await render(<Home />);

    expect(queryByText(/먼저 말 걸어요/)).toBeNull();
  });

  it("인증되지 않은 상태의 편지 아이콘은 아무것도 열지 않는다", async () => {
    const { getByLabelText } = await render(<Home />);
    await fireEvent.press(getByLabelText("바바의 편지"));
    expect(router.push).not.toHaveBeenCalled();
    expect(fetchLetters).not.toHaveBeenCalled();
  });

  it("안 연 새 편지가 있으면 점을 달고, 누르면 목록 위에 그 편지를 펼친다", async () => {
    useAuth.setState({ status: "authenticated" });
    useLetters.getState().bindUser(7);
    jest.mocked(fetchLetters).mockResolvedValue({
      ok: true,
      data: [
        { id: "12", date: "2026-07-26", isNew: true, openedAt: null },
        { id: "11", date: "2026-07-25", isNew: false, openedAt: "2026-07-26T00:00:00Z" },
      ],
    });
    const r = await render(<Home />);
    await waitFor(() => expect(r.getByTestId("home-v2-unread-dot")).toBeTruthy());
    await fireEvent.press(r.getByRole("button", { name: "바바의 편지, 새 편지 있음" }));
    expect(router.push).toHaveBeenCalledWith("/letter?open=2026-07-26");
  });

  it("열어 본 편지만 있으면 점은 없고, 누르면 편지함 목록만 연다", async () => {
    useAuth.setState({ status: "authenticated" });
    useLetters.getState().bindUser(7);
    jest.mocked(fetchLetters).mockResolvedValue({
      ok: true,
      data: [{ id: "9", date: "2026-07-20", isNew: false, openedAt: null }],
    });
    const r = await render(<Home />);
    await waitFor(() => expect(useLetters.getState().summaries).toHaveLength(1));
    expect(r.queryByTestId("home-v2-unread-dot")).toBeNull();
    await fireEvent.press(r.getByRole("button", { name: "바바의 편지" }));
    expect(router.push).toHaveBeenCalledWith("/letter");
  });

  it("날씨의 주인이 현재 사용자일 때만 스티커·기온·출처를 보인다", async () => {
    useAuth.setState({ status: "authenticated" });
    useLetters.getState().bindUser(7);
    const weather = {
      condition: {
        code: "clear.day",
        family: "clear",
        intensity: null,
        showers: false,
        thunder: false,
        daylight: "day",
        windy: false,
      },
      label: "맑음",
      temperatureC: 22,
      forecastTime: "2026-10-15T13:00:00Z",
      updatedAt: "2026-10-15T12:31:07Z",
      source: "MET Norway",
    } as const;
    jest.mocked(useHomeWeather).mockReturnValue({
      status: "ready",
      weather,
      ownerUserId: 7,
      acceptIntro: jest.fn(async () => {}),
      dismissIntro: jest.fn(async () => {}),
    });
    const r = await render(<Home />);
    expect(r.getByRole("button", { name: "날씨: 맑음 22도" })).toBeTruthy();
    expect(r.queryByText("22℃")).toBeNull();
    await fireEvent.press(r.getByRole("button", { name: "날씨: 맑음 22도" }));
    expect(r.getByText(/MET Norway 예보 · .*밤 9:31 갱신/)).toBeTruthy();

    await act(() => useLetters.getState().bindUser(8));
    expect(r.queryByTestId("home-v2-weather")).toBeNull();
    expect(r.queryByText("22℃")).toBeNull();
    expect(r.queryByTestId("home-v2-unread-dot")).toBeNull();
  });

  it("첫 위치 안내는 지연해 열고 기존 훅의 허용 동작에 연결한다", async () => {
    useAuth.setState({ status: "authenticated" });
    useLetters.getState().bindUser(7);
    const acceptIntro = jest.fn(async () => {});
    jest.mocked(useHomeWeather).mockReturnValue({
      status: "intro",
      weather: null,
      ownerUserId: 7,
      acceptIntro,
      dismissIntro: jest.fn(async () => {}),
    });
    const r = await render(<Home />);
    expect(r.queryByText("오늘 날씨도 함께 볼까요?")).toBeNull();
    await waitFor(() => expect(r.getByText("오늘 날씨도 함께 볼까요?")).toBeTruthy());
    expect(
      r.getByText("지금 있는 곳의 날씨를 홈에 붙여 둘게요. 위치는 날씨를 찾는 데만 써요."),
    ).toBeTruthy();
    await fireEvent.press(r.getByText("위치 허용하기"));
    expect(acceptIntro).toHaveBeenCalledTimes(1);
  });

  it("이번 주 감정은 요일마다 한 칸이고, 이름을 낭독기에 준다", async () => {
    const { getAllByText, getByLabelText } = await renderWeek();

    expect(getAllByText("이번 주 감정")).toHaveLength(2); // 메모 머리 · 시트 제목
    // 샘플 하루(7/27 월)의 일기 감정은 불안함·우울함 둘이다 — 색만으로 말하지 않고,
    // 도트가 하나뿐이라 낭독기에는 **둘 다** 읽힌다
    expect(getByLabelText("월요일 · 불안함, 우울함")).toBeTruthy();
    expect(getByLabelText("금요일 · 기록 없음")).toBeTruthy();
  });

  it("요일을 누르면 그날 감정이 전부 글자로 선다", async () => {
    const { getByLabelText, getByText, queryByText } = await renderWeek();

    expect(queryByText("불안함")).toBeNull();
    await fireEvent.press(getByLabelText("월요일 · 불안함, 우울함"));

    // 도트 하나는 첫 감정 색만 맡는다 — 나머지가 보이는 곳은 여기뿐이다
    expect(getByText("월요일 · 불안함, 우울함")).toBeTruthy();
  });

  it("일기는 썼는데 감정이 없는 날은 「기록 없음」이 아니라 「기록 있음」이다", async () => {
    // 감정 추출이 안 된 일기 — 빈 조약돌이 서고, 안 쓴 날(`WeekEmptyDot`)과 갈린다
    const [sample] = useDiary.getState().diaries;
    useDiary.setState({
      diaries: [
        ...useDiary.getState().diaries,
        { ...sample!, id: "no-emotion", date: "2026-07-31", emotions: [] },
      ],
    });
    const { getByLabelText, getByText } = await renderWeek();

    await fireEvent.press(getByLabelText("금요일 · 기록 있음, 감정 없음"));
    expect(getByText("금요일 · 기록 있음, 감정 없음")).toBeTruthy();
  });

  it("일정 4건과 「2개 남음」을 보인다 — 남은 수이지 달성률이 아니다", async () => {
    const { getByText, getAllByText } = await renderSchedule();

    for (const title of ["팀 회의", "발표 준비", "면접 스터디", "운동 가기"]) {
      expect(getByText(title)).toBeTruthy();
    }
    expect(getAllByText("2개 남음")).toHaveLength(2); // 메모 머리 · 시트 머리
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

    // 샘플의 「팀 회의 · 화남·답답함」·「발표 준비 · 행복함」이 줄에 붙지 않는다
    expect(queryByText("화남·답답함")).toBeNull();
    expect(queryByText("행복함")).toBeNull();
  });

  it("다 마치면 그 사실만 말한다 — 점수를 매기지 않는다", async () => {
    await act(() =>
      useDay.setState({ schedules: testSchedules().map((s) => ({ ...s, done: true })) }),
    );
    const { getByText, getAllByText } = await renderSchedule();

    expect(getAllByText("모두 완료")).toHaveLength(2);
    expect(getByText("오늘 일정을 모두 마쳤어요.")).toBeTruthy();
  });
});

describe("일정 순서 — 꾹 눌러 끈다 (design.md 「일정」)", () => {
  it("끌 수 없어도 옮길 수 있다 — 제목의 접근성 동작", async () => {
    // 끌기만 있으면 스크린리더로는 순서를 못 바꾼다 (RULES.md 「접근성」)
    const { getByLabelText } = await renderSchedule();
    const before = useDay.getState().schedules.map((s) => s.title);

    await fireEvent(getByLabelText("발표 준비"), "accessibilityAction", {
      nativeEvent: { actionName: "moveUp" },
    });

    const after = useDay.getState().schedules.map((s) => s.title);
    expect(after[0]).toBe("발표 준비");
    expect(after[1]).toBe(before[0]);
  });

  it("갈 곳이 없으면 아무 일도 없다", async () => {
    const { getByLabelText } = await renderSchedule();
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
    const { getByLabelText, getAllByText } = await renderSchedule();

    await fireEvent.press(getByLabelText("면접 스터디 마침"));
    expect(getAllByText("1개 남음")).toHaveLength(2);
    expect(useDay.getState().schedules[2]?.done).toBe(true);
    // 감정 시트로 가는 길이 사라졌다 — 라우트 자체가 없다
    expect(router.push).not.toHaveBeenCalled();

    await fireEvent.press(getByLabelText("면접 스터디 마침"));
    expect(getAllByText("2개 남음")).toHaveLength(2);
  });

  it("마침은 doneAt 을 남기고 취소하면 지운다", async () => {
    const { getByLabelText } = await renderSchedule();

    await fireEvent.press(getByLabelText("운동 가기 마침"));
    expect(useDay.getState().schedules[3]?.doneAt).not.toBeNull();

    await fireEvent.press(getByLabelText("운동 가기 마침"));
    expect(useDay.getState().schedules[3]?.doneAt).toBeNull();
  });

  it("손으로 마친 순간에만 작은 끝맺음이 핀다 — 처음부터 마친 줄 · 체크를 풀 때는 피지 않는다", async () => {
    const { getByLabelText, queryAllByTestId } = await renderSchedule();
    const bursts = () => queryAllByTestId("check-burst", { includeHiddenElements: true });
    expect(bursts()).toHaveLength(0); // 「팀 회의」는 처음부터 마친 줄이다

    await fireEvent.press(getByLabelText("팀 회의 마침")); // 풀기
    expect(bursts()).toHaveLength(0);

    await fireEvent.press(getByLabelText("운동 가기 마침")); // 마치기
    expect(bursts()).toHaveLength(1);
  });

  it("체크박스는 24 이지만 히트 영역은 44 다", async () => {
    // 작은 글리프는 시각 크기를 키우지 말고 hitSlop 으로 44 를 확보한다 (RULES.md)
    const { getByLabelText } = await renderSchedule();

    expect(getByLabelText("팀 회의 마침").props.hitSlop).toBe(10); // (44 - 24) / 2
  });

  it("마친 줄은 취소선으로 목록에 남는다 — 사라지지 않는다", async () => {
    const { getByText } = await renderSchedule();

    expect(flatten(getByText("팀 회의").props.style).textDecorationLine).toBe("line-through");
    expect(flatten(getByText("운동 가기").props.style).textDecorationLine).toBeUndefined();
  });

  it("직접 추가한 일정의 ⋮ 는 수정과 삭제를 준다", async () => {
    const r = await renderSchedule();
    await openMenu(r, "운동 가기");

    expect(flatten(r.getByTestId("ds-menu-panel").props.style).top).toBe(332);
    expect(r.getByText("수정하기")).toBeTruthy();
    expect(r.getByText("삭제하기")).toBeTruthy();

    await fireEvent.press(r.getByText("수정하기"));
    expect(router.push).toHaveBeenCalledWith("/home/schedule/s4");
  });

  it("가져온 일정은 「삭제하기」라고 말하지만 숨기는 것이다 — 캘린더 원본은 그대로다", async () => {
    const r = await renderSchedule();
    await openMenu(r, "면접 스터디");

    // 수정은 여전히 없다 — 가져온 제목은 우리가 고칠 수 있는 것이 아니다
    expect(r.queryByText("수정하기")).toBeNull();
    await fireEvent.press(r.getByText("삭제하기"));

    // 배열에는 남아 있다 — hidden 플래그만 켠다 (캘린더 원본은 지우지 않는다)
    expect(useDay.getState().schedules.find((s) => s.id === "s3")?.hidden).toBe(true);
    expect(useDay.getState().schedules).toHaveLength(4);
    // 이름이 「삭제」가 된 만큼, 원본이 남는다는 말은 토스트가 대신한다
    expect(r.getByText("일정을 삭제했어요 · 캘린더 원본은 그대로 있어요")).toBeTruthy();
  });

  it("바깥을 누르면 메뉴가 닫힌다", async () => {
    const r = await renderSchedule();
    await openMenu(r, "운동 가기");

    await fireEvent.press(r.getByLabelText("메뉴 닫기"));
    expect(r.queryByText("수정하기")).toBeNull();
  });

  it("삭제는 한 번 묻는다 — 되돌릴 수 없다", async () => {
    const r = await renderSchedule();
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
    const r = await renderSchedule();
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
      ...testSchedules()[3]!,
      id: `m${i}`,
      title: `일정 ${i}`,
      done: false,
      emotions: [],
    }));

  it("접힌 줄은 그리지 않고, 누르면 펼쳐진다", async () => {
    await act(() => useDay.setState({ schedules: many() }));
    const { getByText, queryByText } = await renderSchedule();

    expect(queryByText("일정 5")).toBeNull();
    await fireEvent.press(getByText("2개 더 보기"));

    expect(getByText("일정 5")).toBeTruthy();
    expect(getByText("일정 6")).toBeTruthy();
    expect(queryByText("2개 더 보기")).toBeNull();
  });
});

describe("운영 홈 v2 배치", () => {
  it.each([0, 3, 6, 10])("일정 %i개에서도 메모 두 장과 모눈 종이가 그대로다", async (count) => {
    await act(() =>
      useDay.setState({
        schedules: Array.from({ length: count }, (_, i) => ({
          ...testSchedules()[3]!,
          id: `case-${i}`,
          title: `검증 일정 ${i}`,
        })),
      }),
    );
    const r = await render(<Home />);
    expect(r.getByTestId("tab-paper-background", { includeHiddenElements: true })).toBeTruthy();
    expect(r.getByRole("button", { name: /오늘 일정 보기/ })).toBeTruthy();
    expect(r.getByRole("button", { name: /이번 주 감정 보기/ })).toBeTruthy();
    expect(r.getByRole("button", { name: "일기 작성하기" })).toBeTruthy();

    // 일정은 시트에서 다룬다 — 5개까지 펼치고 접는 규칙은 그대로다
    await fireEvent.press(r.getByRole("button", { name: /오늘 일정 보기/ }));
    expect(r.getByTestId("home-v2-list-scroll")).toBeTruthy();
    if (count > 5) {
      expect(r.getByRole("button", { name: `${count - 5}개 더 보기` })).toBeTruthy();
    }
  });
});

describe("12-b · 일정이 없는 경우", () => {
  const emptyDay = () => act(() => useDay.setState({ schedules: [] }));

  it("빈 상태 전용 레이아웃을 만들지 않는다 — 머리도 CTA 도 그대로 있다", async () => {
    await emptyDay();
    const { getByText, getByRole } = await render(<Home />);

    expect(getByText("오늘 일정")).toBeTruthy();
    await fireEvent.press(getByRole("button", { name: /오늘 일정 보기/ }));
    expect(getByText("+ 추가")).toBeTruthy();
    // 일정이 없어도 회고는 열린다 (12-b.md)
    expect(getByRole("button", { name: "일기 작성하기" })).toBeTruthy();
  });

  it("목록 슬롯의 줄만 초대 문구로 바뀐다", async () => {
    await emptyDay();
    const { getByText, getAllByText, queryByText } = await renderSchedule();

    expect(getByText("오늘은 일정이 없어요")).toBeTruthy();
    expect(getByText("여유로운 하루예요.\n하고 싶은 일 하나 적어둘까요?")).toBeTruthy();
    expect(getAllByText("0개")).toHaveLength(2);
    // 셀 것이 없으면 세지 않는다
    expect(queryByText(/개 남음/)).toBeNull();
    expect(queryByText("모두 완료")).toBeNull();
  });

  it("숨긴 일정은 세지 않는다", async () => {
    await act(() => useDay.getState().hide("s1"));
    const { getAllByText } = await renderSchedule();

    // 4건 중 마침이던 「팀 회의」를 숨겼으므로 남은 것은 그대로 2 다
    expect(getAllByText("2개 남음")).toHaveLength(2);
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

  it("활성 칸을 색만으로 표시하지 않는다 — 크기도 함께 바뀐다", async () => {
    const { getAllByRole } = await render(<Home />);
    const [home, , archive] = getAllByRole("tab");

    expect(home?.props.accessibilityState.selected).toBe(true);
    expect(archive?.props.accessibilityState.selected).toBe(false);

    const sizeOf = (tab: typeof home): number =>
      Number(flatten(within(tab!).getByText(/./).props.style).fontSize);
    /**
     * 활성 `body1`(16) / 비활성 `caption1`(14) — `DESIGN.md` §10 · 앱 최소 글자 14(2026-11-07).
     *
     * 예전에는 **굵기**로 갈랐다(`label2` 600 vs `caption1` 500). 앱 서체가 교보손글씨
     * 하나로 가면서 웨이트가 사라져(2026-09-06 · `ds/typography.ts`) 그 신호가 색만
     * 남았고, **크기 단차**로 옮겼다. 크기를 비교하는 이유가 그것이다 — 굵기로
     * 되돌리면 이 테스트가 다시 깨진다.
     *
     * ⚠ 값을 그대로 적지 않는다 — `typeScale` 이 기기 폭에 따라 단을 키운다.
     * 확인할 것은 **활성이 더 크다**는 사실이다.
     */
    expect(sizeOf(home)).toBeGreaterThan(sizeOf(archive));
  });

  it("탭 이동은 쌓이지 않는다", async () => {
    const { getByLabelText } = await render(<Home />);

    await fireEvent.press(getByLabelText("보관함"));
    expect(router.replace).toHaveBeenCalledWith("/archive");
  });
});
