import { render, act, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import Splash from "../index";

import { SESSION_KEY, useAuth } from "@/features/auth/model/auth";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
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

  it("0.8초 하한 전에는 아무 데도 보내지 않는다", async () => {
    // 진행 바 대신 최소 시간을 보장한다 (S0.md)
    seedSession();
    await render(<Splash />);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(jest.mocked(router.replace)).not.toHaveBeenCalled();
  });

  it("로그인과 같은 워드마크·태그라인을 같은 자리에 둔다", async () => {
    // `S0` → `S1` 이 깜빡이지 않게 **같은 문안·같은 블록**을 쓴다(`index.tsx` 머리말).
    // 옛 슬로건(「오늘도 잠시 쉬어가도 괜찮아요.」)은 캐릭터와 함께 사라졌다
    const { getByText } = await render(<Splash />);

    expect(getByText("모멘토리")).toBeTruthy();
    expect(getByText("오늘을 돌아보고, 내일을 조금 다르게.")).toBeTruthy();
  });

  it("진행 바·퍼센트·로딩 문구를 두지 않는다 — 기다림 표시 하나다", async () => {
    const { getByLabelText, queryByText } = await render(<Splash />);

    expect(getByLabelText("준비 중")).toBeTruthy();
    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/로딩|불러오는/)).toBeNull();
  });

  it("로그인 버튼을 두지 않는다 — 아직 무엇을 누를지 정하기 전이다", async () => {
    const { queryByText } = await render(<Splash />);

    expect(queryByText(/카카오로 계속하기|Google로 계속하기|Apple로 계속하기/)).toBeNull();
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
