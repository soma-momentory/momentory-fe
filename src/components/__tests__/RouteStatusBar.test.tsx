import { render } from "@testing-library/react-native";

import { RouteStatusBar } from "../RouteStatusBar";

let mockPathname = "/retro/confirm";
jest.mock("expo-router", () => ({ usePathname: () => mockPathname }));
jest.mock("expo-status-bar", () => ({
  StatusBar: (props: { style: string }) =>
    jest.requireActual("react").createElement(jest.requireActual("react-native").View, {
      testID: "route-status-bar",
      barStyle: props.style,
    }),
}));

it("회고에서 일기 확인·홈으로 이동하면 밝은 상태바가 남지 않는다", async () => {
  const screen = await render(<RouteStatusBar />);
  expect(screen.getByTestId("route-status-bar").props.barStyle).toBe("light");

  for (const pathname of ["/retro/talk", "/retro/draft", "/retro/talk", "/home"]) {
    mockPathname = pathname;
    await screen.rerender(<RouteStatusBar />);
    expect(screen.getByTestId("route-status-bar").props.barStyle).toBe(
      pathname === "/retro/talk" ? "light" : "dark",
    );
  }
});
