import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
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

// 애플 로그인도 네이티브다. 화면 테스트는 store 의 갈래를 목으로 갈아끼우므로
// 여기까지 내려가지 않지만, import 사슬이 네이티브 모듈에 닿는다
// (갈래 자체는 `features/auth/__tests__/appleSignIn.test.ts`)
jest.mock("expo-apple-authentication", () => ({
  __esModule: true,
  isAvailableAsync: jest.fn(async () => false),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

// 앱 안 브라우저는 네이티브다 — 약관 줄이 무엇을 여는지만 본다
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(() => Promise.resolve()) }));
const browser = jest.requireMock("expo-web-browser") as { openBrowserAsync: jest.Mock };

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

    await fireEvent.press(getByText("카카오 로그인"));

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("온보딩을 마친 사용자는 홈으로 보낸다", async () => {
    mockSignIn({ kind: "signed-in", onboardingRequired: false });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("카카오 로그인"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });

  it("취소하면 화면을 옮기지도, 아무 말도 하지 않는다", async () => {
    const signIn = mockSignIn({ kind: "cancelled" });
    const { getByText, queryByText } = await render(<Login />);

    await fireEvent.press(getByText("카카오 로그인"));

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(queryByText(/다시 시도/)).toBeNull();
  });
});

describe("애플 버튼 — 카카오와 같은 자리로 연결돼 있다", () => {
  /**
   * 화면은 **어느 공급자가 무엇을 못 하는지 모른다.** 지금 애플은 서버 교환이
   * 없어 `signed-in` 이 나오지 않지만(`DISCUSSION.md` §1-8), 그때 화면이 할 일은
   * 카카오와 똑같다 — 여기서 거는 것은 그 「똑같음」이다.
   */
  const mockApple = (outcome: SignInOutcome) => {
    const signIn = jest.fn(async () => outcome);
    useAuth.setState({ signInWithApple: signIn });
    return signIn;
  };

  it("누르면 애플 로그인을 부른다 — 개발 통로(가짜 세션)를 지나지 않는다", async () => {
    const signIn = mockApple({ kind: "failed", message: "애플 로그인은 아직 준비 중이에요." });
    const dev = jest.fn(async () => {});
    useAuth.setState({ signInDev: dev });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("Apple로 로그인"));

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(dev).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("세션이 생기면 카카오와 같은 곳으로 보낸다", async () => {
    mockApple({ kind: "signed-in", onboardingRequired: false });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("Apple로 로그인"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });

  it("취소하면 화면을 옮기지 않는다", async () => {
    mockApple({ kind: "cancelled" });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("Apple로 로그인"));

    await waitFor(() => expect(replace).not.toHaveBeenCalled());
  });

  /**
   * **릴리스에서도 열려 있다** — 서버 교환이 붙으면서 잠금을 지웠다 (2026-08-24 ·
   * `DISCUSSION.md` §1-10 · 옛 `isAppleLineOpen`).
   *
   * 잠가 두었던 이유는 「애플이 이름·이메일을 첫 인가 한 번만 주는데 받아 둘
   * 서버가 없다」였다. 서버가 그 값을 **identity token 안에서** 읽으므로 태울
   * 한 번이 없어졌다(`appleAuthApi.ts` 머리말).
   *
   * **빌드 종류로 갈리지 않는 것을 고정한다** — 전역 `__DEV__` 를 릴리스로
   * 바꿔도 애플 줄은 카카오와 같이 열려 있어야 한다. 잠금이 조용히 되살아나면
   * iOS 심사가 요구하는 줄(심사 규정 4.8)이 운영에서 눌리지 않는다.
   */
  it("빌드 종류로 갈리지 않는다 — 릴리스에서도 카카오와 같이 열려 있다", async () => {
    const globals = globalThis as unknown as { __DEV__: boolean };
    const wasDev = globals.__DEV__;
    globals.__DEV__ = false;

    try {
      const { getAllByRole } = await render(<Login />);
      const [kakao, google, apple] = getAllByRole("button");

      expect(apple!.props.accessibilityState.disabled).toBe(false);
      expect(kakao!.props.accessibilityState.disabled).toBe(false);
      // ✅ **구글 줄도 이제 여기 있다.** 전에는 볼 수 없었다 — 그 줄의 `disabled`
      // 가 모듈 로드 시점에 붙잡은 `DEV_SKIP_AUTH` 에 걸려 있어서, 전역만 바꾸는
      // 이 테스트에는 릴리스로 보이지 않았다. 개발 통로가 버튼을 떠나면서
      // (워드마크 길게 누르기) 세 줄의 잠금 조건이 같아졌다
      expect(google!.props.accessibilityState.disabled).toBe(false);
    } finally {
      globals.__DEV__ = wasDev;
    }
  });

  it("진행 중이면 잠긴다 — 카카오와 자물쇠를 나눠 쓴다", async () => {
    const signIn = mockApple({ kind: "signed-in", onboardingRequired: true });
    useAuth.setState({ signingIn: true });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("Apple로 로그인"));

    expect(signIn).not.toHaveBeenCalled();
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

    await fireEvent.press(getByText("카카오 로그인"));

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

describe("Google 버튼 — 실제 로그인에 연결돼 있다", () => {
  /**
   * ⚠ **이 줄은 개발 통로였다.** SDK 가 없던 동안 `signInDev` 로 가짜 세션을
   * 만들어 온보딩으로 건너뛰는 자리였는데, 실제 로그인이 붙으면서 카카오·애플과
   * 같아졌다. 개발 통로는 **워드마크 길게 누르기**로 옮겼다 — 아래에서 따로 건다.
   */
  const mockGoogle = (outcome: SignInOutcome) => {
    const signIn = jest.fn(async () => outcome);
    useAuth.setState({ signInWithGoogle: signIn });
    return signIn;
  };

  it("누르면 구글 로그인을 부른다 — 개발 통로(가짜 세션)를 지나지 않는다", async () => {
    const signIn = mockGoogle({ kind: "signed-in", onboardingRequired: true });
    const dev = jest.fn(async () => {});
    useAuth.setState({ signInDev: dev });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("Google 계정으로 로그인"));

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(dev).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("온보딩을 마친 사용자는 홈으로 보낸다", async () => {
    mockGoogle({ kind: "signed-in", onboardingRequired: false });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("Google 계정으로 로그인"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });

  it("취소하면 화면을 옮기지 않는다", async () => {
    mockGoogle({ kind: "cancelled" });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("Google 계정으로 로그인"));

    await waitFor(() => expect(replace).not.toHaveBeenCalled());
  });
});

describe("개발 통로 — 버튼이 아니라 워드마크에 있다", () => {
  it("워드마크를 길게 누르면 가짜 세션으로 온보딩에 들어간다", async () => {
    const dev = jest.fn(async () => {});
    useAuth.setState({ signInDev: dev });
    const { getByText } = await render(<Login />);

    await fireEvent(getByText("모멘토리"), "longPress");

    await waitFor(() => expect(dev).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("짧게 누르면 아무 일도 없다 — 워드마크는 버튼이 아니다", async () => {
    const dev = jest.fn(async () => {});
    useAuth.setState({ signInDev: dev });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("모멘토리"));

    expect(dev).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("소셜 줄은 여전히 셋뿐이다 — 개발용 컨트롤을 새로 두지 않았다", async () => {
    const { getAllByRole } = await render(<Login />);

    expect(getAllByRole("button")).toHaveLength(3);
  });
});

describe("Momentory DS 이관 — 구조가 바뀌었다", () => {
  it("브랜드는 워드마크 + 태그라인 한 줄이다 — 캐릭터·제목 2줄·소개 3덩어리는 사라졌다", async () => {
    const { getByText, queryByText, queryByLabelText } = await render(<Login />);

    expect(getByText("모멘토리")).toBeTruthy();
    expect(getByText("오늘을 돌아보고, 내일을 조금 다르게.")).toBeTruthy();

    // 반입 패키지가 캐릭터 일러스트를 전부 뺐다 (EXPORT_MANIFEST §5)
    expect(queryByLabelText("바바")).toBeNull();
    expect(queryByText(/돌아보는 작은 쉼터/)).toBeNull();
    expect(queryByText(/매일 쓰지 않아도/)).toBeNull();
  });

  /**
   * 순서와 **문구**를 함께 건다. 문구는 우리가 고른 말이 아니라 **각 사 규격이
   * 정한 목록**에서 꺼낸 것이라(2026-08-24 · `login.tsx` 주석), 「…로 계속하기」로
   * 다시 통일하려는 다음 사람을 여기서 멈춘다.
   */
  it("소셜 3종 순서가 시안대로 카카오 → Google → Apple 이다", async () => {
    const { getAllByRole } = await render(<Login />);
    const buttons = getAllByRole("button");

    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => within(b).getByText(/카카오|Google|Apple/).props.children)).toEqual([
      "카카오 로그인",
      "Google 계정으로 로그인",
      "Apple로 로그인",
    ]);
  });

  // 약관 줄은 옛 화면에도 새 시안에도 있는 슬롯이라 **문안 정본(docs/spec/screens/S1.md)**
  // 을 따른다 — 시안의 「계속하면 서비스 이용약관과…」로 바꾸지 않았다
  it("약관 문안은 정본 그대로다 — 「로그인하면」이 동의가 걸리는 행위를 가리킨다", async () => {
    const { getByText } = await render(<Login />);

    expect(getByText(/로그인하면/)).toBeTruthy();
    expect(getByText("이용약관")).toBeTruthy();
    expect(getByText("개인정보 처리방침")).toBeTruthy();
    expect(getByText(/마이에서 언제든 다시 확인할 수 있어요/)).toBeTruthy();
  });

  it("약관 두 줄이 각자의 원문을 앱 안에서 연다", async () => {
    // 2026-08-21 — 랜딩 페이지가 생겨 눌리게 됐다. 주소는 `src/lib/links.ts` 가 안다
    const { getByText } = await render(<Login />);

    for (const [label, path] of [
      ["이용약관", "/terms"],
      ["개인정보 처리방침", "/privacy"],
    ] as const) {
      browser.openBrowserAsync.mockClear();
      await fireEvent.press(getByText(label));

      await waitFor(() => expect(browser.openBrowserAsync).toHaveBeenCalledTimes(1));
      expect(browser.openBrowserAsync.mock.calls[0]![0]).toContain(path);
    }
  });

  it("약관 줄은 버튼이 아니라 링크다 — 이 화면에서 「버튼」은 소셜 3종뿐이다", async () => {
    const { getAllByRole } = await render(<Login />);

    expect(getAllByRole("button")).toHaveLength(3);
    expect(getAllByRole("link")).toHaveLength(2);
  });

  it("동의 체크박스를 두지 않는다 — 로그인 행위가 동의다", async () => {
    const { queryByRole } = await render(<Login />);
    expect(queryByRole("checkbox")).toBeNull();
  });
});

describe("중복 클릭", () => {
  it("진행 중이면 버튼이 잠긴다 — 두 번째 누름이 로그인을 다시 부르지 않는다", async () => {
    const signIn = mockSignIn({ kind: "signed-in", onboardingRequired: true });
    useAuth.setState({ signingIn: true });
    const { getByText } = await render(<Login />);

    await fireEvent.press(getByText("카카오 로그인"));

    expect(signIn).not.toHaveBeenCalled();
  });
});
