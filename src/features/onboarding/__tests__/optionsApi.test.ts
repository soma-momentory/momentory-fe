import { SESSION_KEY } from "@/features/auth/model/auth";
import { OPTIONS_PATH, fetchOnboardingOptions } from "@/features/onboarding/data/optionsApi";
import { getApiBaseUrl } from "@/lib/config";

/**
 * `GET /api/v1/onboarding/options` 계약 시험.
 *
 * 이 응답이 **온보딩이 그리는 칩 전부**를 정한다. 틀리면 고를 수 없는 항목이
 * 생기거나, 반대로 서버가 모르는 코드를 초안에 담아 `10` 의 저장이 통째로
 * 거절된다. 그래서 **부분적으로 어긋난 응답**을 가장 많이 건다 — 하나가
 * 망가졌다고 나머지까지 버리면 안 된다.
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

type SecureMock = { __store: Map<string, string> };
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const BODY = {
  nickname: { maxLength: 10, duplicateAllowed: true },
  genders: [
    { code: "MALE", label: "남성" },
    { code: "FEMALE", label: "여성" },
    { code: "UNSPECIFIED", label: "선택 안 함" },
  ],
  interestAreas: [
    { code: "STUDY", label: "학업" },
    { code: "OTHER", label: "기타" },
  ],
  reflectionTimeFormat: "HH:mm",
  defaultTimeZone: "Asia/Seoul",
};

const respond = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "not json" : JSON.stringify(body)),
  }) as Response;

const mockFetch = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
  const fn = jest.fn(impl);
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
};

beforeEach(() => {
  secure.__store.clear();
  jest.clearAllMocks();
  baseUrl.mockReturnValue("http://api.test");
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({
      accessToken: "live-access",
      refreshToken: "r",
      expiresAt: Date.now() + 60_000,
      userId: 7,
    }),
  );
});

describe("성공", () => {
  it("합의한 경로로 GET 하고 code 를 칩 id 로 옮긴다", async () => {
    const fetchMock = mockFetch(async () => respond(200, BODY));

    const result = await fetchOnboardingOptions();

    expect(fetchMock.mock.calls[0]![0]).toBe(`http://api.test${OPTIONS_PATH}`);
    expect(result).toEqual({
      ok: true,
      data: {
        nickname: { maxLength: 10, duplicateAllowed: true },
        genders: [
          { id: "MALE", label: "남성" },
          { id: "FEMALE", label: "여성" },
          { id: "UNSPECIFIED", label: "선택 안 함" },
        ],
        interestAreas: [
          { id: "STUDY", label: "학업" },
          { id: "OTHER", label: "기타" },
        ],
        reflectionTimeFormat: "HH:mm",
        defaultTimeZone: "Asia/Seoul",
      },
    });
  });

  it("서버가 늘린 항목도 그대로 들어온다 — 화면이 아는 8개로 자르지 않는다", async () => {
    mockFetch(async () =>
      respond(200, {
        ...BODY,
        interestAreas: [...BODY.interestAreas, { code: "MONEY", label: "돈·재정" }],
      }),
    );

    const result = await fetchOnboardingOptions();

    expect(result.ok && result.data.interestAreas?.map((o) => o.id)).toEqual([
      "STUDY",
      "OTHER",
      "MONEY",
    ]);
  });
});

describe("부분적으로 어긋난 응답 — 멀쩡한 절반을 잃지 않는다", () => {
  it("성별만 어긋나면 성별만 null 이고 관심사는 살아 있다", async () => {
    mockFetch(async () => respond(200, { ...BODY, genders: "이건 배열이 아니다" }));

    const result = await fetchOnboardingOptions();

    expect(result.ok && result.data.genders).toBeNull();
    expect(result.ok && result.data.interestAreas).toHaveLength(2);
  });

  it("항목 하나가 망가지면 그것만 버린다", async () => {
    mockFetch(async () =>
      respond(200, {
        ...BODY,
        interestAreas: [{ code: "STUDY", label: "학업" }, { code: "" }, { label: "라벨만" }, 42],
      }),
    );

    const result = await fetchOnboardingOptions();

    expect(result.ok && result.data.interestAreas).toEqual([{ id: "STUDY", label: "학업" }]);
  });

  it("남는 항목이 없으면 null 이다 — 빈 목록으로 그리면 아무것도 고를 수 없다", async () => {
    mockFetch(async () => respond(200, { ...BODY, interestAreas: [] }));

    const result = await fetchOnboardingOptions();

    expect(result.ok && result.data.interestAreas).toBeNull();
  });

  it("닉네임 상한이 0 이하면 받지 않는다 — 입력칸이 잠긴다", async () => {
    mockFetch(async () => respond(200, { ...BODY, nickname: { maxLength: 0 } }));

    const result = await fetchOnboardingOptions();

    expect(result.ok && result.data.nickname).toBeNull();
  });

  it("duplicateAllowed 가 없으면 「허용」으로 읽는다 — 지금 막을 방법이 없는 쪽이 기본이다", async () => {
    mockFetch(async () => respond(200, { ...BODY, nickname: { maxLength: 12 } }));

    const result = await fetchOnboardingOptions();

    expect(result.ok && result.data.nickname).toEqual({ maxLength: 12, duplicateAllowed: true });
  });
});

describe("실패", () => {
  it("401 은 unauthorized 다", async () => {
    mockFetch(async () => respond(401, { code: "AUTHENTICATION_REQUIRED" }));

    expect(await fetchOnboardingOptions()).toEqual({ ok: false, code: "unauthorized" });
  });

  it("보낼 토큰이 없으면 no_session 이고 요청하지 않는다", async () => {
    secure.__store.clear();
    const fetchMock = mockFetch(async () => respond(200, BODY));

    expect(await fetchOnboardingOptions()).toEqual({ ok: false, code: "no_session" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("전송 실패는 network 다", async () => {
    mockFetch(async () => {
      throw new Error("offline");
    });

    expect(await fetchOnboardingOptions()).toEqual({ ok: false, code: "network" });
  });

  it("본문이 객체가 아니면 malformed 다 — 배열도 객체가 아니다", async () => {
    mockFetch(async () => respond(200, ["아니오"]));

    expect(await fetchOnboardingOptions()).toEqual({ ok: false, code: "malformed" });
  });

  it("셋 다 못 읽으면 malformed 다 — 「받았다」로 굳으면 대역인 채로 다시 묻지 않는다", async () => {
    mockFetch(async () =>
      respond(200, { nickname: null, genders: null, interestAreas: null, defaultTimeZone: "KST" }),
    );

    expect(await fetchOnboardingOptions()).toEqual({ ok: false, code: "malformed" });
  });

  it("주소가 비면 unconfigured 다", async () => {
    baseUrl.mockReturnValue("");

    expect(await fetchOnboardingOptions()).toEqual({ ok: false, code: "unconfigured" });
  });
});
