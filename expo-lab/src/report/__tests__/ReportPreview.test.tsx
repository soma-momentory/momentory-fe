import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { track } from "../../../../src/features/analytics";
import { useDiary } from "../../../../src/features/diary/model/diary";
import { fetchWeeklyReport } from "../../../../src/features/report/data/weeklyReportApi";
import { useWeeklyReport } from "../../../../src/features/report/model/weeklyReport";
import { ReportPreview, reportScenarios } from "../ReportPreview";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock("../../../../src/features/analytics", () => ({ track: jest.fn() }));
jest.mock("../../../../src/features/diary/model/diary", () => ({ useDiary: jest.fn() }));
jest.mock("../../../../src/features/report/data/weeklyReportApi", () => ({
  fetchWeeklyReport: jest.fn(),
}));
jest.mock("../../../../src/features/report/model/weeklyReport", () => ({
  ...jest.requireActual<typeof import("../../../../src/features/report/model/weeklyReport")>(
    "../../../../src/features/report/model/weeklyReport",
  ),
  useWeeklyReport: jest.fn(),
}));

const preview = (scenarioId: string, onMessage = jest.fn(), fontScale: 1 | 1.3 | 1.5 = 1) =>
  render(<ReportPreview scenarioId={scenarioId} onMessage={onMessage} fontScale={fontScale} />);

describe("Expo Lab 리포트 Mock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("필요한 리포트 상태를 모두 고를 수 있다", () => {
    expect(reportScenarios.map((item) => item.id)).toEqual([
      "default",
      "empty",
      "loading",
      "error",
      "past-week",
      "long-copy",
    ]);
  });

  it("기본과 빈 기록은 같은 운영 UI에서 서로 다른 값을 표시한다", async () => {
    const standard = await preview("default");
    expect(standard.getByText("4개 중")).toBeTruthy();
    await standard.unmount();

    const empty = await preview("empty");
    expect(empty.getAllByText("없음")).toHaveLength(2);
    expect(empty.getByText("아직 기록된 마음이 없어요.")).toBeTruthy();
    await fireEvent.press(empty.getByRole("button", { name: /주 고르기/ }));
    expect(empty.getByText("2026년 10월 2주차 · 이번 주")).toBeTruthy();
    expect(empty.queryByText(/일기 0일/)).toBeNull();
  });

  it("로딩·오류·지난주·긴 문구 상태를 표시한다", async () => {
    const loading = await preview("loading");
    expect(loading.getByText("한 주를 모으고 있어요")).toBeTruthy();
    await loading.unmount();

    const error = await preview("error");
    expect(error.getByText(/리포트를 불러오지 못했어요/)).toBeTruthy();
    await error.unmount();

    const past = await preview("past-week");
    expect(past.getByText("이 주 감정들")).toBeTruthy();
    await past.unmount();

    const long = await preview("long-copy", jest.fn(), 1.5);
    expect(long.getByText(/하루마다 서로 다른 장면을 남겼어요/)).toBeTruthy();
    expect(long.getByText(/하루 동안 바빴던 일들을/)).toBeTruthy();
  });

  it("주 고르기·기록 보기·탭 이동은 Lab 메모리 안에서만 처리한다", async () => {
    const onMessage = jest.fn();
    const screen = await preview("default", onMessage);

    await fireEvent.press(screen.getByRole("button", { name: /주 고르기/ }));
    expect(screen.getByText("2026년 10월 1주차")).toBeTruthy();
    await fireEvent.press(screen.getByText("2026년 10월 1주차"));
    expect(screen.getByText("이 주 감정들")).toBeTruthy();
    await fireEvent.press(screen.getByText("이 주의 기록 보기"));
    expect(onMessage).toHaveBeenCalledWith("2026-10-04 기록 보기는 Lab Mock입니다.");

    expect(fetchWeeklyReport).not.toHaveBeenCalled();
    expect(useWeeklyReport).not.toHaveBeenCalled();
    expect(useDiary).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
