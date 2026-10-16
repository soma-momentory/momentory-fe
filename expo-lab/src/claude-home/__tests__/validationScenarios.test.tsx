import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { PreviewFontScaleContext, Text } from "../../../../src/components/ds/Text";
import { toHomeWeatherView } from "../../../../src/features/home/ui/v2/weatherStickers";
import { HomeV2Preview } from "../HomeV2Preview";
import {
  inboxForScenario,
  weatherForScenario,
  weatherScenarios,
  type InboxScenarioId,
  type WeatherScenarioId,
} from "../validationScenarios";

const preview = (props: Partial<ComponentProps<typeof HomeV2Preview>> = {}) =>
  render(<HomeV2Preview scenarioId="5b" onMessage={() => {}} {...props} />);

describe("Expo Lab 운영 홈 시나리오", () => {
  it.each([
    ["sunny", "clear.day"],
    ["cloudy", "cloudy"],
    ["rainy", "rain"],
    ["snowy", "snow"],
    ["thunder", "thunder"],
    ["windy", "wind"],
  ] as [WeatherScenarioId, string][])("%s는 운영 매핑으로 %s 스티커를 그린다", async (id, key) => {
    expect(toHomeWeatherView(weatherForScenario(id))?.stickerKey).toBe(key);
    const screen = await preview({ weatherId: id });
    expect(screen.getByTestId("home-v2-weather-sticker")).toBeTruthy();
  });

  it.each(["none", "night", "unmapped", "loading", "error"] as const)(
    "%s는 임의의 날씨 스티커로 대체하지 않는다",
    async (id) => {
      expect(toHomeWeatherView(weatherForScenario(id))).toBeNull();
      const screen = await preview({ weatherId: id });
      expect(screen.queryByTestId("home-v2-weather-sticker")).toBeNull();
    },
  );

  it("날씨 선택지는 데이터 없음과 로딩·오류를 명시한다", () => {
    expect(weatherScenarios.map((item) => item.id)).toEqual([
      "none",
      "sunny",
      "cloudy",
      "rainy",
      "snowy",
      "thunder",
      "windy",
      "night",
      "unmapped",
      "loading",
      "error",
    ]);
  });

  it("읽지 않은 알림은 종의 점을 표시하고 기존 팝오버를 열고 닫는다", async () => {
    const measure = jest.spyOn(View.prototype, "measureInWindow").mockImplementation((callback) => {
      callback(0, 24, 44, 44);
    });
    try {
      const screen = await preview({ inboxId: "unread" });
      expect(screen.getByTestId("home-v2-unread-dot")).toBeTruthy();
      await fireEvent.press(screen.getByRole("button", { name: /알림, 읽지 않은 소식 있음/ }));
      expect(screen.getByTestId("inbox-popover-list")).toBeTruthy();
      expect(screen.getByTestId("inbox-unread-dot-notice-1")).toBeTruthy();
      await fireEvent.press(screen.getByRole("button", { name: /읽지 않음, 오늘의 소식/ }));
      expect(screen.queryByTestId("home-v2-unread-dot")).toBeNull();
      expect(screen.queryByTestId("inbox-unread-dot-notice-1")).toBeNull();
      await fireEvent.press(screen.getByRole("button", { name: "알림 닫기" }));
      expect(screen.queryByTestId("inbox-popover-overlay")).toBeNull();
    } finally {
      measure.mockRestore();
    }
  });

  it.each([
    ["empty", "ready"],
    ["loading", "loading"],
    ["error", "failed"],
  ] as [InboxScenarioId, string][])(
    "%s 알림 상태는 기존 팝오버의 %s 상태를 쓴다",
    async (id, status) => {
      const measure = jest
        .spyOn(View.prototype, "measureInWindow")
        .mockImplementation((callback) => {
          callback(0, 24, 44, 44);
        });
      try {
        const screen = await preview({ inboxId: id });
        await fireEvent.press(screen.getByRole("button", { name: "알림" }));
        expect(screen.getByTestId(`inbox-popover-${status}`)).toBeTruthy();
      } finally {
        measure.mockRestore();
      }
    },
  );

  it("모두 읽음은 점이 없고 긴 알림은 원문 데이터를 유지한다", async () => {
    const read = await preview({ inboxId: "read" });
    expect(read.queryByTestId("home-v2-unread-dot")).toBeNull();
    expect(inboxForScenario("long").items[0]!.title.length).toBeGreaterThan(50);
    expect(inboxForScenario("long").items[0]!.body.length).toBeGreaterThan(50);
    await read.unmount();
  });

  it("큰 글씨 Mock은 공유 DS 글자 크기와 줄 높이를 키운다", async () => {
    const normal = await render(<Text variant="body1">긴 문장 확인</Text>);
    const normalStyle = StyleSheet.flatten(normal.getByText("긴 문장 확인").props.style);
    await normal.unmount();

    const large = await render(
      <PreviewFontScaleContext.Provider value={1.3}>
        <Text variant="body1">긴 문장 확인</Text>
      </PreviewFontScaleContext.Provider>,
    );
    const largeStyle = StyleSheet.flatten(large.getByText("긴 문장 확인").props.style);
    expect(largeStyle.fontSize).toBeCloseTo(normalStyle.fontSize * 1.3);
    expect(largeStyle.lineHeight).toBeCloseTo(normalStyle.lineHeight * 1.3);
    await large.unmount();
  });

  it("10개 일정은 접었다 펼치고, 긴 제목은 접근성 이름으로 보존한다", async () => {
    const many = await preview({ scenarioId: "5g" });
    expect(many.getByRole("button", { name: "5개 더 보기" })).toBeTruthy();
    await fireEvent.press(many.getByRole("button", { name: "5개 더 보기" }));
    expect(many.getByText("추가 일정 5")).toBeTruthy();
    await many.unmount();

    const long = await preview({ scenarioId: "5h" });
    expect(long.getByRole("checkbox", { name: /아주 긴 일정 제목.*마침/ })).toBeTruthy();
    await long.unmount();
  });

  it("추가 화면은 공유 입력 바를 쓰고 Lab 일정만 바꾼다", async () => {
    const screen = await preview({ scenarioId: "5a" });
    await fireEvent.press(screen.getAllByRole("button", { name: "일정 추가" }).at(-1)!);
    expect(screen.getByLabelText("일정 제목")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("일정 제목"), "Mock 추가 일정");
    await fireEvent.press(screen.getAllByRole("button", { name: "일정 추가" }).at(-1)!);
    expect(screen.getByText("Mock 추가 일정")).toBeTruthy();
  });

  it("수정 화면과 삭제 확인은 공유 UI를 쓰고 Lab 일정만 바꾼다", async () => {
    const measure = jest.spyOn(View.prototype, "measureInWindow").mockImplementation((callback) => {
      callback(0, 280, 44, 44);
    });
    try {
      const screen = await preview({ scenarioId: "5b" });
      await fireEvent.press(screen.getByLabelText("아침 산책 20분 더보기"));
      await fireEvent.press(screen.getByText("수정하기"));
      expect(screen.getByLabelText("일정 제목").props.value).toBe("아침 산책 20분");
      await fireEvent.press(screen.getByLabelText("닫기"));

      await fireEvent.press(screen.getByLabelText("아침 산책 20분 더보기"));
      await fireEvent.press(screen.getByText("삭제하기"));
      expect(screen.getByText("이 일정을 삭제할까요?")).toBeTruthy();
      await fireEvent.press(screen.getByText("삭제"));
      expect(screen.queryByText("아침 산책 20분")).toBeNull();
    } finally {
      measure.mockRestore();
    }
  });
});
