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

  it("소셜 3종 순서가 시안대로 카카오 → Google → Apple 이다", async () => {
    const { getAllByRole } = await render(<Login />);
    const buttons = getAllByRole("button");

    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => within(b).getByText(/계속하기$/).props.children)).toEqual([
      "카카오로 계속하기",
      "Google로 계속하기",
      "Apple로 계속하기",
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

    await fireEvent.press(getByText("카카오로 계속하기"));

    expect(signIn).not.toHaveBeenCalled();
  });
});
