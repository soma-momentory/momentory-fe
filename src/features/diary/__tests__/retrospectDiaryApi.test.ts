import { fetchRetrospectDiary } from "../data/retrospectDiaryApi";

import { getAccessToken } from "@/features/auth/model/auth";
import { getApiBaseUrl } from "@/lib/config";

/**
 * 서버 저장분 조회의 경계를 고정한다 — 형태가 맞으면 도메인 모양으로 옮기고,
 * 어떤 실패든(네트워크·404·형태 어긋남) `null` 로 접어 화면이 「서버 카드 없음」과
 * 똑같이 다루게 한다(로컬 카드로 떨어진다).
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

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getApiBaseUrl).mockReturnValue("http://api.test");
  jest.mocked(getAccessToken).mockResolvedValue("token");
});

describe("fetchRetrospectDiary — 서버 저장분을 도메인 모양으로 옮긴다", () => {
  it("일기 본문·리프레임·행동 카드를 모두 옮긴다 (id 는 문자열로)", async () => {
    mockFetch(
      respond(200, {
        diary: "오늘 발표를 무사히 마쳤다.",
        reframedDiary: "떨린 건 준비를 잘했다는 신호였다.",
        actionCard: {
          id: 7,
          situation: "발표를 앞두고 긴장했던 상황",
          targetAction: "심호흡을 세 번 하고 시작하기",
          detail: "떨림은 신호",
          createdDate: "2026-08-10",
          done: true,
          reflection: "생각보다 괜찮았다",
        },
      }),
    );

    expect(await fetchRetrospectDiary("1")).toEqual({
      body: "오늘 발표를 무사히 마쳤다.",
      reframedDiary: "떨린 건 준비를 잘했다는 신호였다.",
      actionCard: {
        id: "7",
        situation: "발표를 앞두고 긴장했던 상황",
        targetAction: "심호흡을 세 번 하고 시작하기",
        detail: "떨림은 신호",
        createdDate: "2026-08-10",
        done: true,
        reflection: "생각보다 괜찮았다",
      },
    });
  });

  it("행동 카드가 없는 일기 — actionCard 는 null, 본문은 옮긴다", async () => {
    mockFetch(respond(200, { diary: "짧게 남긴 오늘." }));

    expect(await fetchRetrospectDiary("1")).toEqual({
      body: "짧게 남긴 오늘.",
      reframedDiary: null,
      actionCard: null,
    });
  });

  it("본문(diary)이 없으면 형태가 어긋난 것 — null 로 접는다", async () => {
    mockFetch(respond(200, { reframedDiary: "본문 없이 이것만" }));

    expect(await fetchRetrospectDiary("1")).toBeNull();
  });

  it("404 등 실패는 null — 화면은 로컬 카드로 떨어진다", async () => {
    mockFetch(respond(404, { code: "RETROSPECT_SESSION_NOT_FOUND" }));

    expect(await fetchRetrospectDiary("1")).toBeNull();
  });
});
