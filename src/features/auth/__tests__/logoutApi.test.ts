import { LOGOUT_PATH, REQUEST_TIMEOUT_MS, revokeRefreshToken } from "../data/logoutApi";

import { getApiBaseUrl } from "@/lib/config";

/**
 * 폐기 계약 시험 — `reissueApi.test.ts` 와 같은 틀이되 **성공에 본문이 없다**는
 * 것이 다르다. 서버는 `204` 를 준다.
 *
 * 이 파일이 특히 지키는 것: **성공 응답의 본문을 읽지 않는다.** 없는 본문을
 * 파싱하려 들면 폐기가 끝났는데도 실패로 보고하게 되고, 그러면 호출부가
 * 「서버에 토큰이 남았다」고 잘못 판단한다.
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

/**
 * 성공 응답 — **본문이 없다.** `json()` 이 던지게 두는 것이 요점이다:
 * 구현이 본문을 읽으려 들면 이 테스트가 깨진다.
 */
const respond204 = () =>
  ({
    ok: true,
    status: 204,
    json: async () => {
      throw new SyntaxError("Unexpected end of JSON input");
    },
  }) as unknown as Response;

/** 오류 응답. `body === undefined` 면 본문이 JSON 이 아닌 경우다 */
const respondError = (status: number, body: unknown) =>
  ({
    ok: false,
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
    const fetchMock = mockFetch(async () => respond204());

    await revokeRefreshToken("my-refresh");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`http://api.test${LOGOUT_PATH}`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ refreshToken: "my-refresh" });
  });

  it("Authorization 헤더를 붙이지 않는다 — 신원은 refresh token 자체가 증명한다", async () => {
    const fetchMock = mockFetch(async () => respond204());

    await revokeRefreshToken("my-refresh");

    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers).toEqual({ "Content-Type": "application/json", Accept: "application/json" });
  });

  it("주소가 비면 요청조차 하지 않는다", async () => {
    baseUrl.mockReturnValue("");
    const fetchMock = mockFetch(async () => respond204());

    const result = await revokeRefreshToken("my-refresh");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, code: "unconfigured" });
  });
});

describe("성공 — 204 에는 본문이 없다", () => {
  it("본문을 읽지 않고 성공으로 닫는다", async () => {
    mockFetch(async () => respond204());

    expect(await revokeRefreshToken("r")).toEqual({ ok: true });
  });
});

describe("거절", () => {
  it.each([
    [400, "invalid_request"],
    [500, "server"],
    [503, "server"],
  ])("%i 는 %s 다", async (status, code) => {
    mockFetch(async () => respondError(status, { code: "UNKNOWN_TO_US" }));

    expect(await revokeRefreshToken("r")).toEqual({ ok: false, code });
  });

  it("본문의 INVALID_REQUEST 를 사유로 읽는다", async () => {
    mockFetch(async () =>
      respondError(400, { code: "INVALID_REQUEST", message: "refreshToken은 필수입니다." }),
    );

    expect(await revokeRefreshToken("")).toEqual({ ok: false, code: "invalid_request" });
  });

  it("오류 본문이 JSON 이 아니어도 상태 코드로 판정한다", async () => {
    mockFetch(async () => respondError(500, undefined));

    expect(await revokeRefreshToken("r")).toEqual({ ok: false, code: "server" });
  });
});

describe("서버에 닿지 못했을 때", () => {
  it("전송 실패는 network 다", async () => {
    mockFetch(async () => {
      throw new TypeError("Network request failed");
    });

    expect(await revokeRefreshToken("r")).toEqual({ ok: false, code: "network" });
  });

  it("응답이 없으면 정해진 시간에 끊는다", async () => {
    jest.useFakeTimers();
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
        }),
    );

    const pending = revokeRefreshToken("r");
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    expect(await pending).toEqual({ ok: false, code: "network" });
    jest.useRealTimers();
  });
});
