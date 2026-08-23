import { WITHDRAW_PATH, deleteAccount } from "../data/withdrawApi";
import { SESSION_KEY } from "../model/auth";

import { getApiBaseUrl } from "@/lib/config";

/**
 * `DELETE /api/v1/users/me` 계약 시험 (BE #42).
 *
 * `meApi.test.ts` 와 같은 틀이다 — `lib/http.ts` 를 지나가는 그대로 시험한다.
 * 이 어댑터가 특히 지키는 것: **성공에 본문이 없다**(204)는 것과, **502·503 은
 * 카카오 연결 해제 실패라 계정이 남는다**는 것. 그 둘을 `server` 와 한 코드로
 * 묶으면 호출부가 「계정이 지워졌나?」를 잘못 판단한다.
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

type SecureMock = { __store: Map<string, string> };
const secure = jest.requireMock("expo-secure-store") as SecureMock;

/** 본문 유무를 `text()` 로 가른다 — 204 는 빈 문자열이다(`http.ts` 의 `parseJson`) */
const respond = (status: number, body?: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  }) as Response;

const mockFetch = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
  const fn = jest.fn(impl);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
};

/** 살아 있는 세션 — 없으면 요청이 나가기 전에 unauthenticated 로 닫힌다 */
const seedSession = () =>
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({
      accessToken: "live-access",
      refreshToken: "r",
      expiresAt: Date.now() + 60_000,
      userId: 7,
    }),
  );

beforeEach(() => {
  secure.__store.clear();
  jest.clearAllMocks();
  baseUrl.mockReturnValue("http://api.test");
  seedSession();
});

describe("요청 — 계약대로 보낸다", () => {
  it("합의한 경로로 Bearer 를 실어 DELETE 한다 — 본문은 없다", async () => {
    const fetchMock = mockFetch(async () => respond(204));

    await deleteAccount();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`http://api.test${WITHDRAW_PATH}`);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer live-access");
  });

  it("세션이 없으면 요청조차 하지 않는다 — unauthenticated", async () => {
    secure.__store.clear();
    const fetchMock = mockFetch(async () => respond(204));

    const result = await deleteAccount();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, code: "unauthenticated" });
  });

  it("주소가 비면 요청조차 하지 않는다 — unconfigured", async () => {
    baseUrl.mockReturnValue("");
    const fetchMock = mockFetch(async () => respond(204));

    expect(await deleteAccount()).toEqual({ ok: false, code: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("성공 — 204 에는 본문이 없다", () => {
  it("본문 없이 성공으로 닫는다", async () => {
    mockFetch(async () => respond(204));

    expect(await deleteAccount()).toEqual({ ok: true });
  });
});

describe("거절 — 사용자가 할 수 있는 일로 가른다", () => {
  it("401 은 unauthenticated 다", async () => {
    mockFetch(async () => respond(401, { code: "AUTHENTICATION_REQUIRED" }));

    expect(await deleteAccount()).toEqual({ ok: false, code: "unauthenticated" });
  });

  it.each([502, 503])("%i 는 카카오 연결 해제 실패다 — 계정이 남는다(kakao)", async (status) => {
    mockFetch(async () => respond(status, { code: "KAKAO_API_SERVER_ERROR" }));

    expect(await deleteAccount()).toEqual({ ok: false, code: "kakao" });
  });

  it("그 밖의 5xx 는 server 다", async () => {
    mockFetch(async () => respond(500, { code: "INTERNAL" }));

    expect(await deleteAccount()).toEqual({ ok: false, code: "server" });
  });
});

describe("서버에 닿지 못했을 때", () => {
  it("전송 실패는 network 다", async () => {
    mockFetch(async () => {
      throw new TypeError("Network request failed");
    });

    expect(await deleteAccount()).toEqual({ ok: false, code: "network" });
  });
});
