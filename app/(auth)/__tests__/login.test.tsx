import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import Login from "../login";

import { useAuth, type SignInOutcome } from "@/features/auth/model/auth";

/**
 * `S1` — 카카오 버튼이 실제 로그인에 닿는가, 그리고 **실패가 화면을 어지럽히지
 * 않는가**(`RULES.md` 4 — 한 줄 안내 · 모달 금지).
 *
 * 로그인 자체의 갈래는 `kakaoSignIn.test.ts` 가 건다. 여기서 보는 것은
 * **화면이 그 결과로 무엇을 하는가** 하나다.
 */
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const replace = jest.mocked(router.replace);

const mockSignIn = (outcome: SignInOutcome) => {
  const signIn = jest.fn(async () => outcome);
  useAuth.setState({ signInWithKakao: signIn });
  return signIn;
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.setState({ status: "anonymous", signingIn: false, signInError: null });
});

describe("카카오 버튼 — 실제 로그인에 연결돼 있다", () => {
  it("온보딩이 필요하면 온보딩으로 보낸다", async () => {
    const signIn = mockSignIn({ kind: "signed-in", onboardingRequired: true });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("카카오로 계속하기"));

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("온보딩을 마친 사용자는 홈으로 보낸다", async () => {
    mockSignIn({ kind: "signed-in", onboardingRequired: false });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("카카오로 계속하기"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });

  it("취소하면 화면을 옮기지도, 아무 말도 하지 않는다", async () => {
    const signIn = mockSignIn({ kind: "cancelled" });
    const { getByText, queryByText } = await render(<Login />);

    await fireEvent.press(getByText("카카오로 계속하기"));

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(queryByText(/다시 시도/)).toBeNull();
  });
});

describe("실패 안내 — 한 줄로 흡수한다", () => {
  it("store 가 든 문구를 그대로 한 줄로 놓고, 화면을 옮기지 않는다", async () => {
    const message = "지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.";
    const signIn = jest.fn(async (): Promise<SignInOutcome> => {
      // 실패 문구는 store 상태를 따라 그려진다 — 화면이 문구를 따로 짓지 않는다
      useAuth.setState({ signInError: message });
      return { kind: "failed", message };
    });
    useAuth.setState({ signInWithKakao: signIn });
    const { getByText, queryByText } = await render(<Login />);

    await fireEvent.press(getByText("카카오로 계속하기"));

    await waitFor(() => expect(getByText(message)).toBeTruthy());
    expect(replace).not.toHaveBeenCalled();
    // 모달도 재시도 버튼도 두지 않는다
    expect(queryByText("다시 시도하기")).toBeNull();
  });

  it("실패 전에는 안내 줄이 없다", async () => {
    const { queryByText } = await render(<Login />);

    expect(queryByText(/다시 시도해 주세요/)).toBeNull();
  });
});

describe("중복 클릭", () => {
  it("진행 중이면 버튼이 잠긴다 — 두 번째 누름이 로그인을 다시 부르지 않는다", async () => {
    const signIn = mockSignIn({ kind: "signed-in", onboardingRequired: true });
    useAuth.setState({ signingIn: true });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("카카오로 계속하기"));

    expect(signIn).not.toHaveBeenCalled();
  });
});
