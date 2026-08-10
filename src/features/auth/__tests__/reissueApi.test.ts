import { REISSUE_PATH, REQUEST_TIMEOUT_MS, reissueAccessToken } from "../data/reissueApi";

import { getApiBaseUrl } from "@/lib/config";

/**
 * 갱신 계약 시험 — `kakaoAuthApi.test.ts` 와 같은 이유로 성공보다 거절·유실·형태
 * 위반을 더 많이 건다. 여기가 틀리면 만료된 세션이 조용히 죽거나, 반대로
 * 반쯤 갱신된 세션이 기기에 눕는다.
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

const VALID_BODY = {
  accessToken: "new-access",
  refreshToken: "new-refresh",
  tokenType: "Bearer",
  accessTokenExpiresIn: 1800,
};

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
  it("합의한 endpoint 로 refresh token 하나만 담아 POST 한다", async () => {
    const fetchMock = mockFetch(async () => respond(200, VALID_BODY));

    await reissueAccessToken("old-refresh");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`http://api.test${REISSUE_PATH}`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ refreshToken: "old-refresh" });
  });

  it("주소가 비면 요청조차 하지 않는다", async () => {
    baseUrl.mockReturnValue("");
    const fetchMock = mockFetch(async () => respond(200, VALID_BODY));

    const result = await reissueAccessToken("old-refresh");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, code: "unconfigured" });
  });
});

describe("성공 응답", () => {
  it("계약대로면 새 토큰 쌍을 그대로 돌려준다 — userId 는 여기 없다", async () => {
    mockFetch(async () => respond(200, VALID_BODY));

    const result = await reissueAccessToken("old-refresh");

    expect(result).toEqual({
      ok: true,
      session: {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        accessTokenExpiresIn: 1800,
      },
    });
  });
});

describe("거절 — 상태 코드별", () => {
  it.each([
    [400, "invalid_request"],
    [401, "refresh_invalid"],
    [500, "server"],
  ])("%i 는 %s 다", async (status, code) => {
    mockFetch(async () => respond(status, { code: "UNKNOWN_TO_US" }));

    expect(await reissueAccessToken("r")).toEqual({ ok: false, code });
  });

  it.each([
    ["REFRESH_TOKEN_INVALID", "refresh_invalid"],
    ["REFRESH_TOKEN_REVOKED", "refresh_revoked"],
    ["REFRESH_TOKEN_EXPIRED", "refresh_expired"],
  ])(
    "본문의 %s 코드는 %s 로 정확히 갈린다 — 회전한 토큰 재사용과 진짜 만료를 구분한다",
    async (bodyCode, code) => {
      mockFetch(async () => respond(401, { code: bodyCode }));

      expect(await reissueAccessToken("r")).toEqual({ ok: false, code });
    },
  );

  it("오류 본문이 JSON 이 아니어도 상태 코드로 판정한다", async () => {
    mockFetch(async () => respond(401, undefined));

    expect(await reissueAccessToken("r")).toEqual({ ok: false, code: "refresh_invalid" });
  });
});

describe("서버에 닿지 못했을 때", () => {
  it("전송 실패는 network 다", async () => {
    mockFetch(async () => {
      throw new TypeError("Network request failed");
    });

    expect(await reissueAccessToken("r")).toEqual({ ok: false, code: "network" });
  });

  it("응답이 없으면 정해진 시간에 끊는다", async () => {
    jest.useFakeTimers();
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
        }),
    );

    const pending = reissueAccessToken("r");
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    expect(await pending).toEqual({ ok: false, code: "network" });
    jest.useRealTimers();
  });
});

describe("형태 위반 — 200 이어도 받지 않는다", () => {
  it("JSON 이 아니면 malformed", async () => {
    mockFetch(async () => respond(200, undefined));

    expect(await reissueAccessToken("r")).toEqual({ ok: false, code: "malformed" });
  });

  it.each([
    ["accessToken 누락", { ...VALID_BODY, accessToken: undefined }],
    ["refreshToken 누락", { ...VALID_BODY, refreshToken: undefined }],
    ["tokenType 이 Bearer 가 아님", { ...VALID_BODY, tokenType: "MAC" }],
    ["만료 시간이 0", { ...VALID_BODY, accessTokenExpiresIn: 0 }],
    ["본문이 배열", []],
    ["본문이 null", null],
  ])("%s 면 malformed — 반쯤 갱신된 세션을 만들지 않는다", async (_name, body) => {
    mockFetch(async () => respond(200, body));

    expect(await reissueAccessToken("r")).toEqual({ ok: false, code: "malformed" });
  });
});
