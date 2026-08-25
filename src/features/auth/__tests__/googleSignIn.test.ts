import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

import { requestGoogleIdToken } from "../data/googleSdk";
import { SESSION_KEY, useAuth, type Session } from "../model/auth";

import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

/**
 * 구글 로그인 한 벌 — **SDK → 서버 교환 → SecureStore** 를 통째로 건다.
 * 카카오(`kakaoSignIn.test.ts`)·애플(`appleSignIn.test.ts`)과 같은 모양이다.
 *
 * 주제 셋도 같다:
 *
 * 1. **네이티브가 주는 것을 정확히 옮기는가** — 취소·미지원·미설정·실패·토큰
 * 2. **어느 단계에서 멈춰도 `authenticated` 가 되지 않는가** — SDK·서버·저장
 * 3. **구글 토큰이 기기에 남지 않는가** — 보내고 버린다
 *
 * 데이터 경계를 목으로 갈아끼우지 않고 **네이티브(SDK)와 fetch 만** 막는다 —
 * 교환 어댑터를 목으로 덮으면 그 계약이 시험에서 빠진다. 어댑터 자체의 계약은
 * `googleAuthApi.test.ts` 가 따로 건다.
 *
 * SDK 목은 **`jest.setup.ts` 의 전역 목**이다 — 이 라이브러리는 import 하는
 * 순간 네이티브를 찾아서, 목이 없으면 `auth.ts` 를 스치는 스위트가 전부 깨진다.
 * 여기서는 그 목의 반환값만 갈아 끼운다.
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
  getKakaoAppKey: jest.fn(() => "kakao-key"),
  getGoogleWebClientId: jest.fn(() => "web.apps.googleusercontent.com"),
  getGoogleIosClientId: jest.fn(() => "ios.apps.googleusercontent.com"),
}));

/** 로그인 뒤 배웅으로 나가는 프로필 조회가 판정에 끼어들지 않게 (계약은 `meApi.test.ts`) */
jest.mock("../data/meApi", () => ({
  fetchMe: jest.fn(async () => ({ ok: false, code: "network" })),
}));

const config = jest.requireMock("@/lib/config") as {
  getGoogleWebClientId: jest.Mock;
  getGoogleIosClientId: jest.Mock;
};

const signIn = jest.mocked(GoogleSignin.signIn);
const hasPlayServices = jest.mocked(GoogleSignin.hasPlayServices);
const configure = jest.mocked(GoogleSignin.configure);
const signOutGoogleSdk = jest.mocked(GoogleSignin.signOut);

type SecureMock = {
  __store: Map<string, string>;
  setItemAsync: jest.Mock;
};
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const ID_TOKEN = "google-id-token-secret";

/** 라이브러리가 성공에 주는 모양 — `type` 으로 취소와 갈린다 */
const successResponse = (idToken: string | null = ID_TOKEN) =>
  ({ type: "success", data: { idToken } }) as unknown as Awaited<
    ReturnType<typeof GoogleSignin.signIn>
  >;

const cancelledResponse = () =>
  ({ type: "cancelled", data: null }) as unknown as Awaited<ReturnType<typeof GoogleSignin.signIn>>;

const errorWithCode = (code: string) => Object.assign(new Error(code), { code });

const UNAVAILABLE = "이 기기에서는 Google 로그인을 쓸 수 없어요. 다른 방법으로 로그인해 주세요.";
const MISCONFIGURED = "지금은 Google 로그인을 쓸 수 없어요. 다른 방법으로 로그인해 주세요.";
const SDK_FAILED = "Google 로그인을 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.";
const TOKEN_INVALID = "Google 로그인 정보가 만료됐어요. 다시 시도해 주세요.";
const UPSTREAM = "Google 쪽 연결이 잠시 불안정해요. 잠시 뒤 다시 시도해 주세요.";
const STORE_FAILED = "로그인 정보를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

/** 서버가 내주는 한 벌 — **카카오·애플과 글자 그대로 같다** */
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
  const fn = jest.fn(impl);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
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
  config.getGoogleWebClientId.mockReturnValue("web.apps.googleusercontent.com");
  config.getGoogleIosClientId.mockReturnValue("ios.apps.googleusercontent.com");
  hasPlayServices.mockResolvedValue(true);
  signIn.mockResolvedValue(successResponse());
  setFetch(async () => respondOk(SERVER_BODY));
  // 개발 빌드의 진단 줄이 테스트 출력을 덮지 않게
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("SDK 경계 — 네이티브가 주는 것을 다섯 갈래로 옮긴다", () => {
  it("ID token 을 그대로 옮긴다", async () => {
    expect(await requestGoogleIdToken()).toEqual({ kind: "id-token", idToken: ID_TOKEN });
  });

  it("웹 클라이언트 ID 를 SDK 에 넘긴다 — Android 의 aud 가 이 값이다", async () => {
    await requestGoogleIdToken();

    expect(configure).toHaveBeenCalledWith(
      expect.objectContaining({
        webClientId: "web.apps.googleusercontent.com",
        iosClientId: "ios.apps.googleusercontent.com",
      }),
    );
  });

  it("iOS 클라이언트 ID 가 비면 아예 넘기지 않는다 — 빈 문자열을 ID 로 알아듣지 않게", async () => {
    config.getGoogleIosClientId.mockReturnValue("");

    await requestGoogleIdToken();

    expect(configure).toHaveBeenCalledWith(
      expect.not.objectContaining({ iosClientId: expect.anything() }),
    );
  });

  it("취소는 응답으로 온다 — 문구를 보지 않는다", async () => {
    signIn.mockResolvedValue(cancelledResponse());

    expect(await requestGoogleIdToken()).toEqual({ kind: "cancelled" });
  });

  it("취소 코드로 던지는 경우도 취소다", async () => {
    signIn.mockRejectedValue(errorWithCode(statusCodes.SIGN_IN_CANCELLED));

    expect(await requestGoogleIdToken()).toEqual({ kind: "cancelled" });
  });

  it("시트가 이미 열려 있으면 취소로 접는다 — 열린 시트가 곧 안내다", async () => {
    signIn.mockRejectedValue(errorWithCode(statusCodes.IN_PROGRESS));

    expect(await requestGoogleIdToken()).toEqual({ kind: "cancelled" });
  });

  it("Play 서비스가 없으면 unavailable 이다", async () => {
    hasPlayServices.mockRejectedValue(errorWithCode(statusCodes.PLAY_SERVICES_NOT_AVAILABLE));

    expect(await requestGoogleIdToken()).toEqual({ kind: "unavailable" });
  });

  it("웹 클라이언트 ID 가 비면 시트를 열지도 않는다 — 열어도 낼 토큰이 없다", async () => {
    config.getGoogleWebClientId.mockReturnValue("");

    expect(await requestGoogleIdToken()).toEqual({ kind: "unconfigured" });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("ID token 이 비어 오면 실패다 — 빈 토큰을 서버로 보내지 않는다", async () => {
    signIn.mockResolvedValue(successResponse(null));

    expect(await requestGoogleIdToken()).toEqual({ kind: "failed" });
  });

  it("그 밖의 오류는 실패다 — 던지지 않는다", async () => {
    signIn.mockRejectedValue(new Error("network is unreachable"));

    expect(await requestGoogleIdToken()).toEqual({ kind: "failed" });
  });
});

describe("서버 교환 — 보내는 것은 ID token 하나뿐이다", () => {
  it("성공하면 세션이 눕고 authenticated 가 된다", async () => {
    const outcome = await useAuth.getState().signInWithGoogle();

    expect(outcome).toEqual({ kind: "signed-in", onboardingRequired: true });
    expect(useAuth.getState().status).toBe("authenticated");
    expect(storedSession()).toMatchObject({
      accessToken: "momentory-access-secret",
      refreshToken: "momentory-refresh-secret",
      userId: 42,
    });
  });

  it("본문에 idToken 하나만 싣는다 — nonce 는 계약에 없다", async () => {
    const fetchMock = setFetch(async () => respondOk(SERVER_BODY));

    await useAuth.getState().signInWithGoogle();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/auth/google");
    expect(JSON.parse(init.body as string)).toEqual({ idToken: ID_TOKEN });
  });

  it("구글 토큰은 기기에 남지 않는다 — 보내고 버린다", async () => {
    await useAuth.getState().signInWithGoogle();

    expect(JSON.stringify(storedSession())).not.toContain(ID_TOKEN);
    const written = secure.setItemAsync.mock.calls.map(([, value]) => String(value)).join("");
    expect(written).not.toContain(ID_TOKEN);
  });
});

describe("어느 단계에서 멈춰도 authenticated 가 되지 않는다", () => {
  it("사용자가 취소하면 조용하다 — 안내 한 줄도 뜨지 않는다", async () => {
    signIn.mockResolvedValue(cancelledResponse());

    expect(await useAuth.getState().signInWithGoogle()).toEqual({ kind: "cancelled" });
    expect(useAuth.getState().status).toBe("anonymous");
    expect(useAuth.getState().signInError).toBeNull();
  });

  it("Play 서비스가 없으면 그 사유의 문구가 뜬다", async () => {
    hasPlayServices.mockRejectedValue(errorWithCode(statusCodes.PLAY_SERVICES_NOT_AVAILABLE));

    expect(await useAuth.getState().signInWithGoogle()).toEqual({
      kind: "failed",
      message: UNAVAILABLE,
    });
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("클라이언트 ID 누락은 미지원과 다른 문구다 — 우리가 고칠 때까지 같다", async () => {
    config.getGoogleWebClientId.mockReturnValue("");

    expect(await useAuth.getState().signInWithGoogle()).toEqual({
      kind: "failed",
      message: MISCONFIGURED,
    });
  });

  it("SDK 가 실패하면 서버를 부르지 않는다", async () => {
    signIn.mockRejectedValue(new Error("boom"));
    const fetchMock = setFetch(async () => respondOk(SERVER_BODY));

    expect(await useAuth.getState().signInWithGoogle()).toEqual({
      kind: "failed",
      message: SDK_FAILED,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("서버가 401 로 거절하면 세션이 눕지 않는다", async () => {
    setFetch(async () => respondError(401, { code: "GOOGLE_TOKEN_INVALID" }));

    expect(await useAuth.getState().signInWithGoogle()).toEqual({
      kind: "failed",
      message: TOKEN_INVALID,
    });
    expect(useAuth.getState().status).toBe("anonymous");
    expect(storedSession()).toBeNull();
  });

  it("구글 쪽 장애(502)는 우리 잘못도 사용자 잘못도 아니라고 말한다", async () => {
    setFetch(async () => respondError(502, { code: "GOOGLE_API_SERVER_ERROR" }));

    expect(await useAuth.getState().signInWithGoogle()).toEqual({
      kind: "failed",
      message: UPSTREAM,
    });
  });

  it("기기에 남기지 못하면 로그인으로 치지 않는다", async () => {
    secure.setItemAsync.mockRejectedValueOnce(new Error("disk full"));

    expect(await useAuth.getState().signInWithGoogle()).toEqual({
      kind: "failed",
      message: STORE_FAILED,
    });
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("자물쇠는 카카오·애플과 하나다 — 진행 중이면 시트를 열지 않는다", async () => {
    useAuth.setState({ signingIn: true });

    expect(await useAuth.getState().signInWithGoogle()).toEqual({ kind: "busy" });
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("로그아웃 — 구글이 기기에 남긴 상태도 비운다", () => {
  it("계정 선택을 다시 볼 수 있게 SDK 의 로그인 상태를 지운다", async () => {
    await useAuth.getState().signInWithGoogle();
    signOutGoogleSdk.mockClear();

    await useAuth.getState().signOut();

    expect(signOutGoogleSdk).toHaveBeenCalled();
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("SDK 가 실패해도 로그아웃은 끝난다 — 실패할 수 없는 동작으로 둔다", async () => {
    await useAuth.getState().signInWithGoogle();
    signOutGoogleSdk.mockRejectedValueOnce(new Error("boom"));

    await useAuth.getState().signOut();

    expect(useAuth.getState().status).toBe("anonymous");
    expect(storedSession()).toBeNull();
  });
});
