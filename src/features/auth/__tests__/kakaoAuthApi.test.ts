import { exchangeKakaoToken, KAKAO_LOGIN_PATH, REQUEST_TIMEOUT_MS } from "../data/kakaoAuthApi";

import { getApiBaseUrl } from "@/lib/config";

/**
 * 세션 교환의 계약 시험 — **서버가 계약을 어겼을 때 무엇이 되는가**가 요점이다.
 *
 * 인증 폴백은 화면에 오류를 띄우지 않는 설계라(`ARCHITECTURE §7`) 여기가
 * 틀리면 아무도 모른다. 그래서 성공보다 **거절·유실·형태 위반**을 더 많이 건다.
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
  getKakaoAppKey: jest.fn(() => "kakao-key"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

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
  it("합의한 endpoint 로 카카오 토큰 하나만 담아 POST 한다", async () => {
    const fetchMock = mockFetch(async () => respond(200, VALID_BODY));

    await exchangeKakaoToken("kakao-access-token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`http://api.test${KAKAO_LOGIN_PATH}`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    // 카카오 토큰 외에는 아무것도 보내지 않는다 — 앱 키·기기 정보를 얹지 않는다
    expect(JSON.parse(String(init.body))).toEqual({ accessToken: "kakao-access-token" });
  });

  it("주소가 비면 요청조차 하지 않는다 — 기본 주소를 지어내지 않는다", async () => {
    baseUrl.mockReturnValue("");
    const fetchMock = mockFetch(async () => respond(200, VALID_BODY));

    const result = await exchangeKakaoToken("kakao-access-token");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, code: "unconfigured" });
  });
});

describe("성공 응답", () => {
  it("계약대로면 세션을 그대로 돌려준다", async () => {
    mockFetch(async () => respond(200, VALID_BODY));

    const result = await exchangeKakaoToken("kakao-access-token");

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

    const result = await exchangeKakaoToken("kakao-access-token");

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(result.ok && result.session.onboardingRequired).toBe(false);
  });
});

describe("거절 — 상태 코드별", () => {
  it.each([
    [400, "invalid_request"],
    [401, "kakao_token_invalid"],
    [502, "kakao_upstream"],
    [503, "kakao_upstream"],
  ])("%i 는 %s 다", async (status, code) => {
    mockFetch(async () => respond(status, { code: "UNKNOWN_TO_US" }));

    expect(await exchangeKakaoToken("t")).toEqual({ ok: false, code });
  });

  it("본문의 오류 코드가 상태 코드보다 정확하면 그것을 쓴다", async () => {
    // 500 인데 본문이 「카카오 쪽 장애」라고 말하면 그 말을 믿는다
    mockFetch(async () => respond(500, { code: "KAKAO_API_SERVER_ERROR" }));

    expect(await exchangeKakaoToken("t")).toEqual({ ok: false, code: "kakao_upstream" });
  });

  it("알 수 없는 상태 코드는 server 로 접는다 — 사용자에게는 같은 상황이다", async () => {
    mockFetch(async () => respond(418, { code: "TEAPOT" }));

    expect(await exchangeKakaoToken("t")).toEqual({ ok: false, code: "server" });
  });

  it("오류 본문이 JSON 이 아니어도 상태 코드로 판정한다 — 여기서 또 실패하지 않는다", async () => {
    mockFetch(async () => respond(401, undefined));

    expect(await exchangeKakaoToken("t")).toEqual({ ok: false, code: "kakao_token_invalid" });
  });
});

describe("서버에 닿지 못했을 때", () => {
  it("전송 실패는 network 다", async () => {
    mockFetch(async () => {
      throw new TypeError("Network request failed");
    });

    expect(await exchangeKakaoToken("t")).toEqual({ ok: false, code: "network" });
  });

  it("응답이 없으면 정해진 시간에 끊는다 — 버튼이 영영 잠기지 않게", async () => {
    jest.useFakeTimers();
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
        }),
    );

    const pending = exchangeKakaoToken("t");
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    expect(await pending).toEqual({ ok: false, code: "network" });
    jest.useRealTimers();
  });
});

describe("형태 위반 — 200 이어도 받지 않는다", () => {
  it("JSON 이 아니면 malformed", async () => {
    mockFetch(async () => respond(200, undefined));

    expect(await exchangeKakaoToken("t")).toEqual({ ok: false, code: "malformed" });
  });

  it.each([
    ["accessToken 누락", { ...VALID_BODY, accessToken: undefined }],
    ["accessToken 빈 문자열", { ...VALID_BODY, accessToken: "  " }],
    ["refreshToken 누락", { ...VALID_BODY, refreshToken: undefined }],
    ["tokenType 이 Bearer 가 아님", { ...VALID_BODY, tokenType: "MAC" }],
    ["만료 시간이 문자열", { ...VALID_BODY, accessTokenExpiresIn: "3600" }],
    ["만료 시간이 0", { ...VALID_BODY, accessTokenExpiresIn: 0 }],
    ["userId 가 문자열", { ...VALID_BODY, userId: "42" }],
    ["onboardingRequired 누락", { ...VALID_BODY, onboardingRequired: undefined }],
    ["본문이 배열", []],
    ["본문이 null", null],
  ])("%s 면 malformed — 반쯤 로그인된 상태를 만들지 않는다", async (_name, body) => {
    mockFetch(async () => respond(200, body));

    expect(await exchangeKakaoToken("t")).toEqual({ ok: false, code: "malformed" });
  });

  it("tokenType 의 대소문자만은 눈감아 준다", async () => {
    mockFetch(async () => respond(200, { ...VALID_BODY, tokenType: "bearer" }));

    expect(await exchangeKakaoToken("t")).toEqual(expect.objectContaining({ ok: true }));
  });
});
