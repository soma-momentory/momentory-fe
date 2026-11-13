import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useEffect as mockUseEffect } from "react";
import { BackHandler, Linking } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import Report from "../report";

import { track } from "@/features/analytics";
import { useDiary } from "@/features/diary/model/diary";
import type { Diary } from "@/features/diary/model/types";
import type { WeeklyBook } from "@/features/report/data/weeklyBookApi";
import { useWeeklyBook } from "@/features/report/model/weeklyBook";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: (effect: () => void | (() => void)) => mockUseEffect(effect, [effect]),
}));
jest.mock("@/features/report/data/weeklyBookApi", () => ({
  ...jest.requireActual("@/features/report/data/weeklyBookApi"),
  fetchWeeklyBook: jest.fn(),
}));
jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  track: jest.fn(),
}));

const api = jest.requireMock("@/features/report/data/weeklyBookApi") as {
  fetchWeeklyBook: jest.Mock;
};

const book = (over: Partial<WeeklyBook> = {}): WeeklyBook => ({
  startDate: "2026-07-19",
  endDate: "2026-07-25",
  newest: true,
  diaryCount: 3,
  detailed: true,
  tone: "NORMAL",
  helpResources: [],
  days: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-07-${19 + i}`,
    written: i < 3,
    emotion: i < 3 ? 3 : null,
  })),
  restCount: 0,
  coverLine: "표지 문장이에요",
  review: "한 주의 글이에요",
  goodWords: "좋은 말이에요",
  okLine: null,
  words: [],
  emotions: [],
  okMoments: [],
  rest: { total: 0, better: 0, same: 0, unsure: 0, places: [], soFar: null },
  done: { completedCount: 2, perDay: [1, 1, 0, 0, 0, 0, 0], linked: [] },
  ...over,
});

const diary = (id: string, date: string) =>
  ({ id, date, body: `${id} 본문`, emotions: [3] }) as unknown as Diary;

// 표시 글에는 낱말을 붙이는 보이지 않는 글자가 끼어 있다 — 비교할 때 뺀다
const shown = (text: unknown) => String(text).replace(/⁠/g, "");

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  useWeeklyBook.getState().reset();
  useDiary.setState({ diaries: [] });
  api.fetchWeeklyBook.mockResolvedValue({ ok: true, data: book() });
});

describe("W1 · 공책", () => {
  it("들어오면 서버가 고른 공책을 연다 — 날짜를 보내지 않는다", async () => {
    const view = await render(<Report />);
    await waitFor(() => expect(view.getByTestId("book-cta")).toBeTruthy());
    expect(api.fetchWeeklyBook).toHaveBeenCalledWith(null);
    expect(view.getByTestId("book-range").props.children).toBe("7월 19일 ~ 25일");
    expect(shown(view.getByTestId("book-cover-line").props.children)).toBe("표지 문장이에요");
    expect(view.getByText("새 리포트")).toBeTruthy();
  });

  it("펼쳐서 끝까지 넘기면 인사가 나오고 닫으면 표지로 돌아온다", async () => {
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));

    await fireEvent.press(view.getByTestId("book-cta"));
    expect(view.getByTestId("book-tab-on")).toBeTruthy();
    expect(track).toHaveBeenCalledWith("report_page_viewed", {
      week_start: "2026-07-19",
      page: "review",
    });

    await fireEvent.press(view.getByTestId("book-next")); // 해낸 일
    await fireEvent.press(view.getByTestId("book-next")); // 마지막 인사
    expect(shown(view.getByTestId("book-closing").props.children)).toContain("활기차게");
    expect(view.queryByTestId("book-next")).toBeNull();

    await fireEvent.press(view.getByTestId("book-done"));
    expect(view.getByTestId("book-cta")).toBeTruthy();
    expect(view.queryByTestId("book-tab-on")).toBeNull();
  });

  it("일기 1편인 주의 버튼은 그 일기로 바로 간다", async () => {
    api.fetchWeeklyBook.mockResolvedValue({
      ok: true,
      data: book({
        diaryCount: 1,
        detailed: false,
        days: book().days.map((d, i) => ({ ...d, written: i === 3, emotion: i === 3 ? 7 : null })),
      }),
    });
    useDiary.setState({ diaries: [diary("d1", "2026-07-22")] });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));

    expect(view.getByText("수요일 일기 보기")).toBeTruthy();
    expect(shown(view.getByTestId("book-hint").props.children)).toBe(
      "한 주에 3일 이상 일기를 쓰면, 리포트가 펼쳐져요",
    );
    await fireEvent.press(view.getByTestId("book-cta"));
    expect(router.push).toHaveBeenCalledWith("/diary/d1");
  });

  it("3일 안내는 처음 두 주만 보인다", async () => {
    const week = (startDate: string) => ({
      ok: true,
      data: book({ startDate, diaryCount: 2, detailed: false }),
    });
    for (const [startDate, shownHint] of [
      ["2026-07-05", true],
      ["2026-07-12", true],
      ["2026-07-19", false],
    ] as const) {
      api.fetchWeeklyBook.mockResolvedValue(week(startDate));
      const view = await render(<Report />);
      await waitFor(() => view.getByTestId("book-cta"));
      expect(view.queryByTestId("book-hint") != null).toBe(shownHint);
      await view.unmount();
    }
  });

  it("일기 2편인 주의 버튼은 목록을 열고, 줄을 누르면 그 일기로 간다", async () => {
    api.fetchWeeklyBook.mockResolvedValue({
      ok: true,
      data: book({ diaryCount: 2, detailed: false }),
    });
    useDiary.setState({
      diaries: [diary("d1", "2026-07-20"), diary("d2", "2026-07-23"), diary("old", "2026-07-10")],
    });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));

    await fireEvent.press(view.getByTestId("book-cta"));
    expect(view.getByTestId("book-diary-sheet")).toBeTruthy();
    expect(view.queryByText("old 본문")).toBeNull();
    await fireEvent.press(view.getByLabelText("목요일 일기 보기"));
    expect(router.push).toHaveBeenCalledWith("/diary/d2");
  });

  it("일기가 전혀 없으면 빈 공책이고, 버튼은 오늘 일기로 간다", async () => {
    api.fetchWeeklyBook.mockResolvedValue({
      ok: true,
      data: book({
        diaryCount: 0,
        detailed: false,
        days: book().days.map((d) => ({ ...d, written: false, emotion: null })),
      }),
    });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cover-line"));
    expect(shown(view.getByTestId("book-cover-line").props.children)).toBe(
      "일기를 쓰면 일요일에 리포트가 도착해요",
    );
    expect(view.getByTestId("book-range").props.children).toBe("이번 주 리포트");
    expect(view.queryByText("새 리포트")).toBeNull();
    await fireEvent.press(view.getByTestId("book-cta"));
    expect(router.push).toHaveBeenCalledWith("/retro/confirm");
    expect(track).toHaveBeenCalledWith("retro_cta_clicked", { source: "report" });
  });

  it("위기 주는 눌러서 걸 수 있는 번호를 앞뒤로 두고 활기차게라고 하지 않는다", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    api.fetchWeeklyBook.mockResolvedValue({
      ok: true,
      data: book({
        tone: "CRISIS",
        goodWords: null,
        restCount: 4,
        helpResources: ["자살예방 상담전화 109"],
      }),
    });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));
    expect(view.queryByText("새 리포트")).toBeNull();
    expect(view.queryByText(/쉼터에/)).toBeNull();

    await fireEvent.press(view.getByTestId("book-cta"));
    await fireEvent.press(view.getAllByTestId("book-help-line")[0]!);
    expect(openURL).toHaveBeenCalledWith("tel:109");

    await fireEvent.press(view.getByTestId("book-next"));
    expect(view.queryByTestId("book-next")).toBeNull();
    expect(view.getAllByTestId("book-help-line")).toHaveLength(1); // 마지막 장에서도 다시 보인다
    expect(shown(view.getByTestId("book-closing").props.children)).not.toContain("활기차게");
    openURL.mockRestore();
  });

  it("안드로이드 뒤로 가기는 공책을 덮는다", async () => {
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));
    const add = jest.spyOn(BackHandler, "addEventListener");
    await fireEvent.press(view.getByTestId("book-cta"));
    const handler = add.mock.calls.find(([name]) => name === "hardwareBackPress")?.[1];
    expect(handler).toBeDefined();
    await act(async () => {
      expect(handler?.({} as never)).toBe(true);
    });
    expect(view.getByTestId("book-cta")).toBeTruthy();
    add.mockRestore();
  });

  it("힘든 주는 감정을 세지 않고, 해낸 일도 막대 없이 한 문장으로 말한다", async () => {
    api.fetchWeeklyBook.mockResolvedValue({
      ok: true,
      data: book({
        tone: "HARD",
        emotions: [{ emotion: 12, count: 2, events: ["야근"] }],
        done: { completedCount: 6, perDay: [0, 2, 1, 1, 0, 2, 0], linked: [] },
      }),
    });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));
    await fireEvent.press(view.getByTestId("book-cta")); // 바바가 본 한 주
    await fireEvent.press(view.getByTestId("book-next")); // 감정과 있었던 일
    expect(view.queryByText("2번")).toBeNull();
    await fireEvent.press(view.getByTestId("book-next")); // 해낸 일
    expect(view.getByTestId("book-done-line")).toBeTruthy();
    expect(view.queryByTestId("book-done-count")).toBeNull();
  });

  it("색인 탭을 누르면 그 장으로 간다", async () => {
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));
    await fireEvent.press(view.getByTestId("book-cta"));
    await fireEvent.press(view.getByLabelText("2쪽, 해낸 일"));
    expect(track).toHaveBeenLastCalledWith("report_page_viewed", {
      week_start: "2026-07-19",
      page: "done",
    });
  });

  it("실패는 한 줄로 흡수한다", async () => {
    api.fetchWeeklyBook.mockResolvedValue({ ok: false, code: "network" });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-failed"));
  });

  it("예전 공책을 고르면 그 주를 다시 받는다", async () => {
    useDiary.setState({ diaries: [diary("d1", "2026-07-08")] });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-past"));
    await fireEvent.press(view.getByTestId("book-past"));
    await fireEvent.press(view.getByText(/7월 5일/));
    expect(api.fetchWeeklyBook).toHaveBeenCalledWith("2026-07-05");
  });
});
