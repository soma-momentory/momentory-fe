import { StrictMode, useEffect as mockUseEffect } from "react";
import { act, render } from "@testing-library/react-native";

import { AnalyticsResource } from "../AnalyticsResource";
import { track } from "../index";

jest.mock("../index", () => ({ isAnalyticsEnabled: true, track: jest.fn() }));
let mockBlur: (() => void) | undefined;
let mockFocus: (() => void) | undefined;
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => (() => void) | void) =>
    mockUseEffect(() => {
      let cleanup = effect();
      mockBlur = () => cleanup?.();
      mockFocus = () => {
        cleanup = effect();
      };
      return () => cleanup?.();
    }, [effect]),
}));

beforeEach(() => jest.clearAllMocks());

it("일기 조회는 StrictMode와 같은 ID 재렌더로 중복되지 않으며 재진입은 센다", async () => {
  const view = await render(
    <StrictMode>
      <AnalyticsResource kind="diary" id="12" />
    </StrictMode>,
  );
  expect(track).toHaveBeenCalledTimes(1);
  await view.rerender(
    <StrictMode>
      <AnalyticsResource kind="diary" id="12" />
    </StrictMode>,
  );
  expect(track).toHaveBeenCalledTimes(1);
  await act(async () => {
    mockBlur?.();
    mockFocus?.();
  });
  expect(track).toHaveBeenCalledTimes(2);
  expect(track).toHaveBeenLastCalledWith("diary_viewed", { diary_id: "12" });
});

it("카드가 없을 때는 조회가 아니며 같은 카드 상태 변경으로 재조회되지 않는다", async () => {
  const view = await render(<AnalyticsResource kind="wish_card" id={null} source="cards" />);
  expect(track).not.toHaveBeenCalled();
  await view.rerender(<AnalyticsResource kind="wish_card" id="12" source="cards" />);
  await view.rerender(<AnalyticsResource kind="wish_card" id="12" source="cards" />);
  expect(track).toHaveBeenCalledTimes(1);
  await view.rerender(<AnalyticsResource kind="wish_card" id="13" source="cards" />);
  expect(track).toHaveBeenLastCalledWith("wish_card_viewed", {
    wish_card_id: "13",
    source: "cards",
  });
});

it("리포트 재조회 중 남은 이전 데이터를 조회로 세지 않는다", async () => {
  let ready = false;
  const isReady = () => ready;
  const view = await render(<AnalyticsResource kind="report" id="2026-08-30" isReady={isReady} />);
  expect(track).not.toHaveBeenCalled();
  ready = true;
  await view.rerender(<AnalyticsResource kind="report" id="2026-08-30" isReady={isReady} />);
  expect(track).toHaveBeenCalledTimes(1);
  ready = false;
  await view.rerender(<AnalyticsResource kind="report" id={null} isReady={isReady} />);
  ready = true;
  await view.rerender(<AnalyticsResource kind="report" id="2026-08-30" isReady={isReady} />);
  expect(track).toHaveBeenCalledTimes(1);
});
