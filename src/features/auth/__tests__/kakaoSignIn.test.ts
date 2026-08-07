import { login as kakaoLogin } from "@react-native-seoul/kakao-login";

import { SESSION_KEY, useAuth, type Session } from "../model/auth";

import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

/**
 * 카카오 로그인 한 벌 — **SDK → 서버 교환 → SecureStore** 를 통째로 건다.
 *
 * 세 단계 중 어디서 멈춰도 `authenticated` 가 되면 안 된다는 것이 이 파일의
 * 주제다(`ARCHITECTURE §3-4` — "판단이 안 서면 로그인 화면이다"). 그래서
 * 데이터 경계를 목으로 갈아끼우지 않고 **네이티브(SDK)와 fetch 만** 막는다.
 */
jest.mock("@react-native-seoul/kakao-login", () => ({ login: jest.fn() }));

jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
  getKakaoAppKey: jest.fn(() => "kakao-key"),
}));

const sdkLogin = jest.mocked(kakaoLogin) as unknown as jest.Mock;

type SecureMock = {
  __store: Map<string, string>;
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const KAKAO_TOKEN = "kakao-access-token-secret";
const SERVER_BODY = {
  accessToken: "momentory-access-secret",
  refreshToken: "momentory-refresh-secret",
  tokenType: "Bearer",
  accessTokenExpiresIn: 3600,
  userId: 42,
  onboardingRequired: true,
};

const respondOk = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

const respondError = (status: number, body: unknown = {}) =>
  ({ ok: false, status, json: async () => body }) as Response;

const setFetch = (impl: () => Promise<Response>) => {
  globalThis.fetch = jest.fn(impl) as unknown as typeof fetch;
};

const storedSession = (): Session | null => {
  const raw = secure.__store.get(SESSION_KEY);
  return raw == null ? null : (JSON.parse(raw) as Session);
};

beforeEach(() => {
  jest.clearAllMocks();
  secure.__store.clear();
  useAuth.setState({ status: "anonymous", signingIn: false, signInError: null });
  useOnboardingCompletion.getState().reset();
  sdkLogin.mockResolvedValue({ accessToken: KAKAO_TOKEN });
  setFetch(async () => respondOk(SERVER_BODY));
});

describe("성공 — 세션이 생긴다", () => {
  it("온보딩이 필요하면 그렇게 말하고 완료 플래그를 내린다", async () => {
    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome).toEqual({ kind: "signed-in", onboardingRequired: true });
    expect(useAuth.getState().status).toBe("authenticated");
    expect(useOnboardingCompletion.getState().completed).toBe(false);
  });

  it("온보딩이 끝난 사용자면 완료 플래그를 서버 답에 맞춘다", async () => {
    // 이 기기에 남아 있던 로컬 플래그가 아니라 **서버가 정본**이다
    setFetch(async () => respondOk({ ...SERVER_BODY, onboardingRequired: false }));

    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome).toEqual({ kind: "signed-in", onboardingRequired: false });
    expect(useOnboardingCompletion.getState().completed).toBe(true);
  });

  it("초 단위 만료를 **절대 시각**으로 바꿔 저장한다", async () => {
    // 상대 시간을 그대로 두면 앱이 꺼져 있던 동안이 셈에서 빠진다
    const now = new Date("2026-08-07T10:00:00Z").getTime();
    jest.spyOn(Date, "now").mockReturnValue(now);

    await useAuth.getState().signInWithKakao();

    expect(storedSession()?.expiresAt).toBe(now + 3600 * 1000);
    jest.mocked(Date.now).mockRestore();
  });

  it("서버가 준 두 토큰만 저장한다 — **카카오 토큰은 기기에 남지 않는다**", async () => {
    await useAuth.getState().signInWithKakao();

    const session = storedSession();
    expect(session).toMatchObject({
      accessToken: "momentory-access-secret",
      refreshToken: "momentory-refresh-secret",
      userId: 42,
    });
    expect(JSON.stringify(session)).not.toContain(KAKAO_TOKEN);
  });

  it("재시작(hydrate) 후에도 유효하다 — 콜드 스타트 왕복", async () => {
    await useAuth.getState().signInWithKakao();

    useAuth.setState({ status: "hydrating" });
    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("authenticated");
  });
});

describe("사용자가 취소했을 때 — 오류가 아니다", () => {
  it("아무 말도 하지 않고 서버로 가지도 않는다", async () => {
    sdkLogin.mockRejectedValue(new Error("ClientFailed(Cancelled): user cancelled login"));

    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome).toEqual({ kind: "cancelled" });
    expect(useAuth.getState().signInError).toBeNull();
    expect(useAuth.getState().status).toBe("anonymous");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("실패 — 어디서 멈춰도 로그인 상태가 되지 않는다", () => {
  it("SDK 가 실패하면 한 줄 안내만 남는다", async () => {
    sdkLogin.mockRejectedValue(new Error("ClientFailed(NotSupported): KakaoTalk not installed"));

    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome.kind).toBe("failed");
    expect(useAuth.getState().signInError).toBe(
      "카카오 로그인을 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    );
    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
  });

  it("토큰 없이 resolve 되는 경로도 실패로 센다", async () => {
    sdkLogin.mockResolvedValue({ accessToken: "" });

    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome.kind).toBe("failed");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("서버가 카카오 토큰을 거절하면(401) 그 사유의 문구를 쓴다", async () => {
    setFetch(async () => respondError(401, { code: "KAKAO_TOKEN_INVALID" }));

    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome).toEqual({
      kind: "failed",
      message: "카카오 로그인 정보가 만료됐어요. 다시 시도해 주세요.",
    });
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("카카오 쪽 장애(502)는 다른 문구다 — 사용자 잘못이 아니라고 말한다", async () => {
    setFetch(async () => respondError(502, { code: "KAKAO_API_SERVER_ERROR" }));

    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome).toEqual({
      kind: "failed",
      message: "카카오 쪽 연결이 잠시 불안정해요. 잠시 뒤 다시 시도해 주세요.",
    });
  });

  it("연결이 끊기면 연결 문구다", async () => {
    setFetch(async () => {
      throw new TypeError("Network request failed");
    });

    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome).toEqual({
      kind: "failed",
      message: "지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
    });
  });

  it("어떤 실패도 상태 코드·서버 메시지를 사용자에게 보이지 않는다", async () => {
    setFetch(async () => respondError(500, { code: "BOOM", message: "stack trace here" }));

    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome.kind).toBe("failed");
    const message = outcome.kind === "failed" ? outcome.message : "";
    expect(message).not.toMatch(/500|BOOM|stack/);
  });

  it("SecureStore 에 저장하지 못하면 로그인으로 치지 않는다", async () => {
    // 메모리에만 있는 세션은 앱을 끄면 사라진다 — 성공했다고 말하지 않는다
    secure.setItemAsync.mockRejectedValueOnce(new Error("keystore unavailable"));

    const outcome = await useAuth.getState().signInWithKakao();

    expect(outcome).toEqual({
      kind: "failed",
      message: "로그인 정보를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    });
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("실패한 뒤에도 잠금이 풀려 다시 시도할 수 있다", async () => {
    setFetch(async () => respondError(503));
    await useAuth.getState().signInWithKakao();

    expect(useAuth.getState().signingIn).toBe(false);

    setFetch(async () => respondOk(SERVER_BODY));
    expect((await useAuth.getState().signInWithKakao()).kind).toBe("signed-in");
  });
});

describe("중복 클릭", () => {
  it("진행 중이면 카카오 창을 다시 열지 않는다", async () => {
    let release: (value: { accessToken: string }) => void = () => {};
    sdkLogin.mockReturnValue(
      new Promise<{ accessToken: string }>((resolve) => {
        release = resolve;
      }),
    );

    const first = useAuth.getState().signInWithKakao();
    const second = await useAuth.getState().signInWithKakao();

    expect(second).toEqual({ kind: "busy" });
    expect(sdkLogin).toHaveBeenCalledTimes(1);

    release({ accessToken: KAKAO_TOKEN });
    expect((await first).kind).toBe("signed-in");
  });

  it("진행 중에는 signingIn 이 켜져 있다 — 버튼이 잠기는 근거", async () => {
    let release: (value: { accessToken: string }) => void = () => {};
    sdkLogin.mockReturnValue(
      new Promise<{ accessToken: string }>((resolve) => {
        release = resolve;
      }),
    );

    const pending = useAuth.getState().signInWithKakao();
    expect(useAuth.getState().signingIn).toBe(true);

    release({ accessToken: KAKAO_TOKEN });
    await pending;
    expect(useAuth.getState().signingIn).toBe(false);
  });
});

describe("로그에 비밀을 남기지 않는다", () => {
  it("성공·실패 어느 쪽도 토큰을 콘솔로 내보내지 않는다", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
      jest.spyOn(console, level).mockImplementation(() => {}),
    );

    await useAuth.getState().signInWithKakao();

    setFetch(async () => respondError(401, { code: "KAKAO_TOKEN_INVALID" }));
    useAuth.setState({ status: "anonymous" });
    await useAuth.getState().signInWithKakao();

    const printed = spies
      .flatMap((spy) => spy.mock.calls)
      .flat()
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
      .join(" ");
    expect(printed).not.toContain(KAKAO_TOKEN);
    expect(printed).not.toContain("momentory-access-secret");
    expect(printed).not.toContain("momentory-refresh-secret");

    spies.forEach((spy) => spy.mockRestore());
  });
});
