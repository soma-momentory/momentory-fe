import { SESSION_KEY } from "@/features/auth/model/auth";
import { authedRequest, type HttpMethod } from "@/lib/http";
import { getApiBaseUrl } from "@/lib/config";

/**
 * 인증 호출의 단일 통로 — **모든 도메인 어댑터가 이 위에 얹힌다.**
 *
 * 여기가 틀리면 어댑터 다섯이 한꺼번에 틀린다. 그런데 지금까지 테스트가
 * 없었다 — 각 어댑터 시험이 이 파일을 지나가며 우연히 덮고 있었을 뿐이다.
 * 메서드를 넓히면서 계약 자체를 고정한다.
 *
 * 고정하는 계약 셋:
 * - **던지지 않는다.** 전송 실패도 계약 위반도 `{ ok: false, error }` 다
 * - **토큰이 없으면 보내지 않는다.** 죽은 걸 아는 토큰으로 401 을 받지 않는다
 * - **본문 없는 성공은 `data: null`** — 204 를 실패로 읽지 않는다
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

type SecureMock = { __store: Map<string, string> };
const secure = jest.requireMock("expo-secure-store") as SecureMock;

/** 살아 있는 세션 — 없으면 요청 자체가 나가지 않는다 */
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

const respond = (status: number, body: string) =>
  ({ ok: status >= 200 && status < 300, status, text: async () => body }) as Response;

const mockFetch = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
  const fn = jest.fn(impl);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
};

/**
 * 답하지 않는 서버 — 중단될 때까지 매달린다. **이미 중단된 신호도 본다**:
 * 실제 `fetch` 는 그때 즉시 거절하는데, `addEventListener` 만 걸면 이미 지나간
 * 이벤트를 영영 기다려 시험이 멈춘다.
 */
const hangUntilAbort = (init: RequestInit, reject: (reason: Error) => void) => {
  if (init.signal?.aborted === true) {
    reject(new Error("aborted"));
    return;
  }
  init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
};

const lastInit = (fn: ReturnType<typeof mockFetch>) => fn.mock.calls[0]![1];
const headersOf = (fn: ReturnType<typeof mockFetch>) =>
  lastInit(fn).headers as Record<string, string>;

beforeEach(() => {
  secure.__store.clear();
  jest.clearAllMocks();
  baseUrl.mockReturnValue("http://api.test");
  seedSession();
});

describe("요청 조립", () => {
  const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

  it.each(METHODS)("%s 를 그대로 보낸다", async (method) => {
    const fetchMock = mockFetch(async () => respond(200, "{}"));

    await authedRequest(method, "/api/v1/thing");

    expect(fetchMock.mock.calls[0]![0]).toBe("http://api.test/api/v1/thing");
    expect(lastInit(fetchMock).method).toBe(method);
  });

  it("Bearer 토큰을 SecureStore 세션에서 싣는다", async () => {
    const fetchMock = mockFetch(async () => respond(200, "{}"));

    await authedRequest("GET", "/x");

    expect(headersOf(fetchMock).Authorization).toBe("Bearer live-access");
    expect(headersOf(fetchMock).Accept).toBe("application/json");
  });

  it("본문이 있을 때만 Content-Type 을 붙인다 — 빈 DELETE 에 붙이지 않는다", async () => {
    const withBody = mockFetch(async () => respond(200, "{}"));
    await authedRequest("PATCH", "/x", { title: "고침" });
    expect(headersOf(withBody)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(String(lastInit(withBody).body))).toEqual({ title: "고침" });

    const withoutBody = mockFetch(async () => respond(204, ""));
    await authedRequest("DELETE", "/x");
    expect(headersOf(withoutBody)["Content-Type"]).toBeUndefined();
    expect(lastInit(withoutBody).body).toBeUndefined();
  });
});

describe("응답", () => {
  it("2xx 는 파싱한 본문을 그대로 준다 — 검증하지 않는다", async () => {
    mockFetch(async () => respond(200, '{"뭐든":"들어온다"}'));

    expect(await authedRequest("GET", "/x")).toEqual({ ok: true, data: { 뭐든: "들어온다" } });
  });

  it("본문 없는 성공(204)은 data 가 null 이다 — 실패로 읽지 않는다", async () => {
    // 삭제·폐기처럼 돌려받을 것이 없는 호출이 이 길로 온다
    mockFetch(async () => respond(204, ""));

    expect(await authedRequest("DELETE", "/x")).toEqual({ ok: true, data: null });
  });

  it("2xx 인데 JSON 이 아니면 malformed 다", async () => {
    mockFetch(async () => respond(200, "<html>"));

    expect(await authedRequest("GET", "/x")).toEqual({ ok: false, error: { code: "malformed" } });
  });

  it("4xx·5xx 는 상태 코드와 오류 본문을 실어 올린다 — 어댑터가 code 를 읽는다", async () => {
    mockFetch(async () => respond(400, '{"code":"INVALID_REQUEST"}'));

    expect(await authedRequest("PUT", "/x", {})).toEqual({
      ok: false,
      error: { code: "http", status: 400, body: { code: "INVALID_REQUEST" } },
    });
  });

  it("오류 본문이 JSON 이 아니어도 여기서 또 실패하지 않는다", async () => {
    mockFetch(async () => respond(502, "Bad Gateway"));

    expect(await authedRequest("GET", "/x")).toEqual({
      ok: false,
      error: { code: "http", status: 502, body: null },
    });
  });
});

describe("보내지 않는 경우 — fail-closed", () => {
  it("세션이 없으면 요청하지 않고 unauthenticated 로 닫는다", async () => {
    // 이미 죽은 걸 아는 토큰을 보내 401 을 받느니 여기서 접는다
    secure.__store.clear();
    const fetchMock = mockFetch(async () => respond(200, "{}"));

    expect(await authedRequest("GET", "/x")).toEqual({
      ok: false,
      error: { code: "unauthenticated" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("주소가 비면 기본 주소를 지어내지 않는다", async () => {
    baseUrl.mockReturnValue("");
    const fetchMock = mockFetch(async () => respond(200, "{}"));

    expect(await authedRequest("GET", "/x")).toEqual({
      ok: false,
      error: { code: "unconfigured" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("전송 실패 — 던지지 않는다", () => {
  it("fetch 가 던지면 network 다", async () => {
    mockFetch(async () => {
      throw new TypeError("Network request failed");
    });

    expect(await authedRequest("GET", "/x")).toEqual({ ok: false, error: { code: "network" } });
  });

  it("타임아웃도 network 다 — 사용자에게는 같은 상황이다", async () => {
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    expect(await authedRequest("GET", "/x", undefined, { timeoutMs: 10 })).toEqual({
      ok: false,
      error: { code: "network" },
    });
  });

  it("바깥에서 취소하면 요청도 끊긴다 — 화면이 벗어날 때", async () => {
    // 요청이 **나간 뒤에** 화면이 벗어난다 — 바깥 신호를 내부 컨트롤러로 잇는
    // 다리(`onExternalAbort`)가 이때 일한다. 부르기 전에 끊으면 그 다리가
    // 아니라 `external.aborted` 선검사에 걸려 다른 길을 재게 된다.
    const controller = new AbortController();
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          hangUntilAbort(init, reject);
          controller.abort();
        }),
    );

    expect(await authedRequest("GET", "/x", undefined, { signal: controller.signal })).toEqual({
      ok: false,
      error: { code: "network" },
    });
  });

  it("이미 취소된 신호로 부르면 즉시 닫힌다", async () => {
    const controller = new AbortController();
    controller.abort();
    mockFetch((_url, init) => new Promise((_resolve, reject) => hangUntilAbort(init, reject)));

    expect(await authedRequest("GET", "/x", undefined, { signal: controller.signal })).toEqual({
      ok: false,
      error: { code: "network" },
    });
  });
});
