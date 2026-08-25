import { GOOGLE_LOGIN_PATH, exchangeGoogleIdToken } from "../data/googleAuthApi";
import { LOGIN_REQUEST_TIMEOUT_MS } from "../data/loginSession";

import { getApiBaseUrl } from "@/lib/config";

/**
 * 구글 세션 교환의 계약 시험 — **서버가 계약을 어겼을 때 무엇이 되는가**가
 * 요점이다. `appleAuthApi.test.ts`·`kakaoAuthApi.test.ts` 와 같은 주제이고,
 * 같은 이유로 성공보다 **거절·유실·형태 위반**을 더 많이 건다.
 *
 * 여기서만 볼 수 있는 것이 둘 있다:
 *
 * 1. **보내는 것이 `idToken` 하나뿐인가** — 이름·이메일은 서버가 토큰 안에서
 *    읽고, ⚠ **nonce 는 계약에 없다**(SDK 에 넘길 자리가 없다 · `googleSdk.ts`).
 *    애플 쪽 파일을 베끼다 보면 nonce 가 딸려 들어오기 쉬운데, 서버는 그 필드를
 *    모른다
 * 2. **`GOOGLE_CLIENT_ID_MISMATCH` 를 따로 두는가** — 사용자 문구는 다른 401 과
 *    같지만, 이 값이 실기기에서 돌아오면 「구글이 거절했다」가 아니라 **우리
 *    설정이 틀렸다**(SHA-1 미등록 · 클라이언트 ID 어긋남)를 봐야 한다
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
  getKakaoAppKey: jest.fn(() => "kakao-key"),
  getGoogleWebClientId: jest.fn(() => "web.apps.googleusercontent.com"),
  getGoogleIosClientId: jest.fn(() => "ios.apps.googleusercontent.com"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

const ID_TOKEN = "google-id-token";

/** 응답은 **카카오·애플과 글자 그대로 같다** — 검증도 같은 코드를 지난다 */
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
    json: async () => body,
  }) as Response;

const setFetch = (impl: (...args: unknown[]) => Promise<Response>) => {
  const fn = jest.fn(impl);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
};

beforeEach(() => {
  jest.clearAllMocks();
  baseUrl.mockReturnValue("http://api.test");
  setFetch(async () => respond(200, VALID_BODY));
});

describe("보내는 것", () => {
  it("경로와 본문 — idToken 하나뿐이다", async () => {
    const fetchMock = setFetch(async () => respond(200, VALID_BODY));

    await exchangeGoogleIdToken(ID_TOKEN);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://api.test${GOOGLE_LOGIN_PATH}`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ idToken: ID_TOKEN });
  });

  it("nonce 를 보내지 않는다 — 서버가 모르는 필드다", async () => {
    const fetchMock = setFetch(async () => respond(200, VALID_BODY));

    await exchangeGoogleIdToken(ID_TOKEN);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty("nonce");
  });

  it("주소가 없으면 부르지도 않는다 — 기본 주소를 지어내지 않는다", async () => {
    baseUrl.mockReturnValue("");
    const fetchMock = setFetch(async () => respond(200, VALID_BODY));

    expect(await exchangeGoogleIdToken(ID_TOKEN)).toEqual({ ok: false, code: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("응답이 없으면 끊는다 — 버튼이 영영 잠기지 않게", async () => {
    setFetch((...args: unknown[]) => {
      const [, init] = args as [string, RequestInit];
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    });

    jest.useFakeTimers();
    const pending = exchangeGoogleIdToken(ID_TOKEN);
    jest.advanceTimersByTime(LOGIN_REQUEST_TIMEOUT_MS);
    const result = await pending;
    jest.useRealTimers();

    expect(result).toEqual({ ok: false, code: "network" });
  });
});

describe("받는 것", () => {
  it("200 이면 세션이다", async () => {
    expect(await exchangeGoogleIdToken(ID_TOKEN)).toEqual({
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

  it("200 인데 필드가 빠지면 malformed 다 — 반쯤 로그인된 상태를 만들지 않는다", async () => {
    setFetch(async () => respond(200, { ...VALID_BODY, refreshToken: undefined }));

    expect(await exchangeGoogleIdToken(ID_TOKEN)).toEqual({ ok: false, code: "malformed" });
  });

  it("닿지 못하면 network 다", async () => {
    setFetch(async () => {
      throw new Error("offline");
    });

    expect(await exchangeGoogleIdToken(ID_TOKEN)).toEqual({ ok: false, code: "network" });
  });
});

describe("거절의 이름 — 본문이 상태 코드보다 정확하다", () => {
  it.each([
    ["INVALID_REQUEST", 400, "invalid_request"],
    ["GOOGLE_EMAIL_UNAVAILABLE", 400, "google_email_unavailable"],
    ["GOOGLE_TOKEN_INVALID", 401, "google_token_invalid"],
    ["GOOGLE_CLIENT_ID_MISMATCH", 401, "google_client_mismatch"],
    ["GOOGLE_API_SERVER_ERROR", 502, "google_upstream"],
    ["GOOGLE_API_RESPONSE_ERROR", 502, "google_upstream"],
    ["GOOGLE_API_NETWORK_ERROR", 503, "google_upstream"],
  ])("%s → %s", async (serverCode, status, expected) => {
    setFetch(async () => respond(status as number, { code: serverCode }));

    expect(await exchangeGoogleIdToken(ID_TOKEN)).toEqual({ ok: false, code: expected });
  });

  it("본문을 읽지 못한 400 은 「우리가 잘못 보냈다」로 접는다", async () => {
    setFetch(
      async () =>
        ({
          ok: false,
          status: 400,
          json: async () => {
            throw new Error("not json");
          },
        }) as unknown as Response,
    );

    expect(await exchangeGoogleIdToken(ID_TOKEN)).toEqual({ ok: false, code: "invalid_request" });
  });

  it("모르는 5xx 는 server 다", async () => {
    setFetch(async () => respond(500, {}));

    expect(await exchangeGoogleIdToken(ID_TOKEN)).toEqual({ ok: false, code: "server" });
  });
});
