import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { homeV2 } from "@/design/ds";

import { AppProviders } from "../providers";

jest.mock("expo-font", () => ({ useFonts: jest.fn() }));
// 지금 보이는 라우트 — 기본은 S0 가 아닌 곳(딥링크로 바로 열린 화면과 같다)
let mockPathname = "/home";
jest.mock("expo-router", () => ({ usePathname: () => mockPathname }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

const mockFonts = (loaded: boolean, error: Error | null = null) => {
  (useFonts as jest.Mock).mockReturnValue([loaded, error]);
};

describe("AppProviders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/home";
  });

  it("폰트가 준비되면 자식을 그린다", async () => {
    mockFonts(true);
    const { getByText } = await render(
      <AppProviders>
        <Text>모멘토리</Text>
      </AppProviders>,
    );

    expect(getByText("모멘토리")).toBeTruthy();
  });

  it("홈도 공통 교보손글씨를 등록된 이름으로 사용한다", async () => {
    // 단일 파일을 regular·bold 별칭으로 함께 사용한다.
    mockFonts(true);
    await render(
      <AppProviders>
        <Text>모멘토리</Text>
      </AppProviders>,
    );

    const table = (useFonts as jest.Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(table)).toEqual(
      expect.arrayContaining([homeV2.font.regular, homeV2.font.bold]),
    );
    expect(homeV2.font).toEqual({
      regular: "KyoboHandwriting2025lyb",
      bold: "KyoboHandwriting2025lyb",
    });
    // 로그인용 고딕 등록도 유지한다.
    expect(Object.keys(table)).toEqual(expect.arrayContaining(["Pretendard-Regular"]));
    expect(Object.keys(table)).toEqual(expect.arrayContaining(["KyoboHandwriting2025lyb"]));
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

  it("S0 에서는 내리지 않는다 — 같은 그림을 그린 S0 가 직접 내린다", async () => {
    // 여기서 먼저 내리면 S0 의 그림이 디코딩되기 전 한 프레임이 빈 면으로 깜빡인다(`app/index.tsx`)
    mockFonts(true);
    mockPathname = "/";
    await render(
      <AppProviders>
        <Text>모멘토리</Text>
      </AppProviders>,
    );

    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });
});
