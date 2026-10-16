import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { track } from "../../../../src/features/analytics";
import { useDiary } from "../../../../src/features/diary/model/diary";
import { readRecommendationMemory } from "../../../../src/features/rest/data/recommendMemory";
import { useRestRecommendation } from "../../../../src/features/rest/model/useRestRecommendation";
import { RestHubPreview, restHubScenarios } from "../RestHubPreview";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock("../../../../src/features/analytics", () => ({ track: jest.fn() }));
jest.mock("../../../../src/features/diary/model/diary", () => ({ useDiary: jest.fn() }));
jest.mock("../../../../src/features/rest/data/recommendMemory", () => ({
  readRecommendationMemory: jest.fn(),
}));
jest.mock("../../../../src/features/rest/model/useRestRecommendation", () => ({
  useRestRecommendation: jest.fn(),
}));

const preview = (scenarioId: string, onMessage = jest.fn(), fontScale: 1 | 1.3 | 1.5 = 1) =>
  render(<RestHubPreview scenarioId={scenarioId} onMessage={onMessage} fontScale={fontScale} />);

describe("Expo Lab 쉼터 Mock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("요청한 쉼터 상태를 모두 선택할 수 있다", () => {
    expect(restHubScenarios.map((item) => item.id)).toEqual([
      "default",
      "no-today",
      "no-recent",
      "empty",
      "long-summary",
      "hint",
      "sheet",
    ]);
  });

  it.each([
    ["default", "오늘의 바람카드가 있어요"],
    ["no-today", "가장 최근 카드는 10월 12일이에요"],
    ["no-recent", "오늘의 바람카드가 있어요"],
    ["empty", "회고를 마치면 그날의 바람카드가 여기 남아요"],
  ])("%s 상태를 공유 UI의 운영 문구로 표시한다", async (scenarioId, summary) => {
    const screen = await preview(scenarioId);
    expect(screen.getByText(summary)).toBeTruthy();
    expect(screen.getByRole("button", { name: "바람카드 보기" })).toBeTruthy();
  });

  it("긴 문구와 추천 표시도 공유 카드에 반영한다", async () => {
    const long = await preview("long-summary", jest.fn(), 1.5);
    expect(long.getByText(/글씨가 크거나 화면이 좁을 때에도/)).toBeTruthy();
    await long.unmount();

    const hint = await preview("hint");
    expect(hint.getByText("오늘 추천")).toBeTruthy();
  });

  it("기존 추천 시트를 열고 닫는다", async () => {
    const screen = await preview("sheet");
    expect(screen.getByText("바바가 하나 골라 봤어요")).toBeTruthy();
    expect(screen.getByText("지금 해 볼게요")).toBeTruthy();

    await fireEvent.press(screen.getByText("다른 쉼터 둘러보기"));
    expect(screen.queryByText("지금 해 볼게요")).toBeNull();
  });

  it("카드 선택은 Lab 메시지만 바꾸며 Store·API·기기 기억·라우터·계측을 호출하지 않는다", async () => {
    const onMessage = jest.fn();
    const screen = await preview("default", onMessage);

    await fireEvent.press(screen.getByRole("button", { name: "바람카드 보기" }));
    await waitFor(() => expect(onMessage).toHaveBeenCalledWith("바람카드 이동은 Lab Mock입니다."));
    await fireEvent.press(screen.getByRole("button", { name: "감각연못 열기" }));
    await waitFor(() => expect(onMessage).toHaveBeenCalledWith("감각연못 이동은 Lab Mock입니다."));

    expect(useDiary).not.toHaveBeenCalled();
    expect(useRestRecommendation).not.toHaveBeenCalled();
    expect(readRecommendationMemory).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
