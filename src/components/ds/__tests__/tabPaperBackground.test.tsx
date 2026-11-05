import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { TabScreen } from "../TabScreen";

jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));

describe("선택한 탭별 종이 배경", () => {
  it.each([
    ["홈", "warm-ivory"],
    ["쉼터", "warm-ivory"],
    ["보관함", "warm-ivory"],
    ["리포트", "warm-ivory"],
    ["마이", "warm-ivory"],
  ] as const)("%s에 선택한 종이 %s를 표시한다", async (tab, assetId) => {
    const screen = await render(
      <TabScreen active={tab}>
        <Text>탭 본문</Text>
      </TabScreen>,
    );

    expect(
      screen.getByTestId(`tab-paper-texture-${assetId}`, { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByText("탭 본문")).toBeTruthy();
  });
});
