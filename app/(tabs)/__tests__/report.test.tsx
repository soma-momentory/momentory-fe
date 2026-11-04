import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useEffect as mockUseEffect } from "react";

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

const api = jest.requireMock("@/features/report/data/weeklyBookApi") as { fetchWeeklyBook: jest.Mock };

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

beforeEach(() => {
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
    expect(view.getByText("새 공책")).toBeTruthy();
  });

  it("펼쳐서 끝까지 넘기면 인사가 나오고 닫으면 표지로 돌아온다", async () => {
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));

    await fireEvent.press(view.getByTestId("book-cta"));
    expect(view.getByTestId("book-tab-on")).toBeTruthy();
    expect(track).toHaveBeenCalledWith("report_page_viewed", { week_start: "2026-07-19", page: "review" });

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
    expect(view.getByText("한 주에 3일 이상 일기를 쓰면, 리포트가 생겨요")).toBeTruthy();
    await fireEvent.press(view.getByTestId("book-cta"));
    expect(router.push).toHaveBeenCalledWith("/diary/d1");
  });

  it("일기 2편인 주의 버튼은 목록을 열고, 줄을 누르면 그 일기로 간다", async () => {
    api.fetchWeeklyBook.mockResolvedValue({ ok: true, data: book({ diaryCount: 2, detailed: false }) });
    useDiary.setState({ diaries: [diary("d1", "2026-07-20"), diary("d2", "2026-07-23"), diary("old", "2026-07-10")] });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));

    await fireEvent.press(view.getByTestId("book-cta"));
    expect(view.getByTestId("book-diary-sheet")).toBeTruthy();
    expect(view.queryByText("old 본문")).toBeNull();
    await fireEvent.press(view.getByLabelText("목요일 일기 보기"));
    expect(router.push).toHaveBeenCalledWith("/diary/d2");
  });

  it("일기가 전혀 없으면 버튼 없는 빈 공책이다", async () => {
    api.fetchWeeklyBook.mockResolvedValue({
      ok: true,
      data: book({ diaryCount: 0, detailed: false, days: book().days.map((d) => ({ ...d, written: false, emotion: null })) }),
    });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cover-line"));
    expect(shown(view.getByTestId("book-cover-line").props.children)).toBe("일기를 쓰면 일요일에 공책이 도착해요");
    expect(view.queryByTestId("book-cta")).toBeNull();
    expect(view.queryByText("새 공책")).toBeNull();
  });

  it("위기 주는 도움받을 곳을 보여 주고 활기차게라고 하지 않는다", async () => {
    api.fetchWeeklyBook.mockResolvedValue({
      ok: true,
      data: book({ tone: "CRISIS", goodWords: null, helpResources: ["자살예방 상담전화 109"] }),
    });
    const view = await render(<Report />);
    await waitFor(() => view.getByTestId("book-cta"));
    await fireEvent.press(view.getByTestId("book-cta"));
    expect(view.getByText(/1\u2060?0\u2060?9/)).toBeTruthy();
    await fireEvent.press(view.getByTestId("book-next"));
    await fireEvent.press(view.getByTestId("book-next"));
    expect(shown(view.getByTestId("book-closing").props.children)).not.toContain("활기차게");
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
