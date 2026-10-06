import { render, act, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import Splash from "../index";

import { fetchMe } from "@/features/auth/data/meApi";
import { SESSION_KEY, useAuth } from "@/features/auth/model/auth";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock("expo-splash-screen", () => ({ hideAsync: jest.fn(() => Promise.resolve()) }));

// 서버에 못 물어본 것이 기본이다 — 묻는 데 걸리는 시간을 조절하는 경우만 따로 준다
jest.mock("@/features/auth/data/meApi", () => ({
  fetchMe: jest.fn(async () => ({ ok: false, code: "network" })),
}));

type SecureMock = { __store: Map<string, string> };
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const seedSession = () =>
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({
      accessToken: "t",
      refreshToken: "r",
      expiresAt: Date.now() + 60_000,
      userId: 1,
    }),
  );

beforeEach(() => {
  jest.useFakeTimers();
  secure.__store.clear();
  useAuth.setState({ status: "hydrating" });
  useOnboardingCompletion.getState().reset();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

/** 0.8초 하한과 hydration 을 함께 흘려보낸다 */
const settle = async () => {
  await act(async () => {
    jest.advanceTimersByTime(900);
  });
};

describe("S0 · 진입 판정 — 세 갈래", () => {
  it("세션이 없으면 로그인으로", async () => {
    await render(<Splash />);
    await settle();

    await waitFor(() => expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/login"));
  });

  it("세션이 있고 온보딩 전이면 온보딩으로", async () => {
    seedSession();
    await render(<Splash />);
    await settle();

    await waitFor(() => expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/welcome"));
  });

  it("세션이 있고 온보딩을 마쳤으면 홈으로", async () => {
    // 매번 온보딩을 되풀이하지 않는다 — 홈은 이미 있다
    seedSession();
    useOnboardingCompletion.getState().complete();
    await render(<Splash />);
    await settle();

    await waitFor(() => expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home"));
  });

  it("서버가 0.8초보다 늦게 답해도 그 답을 기다렸다가 판정한다", async () => {
    // 개발 서버는 1초 넘게 걸렸다(2026-10-05 실기기) — 하한이 먼저 끝났다고 아직 모르는
    // 완료 여부(기본값 false)로 판정하면, 온보딩을 마친 사람이 온보딩으로 간다
    seedSession();
    jest.mocked(fetchMe).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                data: { userId: 1, onboardingRequired: false, profile: null },
              }),
            1500,
          ),
        ),
    );
    await render(<Splash />);
    await settle();

    expect(jest.mocked(router.replace)).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    await waitFor(() => expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home"));
    expect(jest.mocked(router.replace)).not.toHaveBeenCalledWith("/welcome");
  });

  it("0.8초 하한 전에는 아무 데도 보내지 않는다", async () => {
    // 진행 바 대신 최소 시간을 보장한다 (S0.md) — 워드마크가 번쩍 지나가지 않게
    seedSession();
    await render(<Splash />);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(jest.mocked(router.replace)).not.toHaveBeenCalled();
  });

  it("얼굴 · 워드마크 · 기다림 표시만 그린다 — 글자·버튼·퍼센트가 없다", async () => {
    // 얼굴은 네이티브 스플래시를 이어받고, 워드마크와 기다림 표시는 그 아래에 더해진다(`index.tsx` 머리말)
    const { getByLabelText, getByTestId, queryByText } = await render(<Splash />);

    expect(getByLabelText("모멘토리 · 준비 중")).toBeTruthy();
    expect(getByTestId("splash-mark")).toBeTruthy();
    expect(getByTestId("splash-wordmark")).toBeTruthy();
    expect(getByTestId("splash-waiting")).toBeTruthy();
    expect(queryByText(/로딩|불러오는/)).toBeNull();
    expect(queryByText("모멘토리")).toBeNull();
    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/카카오 로그인|Google 계정으로 로그인|Apple로 로그인/)).toBeNull();
  });

  it("그림이 그려지면 네이티브 스플래시를 내린다", async () => {
    const SplashScreen = jest.requireMock("expo-splash-screen") as { hideAsync: jest.Mock };
    const { getByTestId } = await render(<Splash />);

    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    await fireEvent(getByTestId("splash-mark"), "load");
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });
});

describe("온보딩 완료 플래그 — 인증 이후에만 읽는다", () => {
  it("로그아웃하면 함께 지운다", async () => {
    // 남기면 다음 사용자가 남의 완료 상태로 홈에 들어간다
    seedSession();
    useOnboardingCompletion.getState().complete();

    await useAuth.getState().signOut();

    expect(useOnboardingCompletion.getState().completed).toBe(false);
  });

  it("완료 플래그가 있어도 세션이 없으면 로그인으로 간다", async () => {
    useOnboardingCompletion.getState().complete();
    await render(<Splash />);
    await settle();

    await waitFor(() => expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/login"));
  });
});
