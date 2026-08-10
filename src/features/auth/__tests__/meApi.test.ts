import { ME_PATH, fetchMe } from "../data/meApi";
import { SESSION_KEY } from "../model/auth";

import { getApiBaseUrl } from "@/lib/config";

/**
 * `GET /api/v1/users/me` 계약 시험.
 *
 * 이 응답이 **진입 분기를 정한다** — 틀리면 온보딩을 마친 사람이 온보딩을 다시
 * 보거나, 반대로 처음 온 사람이 빈 홈에 떨어진다. 그래서 성공 하나보다
 * **형태 위반·모르는 값·401** 을 더 많이 건다.
 *
 * `lib/http.ts` 를 지나가는 그대로 시험한다 — 목을 어댑터 바로 밑에 두면
 * Bearer 주입·경로·타임아웃이 시험 밖으로 빠진다.
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

type SecureMock = { __store: Map<string, string> };
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const PROFILE = {
  nickname: "모리",
  age: 25,
  gender: "FEMALE",
  interestAreas: ["CAREER", "RELATIONSHIP"],
  otherInterestDetail: null,
  restMethods: ["READING", "WALKING"],
  otherRestMethodDetail: null,
  reflectionTime: "21:30",
  calendarIntegrationEnabled: true,
  notificationEnabled: true,
};

const BODY = { userId: 7, role: "USER", onboardingRequired: false, profile: PROFILE };

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

/** 살아 있는 세션 — 없으면 요청이 나가기 전에 닫힌다 */
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

describe("요청", () => {
  it("합의한 경로로 Bearer 를 실어 GET 한다", async () => {
    const fetchMock = mockFetch(async () => respond(200, BODY));

    await fetchMe();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`http://api.test${ME_PATH}`);
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer live-access");
  });
});

describe("성공 — 서버 값을 화면 값으로 옮긴다", () => {
  it("코드는 옮기지 않고 그대로 통과시킨다 — 목록의 주인이 서버다", async () => {
    mockFetch(async () =>
      respond(200, {
        ...BODY,
        profile: { ...PROFILE, interestAreas: ["RELATIONSHIP", "OTHER", "SELF"] },
      }),
    );

    const result = await fetchMe();

    expect(result).toEqual({
      ok: true,
      data: {
        userId: 7,
        onboardingRequired: false,
        profile: {
          nickname: "모리",
          age: "25",
          gender: "FEMALE",
          interests: ["RELATIONSHIP", "OTHER", "SELF"],
          interestOther: "",
          restMethods: ["READING", "WALKING"],
          restMethodOther: "",
          retroTime: "21:30",
          calendarLinked: true,
          notifyRetro: true,
        },
      },
    });
  });

  it("알림 켜짐은 안 준 것과 끈 것을 가른다 — 없는 것으로 덮지 않는다", async () => {
    // `undefined` 면 `adoptProfile` 이 지금 값을 그대로 둔다. `false` 로 접으면
    // 앱을 다시 열 때마다 사용자가 켠 알림이 꺼진다.
    mockFetch(async () =>
      respond(200, { ...BODY, profile: { ...PROFILE, notificationEnabled: undefined } }),
    );

    const result = await fetchMe();

    expect(result.ok && result.data.profile?.notifyRetro).toBeUndefined();
  });

  it("「기타」 직접 입력을 옮긴다 — 없으면 빈 문자열이다", async () => {
    mockFetch(async () =>
      respond(200, {
        ...BODY,
        profile: { ...PROFILE, otherInterestDetail: " 반려동물 ", otherRestMethodDetail: null },
      }),
    );

    const result = await fetchMe();

    expect(result.ok && result.data.profile?.interestOther).toBe("반려동물");
    expect(result.ok && result.data.profile?.restMethodOther).toBe("");
  });

  it("성별이 비면 「선택 안 함」으로 읽는다 — 미선택(null)은 서버에 없다", async () => {
    mockFetch(async () => respond(200, { ...BODY, profile: { ...PROFILE, gender: null } }));

    const result = await fetchMe();

    expect(result.ok && result.data.profile?.gender).toBe("UNSPECIFIED");
  });

  it("나이는 정수로 오고 화면은 문자열이다. 없으면 빈 문자열", async () => {
    mockFetch(async () => respond(200, { ...BODY, profile: { ...PROFILE, age: null } }));

    const result = await fetchMe();

    expect(result.ok && result.data.profile?.age).toBe("");
  });

  it("온보딩 전에는 프로필이 없다 — 그래도 성공이다", async () => {
    mockFetch(async () => respond(200, { userId: 7, role: "USER", onboardingRequired: true }));

    const result = await fetchMe();

    expect(result).toEqual({
      ok: true,
      data: { userId: 7, onboardingRequired: true, profile: null },
    });
  });

  it("우리가 모르는 코드도 그대로 든다 — 버리면 마이에서 저장하는 순간 그 답이 지워진다", async () => {
    // 서버가 관심사를 늘렸을 때, FE 가 아는 것만 남기면 `M2` 의 저장이
    // 사용자가 고르지도 않은 삭제를 하게 된다
    mockFetch(async () =>
      respond(200, {
        ...BODY,
        profile: { ...PROFILE, interestAreas: ["MONEY", "HEALTH", 42, ""] },
      }),
    );

    const result = await fetchMe();

    // 문자열이 아닌 것과 빈 것만 걸러낸다
    expect(result.ok && result.data.profile?.interests).toEqual(["MONEY", "HEALTH"]);
  });
});

describe("형태 위반 — 서버를 믿지 않는다", () => {
  it("onboardingRequired 가 없으면 malformed — 이 값으로 진입을 가른다", async () => {
    mockFetch(async () => respond(200, { userId: 7, role: "USER" }));

    expect(await fetchMe()).toEqual({ ok: false, code: "malformed" });
  });

  it("userId 가 숫자가 아니면 malformed", async () => {
    mockFetch(async () => respond(200, { ...BODY, userId: "7" }));

    expect(await fetchMe()).toEqual({ ok: false, code: "malformed" });
  });

  it("닉네임 없는 프로필은 통째로 버린다 — 이름 없는 프로필로 화면을 채우지 않는다", async () => {
    mockFetch(async () => respond(200, { ...BODY, profile: { ...PROFILE, nickname: "  " } }));

    const result = await fetchMe();

    expect(result.ok && result.data.profile).toBeNull();
  });

  it("200 인데 JSON 이 아니면 malformed", async () => {
    mockFetch(async () => respond(200, undefined));

    expect(await fetchMe()).toEqual({ ok: false, code: "malformed" });
  });
});

describe("실패 — 401 과 나머지를 가른다", () => {
  it("401 은 unauthorized 다 — 세션 폐기 신호는 이것뿐이다", async () => {
    mockFetch(async () => respond(401, { code: "AUTHENTICATION_REQUIRED", message: "인증 필요" }));

    expect(await fetchMe()).toEqual({ ok: false, code: "unauthorized" });
  });

  it("본문 코드가 상태 코드보다 정확하다", async () => {
    mockFetch(async () => respond(403, { code: "AUTHENTICATION_REQUIRED" }));

    expect(await fetchMe()).toEqual({ ok: false, code: "unauthorized" });
  });

  it("보낼 토큰이 없으면 no_session 이다 — 요청조차 하지 않는다", async () => {
    // ⚠ 401 과 같은 코드로 접으면, 갱신이 네트워크로 실패한 경우까지
    // 세션 폐기로 읽혀 멀쩡한 로그인이 날아간다
    secure.__store.clear();
    const fetchMock = mockFetch(async () => respond(200, BODY));

    expect(await fetchMe()).toEqual({ ok: false, code: "no_session" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("주소가 비면 unconfigured 다", async () => {
    baseUrl.mockReturnValue("");
    const fetchMock = mockFetch(async () => respond(200, BODY));

    expect(await fetchMe()).toEqual({ ok: false, code: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("전송 실패·타임아웃은 network 다", async () => {
    mockFetch(async () => {
      throw new Error("network down");
    });

    expect(await fetchMe()).toEqual({ ok: false, code: "network" });
  });

  it("5xx 는 server 다 — 세션을 건드릴 근거가 아니다", async () => {
    mockFetch(async () => respond(503, null));

    expect(await fetchMe()).toEqual({ ok: false, code: "server" });
  });
});
