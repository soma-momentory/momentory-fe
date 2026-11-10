import { render } from "@testing-library/react-native";
import { useNavigation } from "expo-router";

import TabsLayout from "../_layout";

import { useAuth } from "@/features/auth/model/auth";

/**
 * **탭은 루트 스택의 바닥이다** — 소개 · 로그인 · 온보딩을 지나 들어와도 탭 아래에 남기지 않는다.
 * 남으면 홈에서 기기 뒤로가기가 다시 온보딩으로 간다(2026-11-10 실기기).
 */
jest.mock("expo-router", () => ({
  Redirect: jest.fn(() => null),
  Stack: jest.fn(() => null),
  useNavigation: jest.fn(),
}));
jest.mock("@/features/calendar/model/foregroundSync", () => ({
  syncDeviceCalendar: jest.fn(async () => undefined),
}));
jest.mock("@/features/diary/model/diary", () => ({
  useDiary: { getState: () => ({ load: jest.fn(async () => undefined) }) },
}));

const route = (name: string) => ({ key: `${name}-key`, name });

function withRoot(routes: string[], index: number) {
  const reset = jest.fn();
  const state = { key: "root", index, routes: routes.map(route), type: "stack", stale: false };
  jest.mocked(useNavigation).mockReturnValue({ getState: () => state, reset });
  return reset;
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.setState({ status: "authenticated" });
});

it("온보딩을 마치고 들어오면 탭 아래의 소개 · 온보딩 기록을 걷는다", async () => {
  const reset = withRoot(["intro/start", "intro/feelings", "(tabs)"], 2);

  await render(<TabsLayout />);

  expect(reset).toHaveBeenCalledWith(
    expect.objectContaining({ index: 0, routes: [route("(tabs)")] }),
  );
});

it("탭 위에 이미 올라온 회고(「지금 이야기하기」)는 남긴다", async () => {
  const reset = withRoot(["intro/start", "(tabs)", "retro"], 2);

  await render(<TabsLayout />);

  expect(reset).toHaveBeenCalledWith(
    expect.objectContaining({ index: 1, routes: [route("(tabs)"), route("retro")] }),
  );
});

it("이미 바닥이면 건드리지 않는다", async () => {
  const reset = withRoot(["(tabs)", "my"], 1);

  await render(<TabsLayout />);

  expect(reset).not.toHaveBeenCalled();
});
