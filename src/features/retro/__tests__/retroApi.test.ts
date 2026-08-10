import { sendTurn, startRetro } from "../data/retroApi";

import { getAccessToken } from "@/features/auth/model/auth";
import { getApiBaseUrl } from "@/lib/config";

/**
 * 404 의 뜻이 요청마다 다르다는 것을 고정한다.
 *
 * 시작 요청에는 지목할 세션이 없으므로 그 404 는 「세션이 없다」일 수 없다 —
 * 그렇게 접으면 화면이 「처음부터 다시 시작해 주세요」를 띄우고, 다시 시작해도
 * 같은 404 라 사용자는 같은 자리에 선다. 실제로 BE 배포 전 그 증상이 났다.
 */
jest.mock("@/lib/config", () => ({ getApiBaseUrl: jest.fn(() => "http://api.test") }));
jest.mock("@/features/auth/model/auth", () => ({
  getAccessToken: jest.fn(async () => "token"),
}));

const respond = (status: number, body?: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  }) as Response;

const mockFetch = (response: Response) => {
  const fn = jest.fn(async () => response);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
};

const START_INPUT = { schedules: [], currentEmotion: "calm" };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getApiBaseUrl).mockReturnValue("http://api.test");
  jest.mocked(getAccessToken).mockResolvedValue("token");
});

describe("404 — 세션을 지목했는가에 따라 갈린다", () => {
  it("시작의 404 는 server 다 — 아직 세션이 없으니 세션 탓일 수 없다", async () => {
    mockFetch(respond(404));

    expect(await startRetro(START_INPUT)).toEqual({ ok: false, code: "server" });
  });

  it("턴의 404 는 session_not_found 다 — 지목한 세션이 없거나 남의 것이다", async () => {
    mockFetch(respond(404));

    expect(await sendTurn(1, { content: "네" })).toEqual({
      ok: false,
      code: "session_not_found",
    });
  });

  it("본문 코드는 상태 코드보다 우선한다 — 서버가 이유를 말했으면 그걸 믿는다", async () => {
    mockFetch(respond(404, { code: "RETROSPECT_SESSION_NOT_FOUND" }));

    expect(await startRetro(START_INPUT)).toEqual({
      ok: false,
      code: "session_not_found",
    });
  });
});

describe("나머지 상태 코드는 두 호출이 같다", () => {
  it.each([
    [400, "invalid_request"],
    [401, "unauthenticated"],
    [500, "server"],
    [503, "server"],
  ])("%i 는 %s 다", async (status, code) => {
    mockFetch(respond(status));

    expect(await startRetro(START_INPUT)).toEqual({ ok: false, code });
    expect(await sendTurn(1, { content: "네" })).toEqual({ ok: false, code });
  });
});
