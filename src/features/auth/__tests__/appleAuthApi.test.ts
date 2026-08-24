import { APPLE_LOGIN_PATH, exchangeAppleIdentityToken } from "../data/appleAuthApi";
import { LOGIN_REQUEST_TIMEOUT_MS } from "../data/loginSession";

import { getApiBaseUrl } from "@/lib/config";

/**
 * 애플 세션 교환의 계약 시험 (2026-08-24) — **서버가 계약을 어겼을 때 무엇이
 * 되는가**가 요점이다. `kakaoAuthApi.test.ts` 와 같은 주제이고, 같은 이유로
 * 성공보다 **거절·유실·형태 위반**을 더 많이 건다.
 *
 * 여기서만 볼 수 있는 것이 둘 있다:
 *
 * 1. **보내는 것이 셋뿐인가** — `identityToken`·`nonce`·`authorizationCode`.
 *    이름·이메일은 서버가 토큰 안에서 읽으므로 요청 본문에 얹지 않는다. 얹으면
 *    「보냈으니 저쪽이 갖고 있겠지」라는 잘못된 전제가 생긴다
 * 2. **400 두 갈래를 본문으로 가르는가** — 계약이 `INVALID_REQUEST` 와
 *    `APPLE_EMAIL_UNAVAILABLE` 을 같은 상태 코드에 둔다. 사용자가 할 일이
 *    갈리는 자리라(설정을 고칠 것인가 · 우리가 고칠 것인가) 상태 코드만으로는
 *    부족하다
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
  getKakaoAppKey: jest.fn(() => "kakao-key"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

/** 이번 인가의 nonce **원문**. 애플에 준 것은 이 값의 SHA-256 해시다(`appleSdk.ts`) */
const NONCE = "0f1e2d3c";

/** 이번 인가의 authorization code — 서버가 애플 refresh token 으로 바꿔 보관한다 */
const AUTH_CODE = "apple-authorization-code";

/** 응답은 **카카오와 글자 그대로 같다** — 검증도 같은 코드를 지난다 */
const VALID_BODY = {
  accessToken: "momentory-access",
  refreshToken: "momentory-refresh",
  tokenType: "Bearer",
  accessTokenExpiresIn: 3600,
  userId: 42,
  onboardingRequired: true,
};

/** `Response` 흉내 — 우리가 실제로 만지는 세 가지(ok·status·json)만 둔다 */
const respond = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError("Unexpected token < in JSON");
      return body;
    },
  }) as Response;

const mockFetch = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
  const fn = jest.fn(impl);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
};

beforeEach(() => {
  jest.clearAllMocks();
  baseUrl.mockReturnValue("http://api.test");
});

describe("요청 — 계약대로 보낸다", () => {
  it("합의한 endpoint 로 셋만 담아 POST 한다 — 이름·이메일은 없다", async () => {
    const fetchMock = mockFetch(async () => respond(200, VALID_BODY));

    await exchangeAppleIdentityToken("apple-identity-token", NONCE, AUTH_CODE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`http://api.test${APPLE_LOGIN_PATH}`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    // `authorizationCode`·`fullName`·`email` 을 얹지 않는다 — 서버가 읽지 않는다
    expect(JSON.parse(String(init.body))).toEqual({
      identityToken: "apple-identity-token",
      nonce: NONCE,
      authorizationCode: AUTH_CODE,
    });
  });

  it("주소가 비면 요청조차 하지 않는다 — 기본 주소를 지어내지 않는다", async () => {
    baseUrl.mockReturnValue("");
    const fetchMock = mockFetch(async () => respond(200, VALID_BODY));

    const result = await exchangeAppleIdentityToken("apple-identity-token", NONCE, AUTH_CODE);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, code: "unconfigured" });
  });
});

describe("성공 응답", () => {
  it("계약대로면 세션을 그대로 돌려준다", async () => {
    mockFetch(async () => respond(200, VALID_BODY));

    const result = await exchangeAppleIdentityToken("apple-identity-token", NONCE, AUTH_CODE);

    expect(result).toEqual({
      ok: true,
      session: {
        accessToken: "momentory-access",
        refreshToken: "momentory-refresh",
        accessTokenExpiresIn: 3600,
        userId: 42,
        onboardingRequired: true,
      },
    });
  });

  it("온보딩이 끝난 사용자의 false 도 그대로 전한다", async () => {
    mockFetch(async () => respond(200, { ...VALID_BODY, onboardingRequired: false }));

    const result = await exchangeAppleIdentityToken("apple-identity-token", NONCE, AUTH_CODE);

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(result.ok && result.session.onboardingRequired).toBe(false);
  });
});

describe("거절 — 애플의 사유로 옮긴다", () => {
  it.each([
    ["INVALID_REQUEST", 400, "invalid_request"],
    ["APPLE_EMAIL_UNAVAILABLE", 400, "apple_email_unavailable"],
    ["APPLE_TOKEN_INVALID", 401, "apple_token_invalid"],
    ["APPLE_NONCE_MISMATCH", 401, "apple_nonce_mismatch"],
    ["APPLE_CLIENT_ID_MISMATCH", 401, "apple_client_mismatch"],
    ["APPLE_API_SERVER_ERROR", 502, "apple_upstream"],
    ["APPLE_API_RESPONSE_ERROR", 502, "apple_upstream"],
    ["APPLE_API_NETWORK_ERROR", 503, "apple_upstream"],
  ])("본문의 %s 는 %i 에서 %s 다", async (serverCode, status, code) => {
    mockFetch(async () => respond(status, { code: serverCode }));

    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({ ok: false, code });
  });

  it("같은 400 이라도 이메일 문제와 우리 잘못을 가른다 — 사용자가 할 일이 다르다", async () => {
    mockFetch(async () => respond(400, { code: "APPLE_EMAIL_UNAVAILABLE" }));
    const email = await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE);

    mockFetch(async () => respond(400, { code: "INVALID_REQUEST" }));
    const ours = await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE);

    expect(email).toEqual({ ok: false, code: "apple_email_unavailable" });
    expect(ours).toEqual({ ok: false, code: "invalid_request" });
  });

  it("nonce 불일치는 따로 이름 붙인다 — 정상 흐름에서는 나올 수 없는 값이다", async () => {
    mockFetch(async () => respond(401, { code: "APPLE_NONCE_MISMATCH" }));

    // 반복되면 공격이 아니라 양쪽 해시 인코딩이 어긋난 것이다
    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({
      ok: false,
      code: "apple_nonce_mismatch",
    });
  });

  it("401 세 갈래를 가른다 — 문구는 같아도 우리가 봐야 할 것이 다르다", async () => {
    mockFetch(async () => respond(401, { code: "APPLE_CLIENT_ID_MISMATCH" }));

    // 번들 ID 와 서버의 APPLE_CLIENT_ID 가 어긋났다는 뜻이다 — 사용자 문제가 아니다
    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({
      ok: false,
      code: "apple_client_mismatch",
    });
  });

  it("본문의 오류 코드가 상태 코드보다 정확하면 그것을 쓴다", async () => {
    // 500 인데 본문이 「애플 쪽 장애」라고 말하면 그 말을 믿는다
    mockFetch(async () => respond(500, { code: "APPLE_API_SERVER_ERROR" }));

    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({
      ok: false,
      code: "apple_upstream",
    });
  });

  it.each([
    [400, "invalid_request"],
    [401, "apple_token_invalid"],
    [502, "apple_upstream"],
    [503, "apple_upstream"],
  ])("본문을 못 읽으면 상태 코드로 판정한다 — %i 는 %s", async (status, code) => {
    mockFetch(async () => respond(status, undefined));

    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({ ok: false, code });
  });

  it("400 을 본문 없이 받으면 「우리가 잘못 보냈다」로 접는다", async () => {
    // 둘 중 우리가 고칠 수 있는 쪽이다 — 이메일 문제를 잘못 띄우면 사용자가
    // 애플 설정을 헛되이 뒤진다
    mockFetch(async () => respond(400, {}));

    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({
      ok: false,
      code: "invalid_request",
    });
  });

  it("알 수 없는 상태 코드는 server 로 접는다 — 사용자에게는 같은 상황이다", async () => {
    mockFetch(async () => respond(418, { code: "TEAPOT" }));

    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({
      ok: false,
      code: "server",
    });
  });

  it("카카오의 사유가 새어 들어오지 않는다 — 표를 나눠 둔 이유다", async () => {
    mockFetch(async () => respond(401, { code: "KAKAO_TOKEN_INVALID" }));

    // 애플 엔드포인트에서 온 카카오 코드는 우리가 아는 이름이 아니다 → 상태 코드로 판정
    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({
      ok: false,
      code: "apple_token_invalid",
    });
  });
});

describe("서버에 닿지 못했을 때", () => {
  it("전송 실패는 network 다", async () => {
    mockFetch(async () => {
      throw new TypeError("Network request failed");
    });

    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({
      ok: false,
      code: "network",
    });
  });

  it("응답이 없으면 정해진 시간에 끊는다 — 버튼이 영영 잠기지 않게", async () => {
    jest.useFakeTimers();
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
        }),
    );

    const pending = exchangeAppleIdentityToken("t", NONCE, AUTH_CODE);
    jest.advanceTimersByTime(LOGIN_REQUEST_TIMEOUT_MS);

    expect(await pending).toEqual({ ok: false, code: "network" });
    jest.useRealTimers();
  });
});

describe("형태 위반 — 200 이어도 받지 않는다", () => {
  it("JSON 이 아니면 malformed", async () => {
    mockFetch(async () => respond(200, undefined));

    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({
      ok: false,
      code: "malformed",
    });
  });

  it.each([
    ["accessToken 누락", { ...VALID_BODY, accessToken: undefined }],
    ["refreshToken 빈 문자열", { ...VALID_BODY, refreshToken: "  " }],
    ["tokenType 이 Bearer 가 아님", { ...VALID_BODY, tokenType: "MAC" }],
    ["만료 시간이 0", { ...VALID_BODY, accessTokenExpiresIn: 0 }],
    ["userId 가 문자열", { ...VALID_BODY, userId: "42" }],
    ["onboardingRequired 누락", { ...VALID_BODY, onboardingRequired: undefined }],
    ["본문이 배열", []],
    ["본문이 null", null],
  ])("%s 면 malformed — 반쯤 로그인된 상태를 만들지 않는다", async (_name, body) => {
    mockFetch(async () => respond(200, body));

    expect(await exchangeAppleIdentityToken("t", NONCE, AUTH_CODE)).toEqual({
      ok: false,
      code: "malformed",
    });
  });
});
