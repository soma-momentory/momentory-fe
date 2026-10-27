import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { PreviewFontScaleContext, Text } from "../../../../src/components/ds/Text";
import { toHomeWeatherView } from "../../../../src/features/home/ui/v2/weatherStickers";
import { HomeV2Preview } from "../HomeV2Preview";
import {
  letterScenarios,
  weatherForScenario,
  weatherScenarios,
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

  it("편지 선택지는 점 있음과 없음 두 가지다", () => {
    expect(letterScenarios.map((item) => item.id)).toEqual(["none", "unread"]);
  });

  it("새 편지가 있으면 편지 아이콘에 점을 찍고, 누르면 안내 한 줄만 띄운다", async () => {
    const onMessage = jest.fn();
    const screen = await preview({ letterId: "unread", onMessage });
    expect(screen.getByTestId("home-v2-unread-dot")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "바바의 편지, 새 편지 있음" }));
    expect(onMessage).toHaveBeenCalledWith("바바의 편지는 Lab에 연결하지 않았습니다.");
  });

  it("새 편지가 없으면 점이 없다", async () => {
    const screen = await preview({ letterId: "none" });
    expect(screen.queryByTestId("home-v2-unread-dot")).toBeNull();
    expect(screen.getByRole("button", { name: "바바의 편지" })).toBeTruthy();
  });

  it.each([1.3, 1.5])(
    "%.1f배 Mock은 공유 DS 글자 크기와 줄 높이를 한 번씩 키운다",
    async (scale) => {
      const normal = await render(<Text variant="body1">긴 문장 확인</Text>);
      const normalStyle = StyleSheet.flatten(normal.getByText("긴 문장 확인").props.style);
      await normal.unmount();

      const large = await render(
        <PreviewFontScaleContext.Provider value={scale}>
          <Text variant="body1">긴 문장 확인</Text>
        </PreviewFontScaleContext.Provider>,
      );
      const largeStyle = StyleSheet.flatten(large.getByText("긴 문장 확인").props.style);
      expect(largeStyle.fontSize).toBeCloseTo(normalStyle.fontSize * scale);
      expect(largeStyle.lineHeight).toBeCloseTo(normalStyle.lineHeight * scale);
      await large.unmount();
    },
  );

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
