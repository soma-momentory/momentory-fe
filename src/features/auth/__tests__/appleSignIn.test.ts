import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

import { requestAppleCredential } from "../data/appleSdk";
import { SESSION_KEY, useAuth, type Session } from "../model/auth";

import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

/**
 * 애플 로그인 한 벌 (2026-08-24 · **교환 연결 뒤 갱신**) — **SDK → 서버 교환 →
 * SecureStore** 를 통째로 건다. 이제 카카오(`kakaoSignIn.test.ts`)와 같은 모양이다.
 *
 * 비어 있던 가운데 칸이 찼으므로(`POST /api/v1/auth/apple` · `DISCUSSION.md`
 * §1-10) 주제도 바뀌었다:
 *
 * 1. **네이티브가 주는 것을 정확히 옮기는가** — 취소·미지원·실패·credential
 * 2. **어느 단계에서 멈춰도 `authenticated` 가 되지 않는가** — SDK·서버·저장
 * 3. **애플 토큰이 기기에 남지 않는가** — 보내고 버린다
 *
 * 데이터 경계를 목으로 갈아끼우지 않고 **네이티브(SDK)와 fetch 만** 막는다 —
 * 카카오와 같은 이유다(교환 어댑터를 목으로 덮으면 그 계약이 시험에서 빠진다).
 * 어댑터 자체의 계약은 `appleAuthApi.test.ts` 가 따로 건다.
 */
jest.mock("expo-apple-authentication", () => ({
  __esModule: true,
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

/**
 * `expo-crypto` 도 네이티브다. **결정적인 값으로 고정한다** — nonce 는 매번 달라야
 * 하지만(그 성질은 아래에서 따로 건다) 무엇이 어디로 가는지를 보려면 값이 정해져
 * 있어야 한다. 해시는 진짜 SHA-256 이 아니라 「원문에 접두를 붙인 것」이다:
 * **원문과 해시가 뒤바뀌면 즉시 눈에 띄게** 하려는 것이다.
 */
jest.mock("expo-crypto", () => ({
  __esModule: true,
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  getRandomBytesAsync: jest.fn(async (n: number) => new Uint8Array(n).fill(0xab)),
  digestStringAsync: jest.fn(async (_algorithm: string, data: string) => `sha256(${data})`),
}));

jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
  getKakaoAppKey: jest.fn(() => "kakao-key"),
}));

/** 로그인 뒤 배웅으로 나가는 프로필 조회가 판정에 끼어들지 않게 (계약은 `meApi.test.ts`) */
jest.mock("../data/meApi", () => ({
  fetchMe: jest.fn(async () => ({ ok: false, code: "network" })),
}));

const isAvailable = jest.mocked(AppleAuthentication.isAvailableAsync);
const signIn = jest.mocked(AppleAuthentication.signInAsync);
const randomBytes = jest.mocked(Crypto.getRandomBytesAsync);

/** 위 목이 주는 난수 32바이트(전부 `0xab`)의 hex — nonce 의 **원문**이다 */
const NONCE_RAW = "ab".repeat(32);
/** 애플에게 가는 값 — 원문의 해시다 */
const NONCE_HASHED = `sha256(${NONCE_RAW})`;

type SecureMock = {
  __store: Map<string, string>;
  setItemAsync: jest.Mock;
};
const secure = jest.requireMock("expo-secure-store") as SecureMock;

/** 애플이 주는 한 벌. 이름·이메일은 **첫 인가에서만** 온다 */
const CREDENTIAL = {
  user: "001234.abcdef.0000",
  state: null,
  fullName: {
    namePrefix: null,
    givenName: "지현",
    middleName: null,
    familyName: "김",
    nameSuffix: null,
    nickname: null,
  },
  email: "someone@privaterelay.appleid.com",
  realUserStatus: 2,
  identityToken: "apple-identity-token-secret",
  authorizationCode: "apple-auth-code-secret",
} as unknown as AppleAuthentication.AppleAuthenticationCredential;

/** 라이브러리가 취소에 붙이는 코드 — 카카오와 달리 문구를 볼 필요가 없다 */
const cancelled = () =>
  Object.assign(new Error("The user canceled"), { code: "ERR_REQUEST_CANCELED" });

const UNAVAILABLE = "이 기기에서는 애플 로그인을 쓸 수 없어요. 다른 방법으로 로그인해 주세요.";
const SDK_FAILED = "애플 로그인을 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.";
const TOKEN_INVALID = "애플 로그인 정보가 만료됐어요. 다시 시도해 주세요.";
const EMAIL_UNAVAILABLE =
  "애플 계정 이메일을 확인할 수 없어요. 애플 ID 설정에서 이메일 공유를 켠 뒤 다시 시도해 주세요.";
const STORE_FAILED = "로그인 정보를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

/** 서버가 내주는 한 벌 — **카카오와 글자 그대로 같다**(`loginSession.ts` 가 함께 검사한다) */
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
  isAvailable.mockResolvedValue(true);
  signIn.mockResolvedValue(CREDENTIAL);
  setFetch(async () => respondOk(SERVER_BODY));
  // 개발 빌드의 진단 줄이 테스트 출력을 덮지 않게 — 남기는지 여부는 아래에서 따로 본다
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("SDK 경계 — 네이티브가 주는 것을 네 갈래로 옮긴다", () => {
  it("credential 을 그대로 옮긴다 — 이름은 애플이 채운 순서(성 → 이름)로 잇는다", async () => {
    const result = await requestAppleCredential();

    expect(result).toEqual({
      kind: "credential",
      credential: {
        userIdentifier: "001234.abcdef.0000",
        identityToken: "apple-identity-token-secret",
        authorizationCode: "apple-auth-code-secret",
        fullName: "김 지현",
        email: "someone@privaterelay.appleid.com",
        nonce: NONCE_RAW,
      },
    });
  });

  it("이름·이메일은 없을 수 있다 — 재로그인에서는 null 이고 그래도 성공이다", async () => {
    signIn.mockResolvedValue({ ...CREDENTIAL, fullName: null, email: null });

    const result = await requestAppleCredential();

    expect(result).toMatchObject({ kind: "credential" });
    if (result.kind !== "credential") throw new Error("unreachable");
    expect(result.credential.fullName).toBeNull();
    expect(result.credential.email).toBeNull();
    // 호칭은 온보딩 04 가 따로 받으므로 이름이 없다고 막지 않는다
    expect(result.credential.identityToken).toBe("apple-identity-token-secret");
  });

  it("이름 조각이 전부 비면 null 이다 — 빈 문자열을 서버로 보내지 않는다", async () => {
    signIn.mockResolvedValue({
      ...CREDENTIAL,
      fullName: { ...CREDENTIAL.fullName!, givenName: " ", familyName: null },
    });

    const result = await requestAppleCredential();

    if (result.kind !== "credential") throw new Error("unreachable");
    expect(result.credential.fullName).toBeNull();
  });

  it("취소는 코드로 가른다 — 문구를 읽지 않는다", async () => {
    signIn.mockRejectedValue(cancelled());

    expect(await requestAppleCredential()).toEqual({ kind: "cancelled" });
  });

  it("이 기기에 애플 로그인이 없으면 시트를 열지도 않는다", async () => {
    isAvailable.mockResolvedValue(false);

    expect(await requestAppleCredential()).toEqual({ kind: "unavailable" });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("가용성 판정 자체가 던져도 「쓸 수 없다」로 닫는다 — 판단이 안 서면 닫는 쪽이다", async () => {
    isAvailable.mockRejectedValue(new Error("native module blew up"));

    expect(await requestAppleCredential()).toEqual({ kind: "unavailable" });
  });

  it("그 밖의 오류는 실패다 — 던지지 않는다", async () => {
    signIn.mockRejectedValue(Object.assign(new Error("nope"), { code: "ERR_REQUEST_FAILED" }));

    expect(await requestAppleCredential()).toEqual({ kind: "failed" });
  });

  it("필수 값이 빠진 credential 은 성공으로 세지 않는다", async () => {
    signIn.mockResolvedValue({ ...CREDENTIAL, identityToken: "  " });

    expect(await requestAppleCredential()).toEqual({ kind: "failed" });
  });

  it("이름·이메일 범위를 요청한다 — 첫 인가에서만 오므로 그 한 번을 놓치지 않는다", async () => {
    await requestAppleCredential();

    expect(signIn).toHaveBeenCalledWith({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: NONCE_HASHED,
    });
  });

  it("애플에는 해시를, 우리에게는 원문을 남긴다 — 규약이 뒤바뀌면 서버가 전부 거절한다", async () => {
    const result = await requestAppleCredential();

    // 애플이 받는 것은 **해시**다. 이 값이 토큰의 nonce 클레임으로 돌아온다
    expect(signIn.mock.calls[0]![0]!.nonce).toBe(NONCE_HASHED);
    // credential 이 드는 것은 **원문**이다 — 서버가 이것을 해시해 맞춰 본다
    expect(result).toEqual(
      expect.objectContaining({
        kind: "credential",
        credential: expect.objectContaining({ nonce: NONCE_RAW }),
      }),
    );
  });

  it("nonce 는 인가마다 새로 만든다 — 재사용하면 막으려던 재생이 된다", async () => {
    await requestAppleCredential();
    randomBytes.mockResolvedValueOnce(new Uint8Array(32).fill(0x01));
    await requestAppleCredential();

    const first = signIn.mock.calls[0]![0]!.nonce;
    const second = signIn.mock.calls[1]![0]!.nonce;
    expect(first).not.toBe(second);
    expect(randomBytes).toHaveBeenCalledTimes(2);
  });

  it("난수를 만들지 못하면 시트를 열지 않는다 — nonce 없는 credential 은 서버가 거절한다", async () => {
    randomBytes.mockRejectedValueOnce(new Error("no entropy"));

    expect(await requestAppleCredential()).toEqual({ kind: "failed" });
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("store — 애플 인가가 모멘토리 세션이 된다", () => {
  it("인가 → 교환 → 저장까지 마치면 로그인이다 — 다음 화면은 서버가 정한다", async () => {
    const outcome = await useAuth.getState().signInWithApple();

    expect(outcome).toEqual({ kind: "signed-in", onboardingRequired: true });
    expect(useAuth.getState().status).toBe("authenticated");
    expect(useAuth.getState().signInError).toBeNull();
    expect(storedSession()).toMatchObject({
      accessToken: "momentory-access-secret",
      refreshToken: "momentory-refresh-secret",
      userId: 42,
    });
  });

  it("서버에 셋을 보낸다 — identity token · nonce 원문 · authorization code", async () => {
    const fetchMock = setFetch(async () => respondOk(SERVER_BODY));

    await useAuth.getState().signInWithApple();

    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/auth/apple");
    // 이름·이메일은 얹지 않는다 — 서버가 토큰 안에서 읽는다.
    // authorization code 는 탈퇴 때 애플 연결을 끊을 refresh token 으로 바뀐다
    expect(JSON.parse(String(init.body))).toEqual({
      identityToken: "apple-identity-token-secret",
      nonce: NONCE_RAW,
      authorizationCode: "apple-auth-code-secret",
    });
  });

  it("서버로 가는 것은 nonce 의 **원문**이다 — 해시를 보내면 서버가 전부 거절한다", async () => {
    const fetchMock = setFetch(async () => respondOk(SERVER_BODY));

    await useAuth.getState().signInWithApple();

    const [, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    const sent = JSON.parse(String(init.body)) as { nonce: string };
    expect(sent.nonce).toBe(NONCE_RAW);
    expect(sent.nonce).not.toBe(NONCE_HASHED);
  });

  it("nonce 원문도 기기에 남지 않는다 — 한 번 보내고 버리는 값이다", async () => {
    await useAuth.getState().signInWithApple();

    const everything = JSON.stringify([...secure.__store.entries()]);
    expect(everything).not.toContain(NONCE_RAW);
  });

  it("애플 토큰은 기기에 남지 않는다 — 남는 것은 모멘토리 토큰뿐이다", async () => {
    await useAuth.getState().signInWithApple();

    const everything = JSON.stringify([...secure.__store.entries()]);
    expect(everything).not.toContain("apple-identity-token-secret");
    expect(everything).not.toContain("apple-auth-code-secret");
    expect(everything).toContain("momentory-access-secret");
  });

  it("온보딩을 마친 사용자는 완료 플래그가 선다 — 서버 답이 정본이다", async () => {
    setFetch(async () => respondOk({ ...SERVER_BODY, onboardingRequired: false }));

    const outcome = await useAuth.getState().signInWithApple();

    expect(outcome).toEqual({ kind: "signed-in", onboardingRequired: false });
    expect(useOnboardingCompletion.getState().completed).toBe(true);
  });

  it("credential 을 로그에 남기지 않는다", async () => {
    await useAuth.getState().signInWithApple();

    const logged = jest.mocked(console.warn).mock.calls.flat().join(" ");
    expect(logged).not.toContain("apple-identity-token-secret");
    expect(logged).not.toContain("apple-auth-code-secret");
    expect(logged).not.toContain("001234.abcdef.0000");
  });

  it("취소하면 아무 말도 하지 않는다 — 서버를 부르지도 않는다", async () => {
    signIn.mockRejectedValue(cancelled());
    const fetchMock = setFetch(async () => respondOk(SERVER_BODY));

    const outcome = await useAuth.getState().signInWithApple();

    expect(outcome).toEqual({ kind: "cancelled" });
    expect(useAuth.getState().signInError).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("쓸 수 없는 기기에는 재시도를 권하지 않는다 — 다시 눌러도 같기 때문이다", async () => {
    isAvailable.mockResolvedValue(false);
    const fetchMock = setFetch(async () => respondOk(SERVER_BODY));

    const outcome = await useAuth.getState().signInWithApple();

    expect(outcome).toEqual({ kind: "failed", message: UNAVAILABLE });
    expect(UNAVAILABLE).not.toContain("잠시 뒤");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("SDK 실패는 애플의 말로 한 줄 — 카카오 문구가 새어 나오지 않는다", async () => {
    signIn.mockRejectedValue(new Error("nope"));

    const outcome = await useAuth.getState().signInWithApple();

    expect(outcome).toEqual({ kind: "failed", message: SDK_FAILED });
    expect(SDK_FAILED).not.toContain("카카오");
  });

  it("서버가 토큰을 거절하면 세션이 되지 않는다 — 애플이 인가했어도 마찬가지다", async () => {
    setFetch(async () => respondError(401, { code: "APPLE_TOKEN_INVALID" }));

    const outcome = await useAuth.getState().signInWithApple();

    expect(outcome).toEqual({ kind: "failed", message: TOKEN_INVALID });
    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.size).toBe(0);
  });

  it("이메일을 못 받으면 사용자가 할 일을 알려 준다 — 유일하게 손댈 곳이 있는 실패다", async () => {
    setFetch(async () => respondError(400, { code: "APPLE_EMAIL_UNAVAILABLE" }));

    const outcome = await useAuth.getState().signInWithApple();

    expect(outcome).toEqual({ kind: "failed", message: EMAIL_UNAVAILABLE });
    // 「잠시 뒤 다시」가 아니다 — 설정을 바꾸지 않으면 다시 눌러도 같다
    expect(EMAIL_UNAVAILABLE).toContain("애플 ID 설정");
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("기기에 남기지 못하면 로그인이라 말하지 않는다", async () => {
    secure.setItemAsync.mockRejectedValueOnce(new Error("no space"));

    const outcome = await useAuth.getState().signInWithApple();

    expect(outcome).toEqual({ kind: "failed", message: STORE_FAILED });
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("자물쇠는 카카오와 하나다 — 진행 중이면 시트를 열지 않는다", async () => {
    useAuth.setState({ signingIn: true });

    expect(await useAuth.getState().signInWithApple()).toEqual({ kind: "busy" });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("끝나면 자물쇠를 푼다 — 실패해도 버튼이 잠긴 채 남지 않는다", async () => {
    signIn.mockRejectedValue(new Error("nope"));

    await useAuth.getState().signInWithApple();

    expect(useAuth.getState().signingIn).toBe(false);
  });

  it("다시 누르면 지난 안내를 먼저 지운다", async () => {
    signIn.mockRejectedValueOnce(new Error("nope"));
    await useAuth.getState().signInWithApple();
    expect(useAuth.getState().signInError).toBe(SDK_FAILED);

    signIn.mockRejectedValueOnce(cancelled());
    await useAuth.getState().signInWithApple();

    expect(useAuth.getState().signInError).toBeNull();
  });
});
