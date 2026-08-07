import { render, waitFor } from "@testing-library/react-native";
import { Redirect, Stack } from "expo-router";

import OnboardingLayout from "../_layout";

import { SESSION_KEY, useAuth } from "@/features/auth/model/auth";

/**
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`) — S0 의 진입 판정
 * 한 번으로 끝내지 않고, 레이아웃이 세션 없는 진입을 무조건 되돌린다.
 */
jest.mock("expo-router", () => ({
  Redirect: jest.fn(() => null),
  Stack: jest.fn(() => null),
}));

type SecureMock = { __store: Map<string, string> };
const secure = jest.requireMock("expo-secure-store") as SecureMock;

beforeEach(() => {
  secure.__store.clear();
  jest.clearAllMocks();
});

it("세션이 없으면 무조건 로그인으로 되돌린다 — 딥링크도 여기서 막힌다", async () => {
  useAuth.setState({ status: "anonymous" });

  await render(<OnboardingLayout />);

  expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
    expect.objectContaining({ href: "/login" }),
    undefined,
  );
  expect(jest.mocked(Stack)).not.toHaveBeenCalled();
});

it("authenticated 면 스택을 그린다", async () => {
  useAuth.setState({ status: "authenticated" });

  await render(<OnboardingLayout />);

  expect(jest.mocked(Stack)).toHaveBeenCalled();
  expect(jest.mocked(Redirect)).not.toHaveBeenCalled();
});

it("S0 을 건너뛴 콜드 스타트 — 스스로 hydrate 를 돌려 판정한다", async () => {
  // 유효한 세션이 있는 기기에서 딥링크로 바로 들어온 경우
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({
      accessToken: "t",
      refreshToken: "r",
      expiresAt: Date.now() + 60_000,
      userId: 1,
    }),
  );
  useAuth.setState({ status: "hydrating" });

  const r = await render(<OnboardingLayout />);

  // 판정 전에는 보호 라우트를 그리지 않는다
  expect(r.toJSON()).toBeNull();
  await waitFor(() => expect(useAuth.getState().status).toBe("authenticated"));
  await waitFor(() => expect(jest.mocked(Stack)).toHaveBeenCalled());
});
