import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { AppProviders } from "../providers";

jest.mock("expo-font", () => ({ useFonts: jest.fn() }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

const mockFonts = (loaded: boolean, error: Error | null = null) => {
  (useFonts as jest.Mock).mockReturnValue([loaded, error]);
};

describe("AppProviders", () => {
  beforeEach(() => jest.clearAllMocks());

  it("폰트가 준비되면 자식을 그린다", async () => {
    mockFonts(true);
    const { getByText } = await render(
      <AppProviders>
        <Text>모멘토리</Text>
      </AppProviders>,
    );

    expect(getByText("모멘토리")).toBeTruthy();
  });

  it("폰트를 기다리는 동안은 아무것도 그리지 않는다", async () => {
    // 여기서 무언가를 그리면 시스템 서체로 한 번 그렸다가 바뀌며 깜빡인다.
    mockFonts(false);
    const { queryByText } = await render(
      <AppProviders>
        <Text>모멘토리</Text>
      </AppProviders>,
    );

    expect(queryByText("모멘토리")).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it("폰트 로딩이 실패해도 앱을 붙잡아두지 않는다", async () => {
    // 시스템 서체로라도 뜬다 — 서체 때문에 앱이 안 열리는 일은 없다.
    mockFonts(false, new Error("otf 없음"));
    const { getByText } = await render(
      <AppProviders>
        <Text>모멘토리</Text>
      </AppProviders>,
    );

    expect(getByText("모멘토리")).toBeTruthy();
  });

  it("준비가 끝나면 스플래시를 내린다", async () => {
    mockFonts(true);
    await render(
      <AppProviders>
        <Text>모멘토리</Text>
      </AppProviders>,
    );

    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });
});
