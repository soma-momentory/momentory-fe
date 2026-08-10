import { SESSION_KEY } from "@/features/auth/model/auth";
import {
  COMPLETE_ONBOARDING_PATH,
  completeOnboarding,
  toRequestBody,
  type OnboardingSubmission,
} from "@/features/onboarding/data/completeOnboardingApi";
import { getApiBaseUrl } from "@/lib/config";

/**
 * `PUT /api/v1/users/me/onboarding` 계약 시험.
 *
 * **여기서 틀리면 온보딩 열한 화면의 답이 통째로 버려진다** — 그것도 조용히:
 * 400 하나면 사용자는 「저장하지 못했다」는 한 줄만 보고 무엇이 문제인지 알 수
 * 없다. 그래서 성공보다 **번역**(화면의 말 → 서버의 말)을 더 많이 건다.
 */
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: jest.fn(() => "http://api.test"),
}));

const baseUrl = jest.mocked(getApiBaseUrl);

type SecureMock = { __store: Map<string, string> };
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const submission = (over: Partial<OnboardingSubmission> = {}): OnboardingSubmission => ({
  nickname: "지현",
  age: "25",
  gender: "FEMALE",
  interests: ["RELATIONSHIP"],
  interestOther: "",
  restMethods: ["WALKING"],
  restMethodOther: "",
  retroTime: "21:30",
  notifyRetro: true,
  calendarLinked: false,
  ...over,
});

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

const OK = { userId: 7, onboardingRequired: false };

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

describe("번역 — 화면의 말이 서버의 말이 된다", () => {
  it("서버 필드 이름으로 옮긴다", () => {
    expect(toRequestBody(submission())).toEqual({
      nickname: "지현",
      age: 25,
      gender: "FEMALE",
      interestAreas: ["RELATIONSHIP"],
      otherInterestDetail: null,
      restMethods: ["WALKING"],
      otherRestMethodDetail: null,
      reflectionTime: "21:30",
      calendarIntegrationEnabled: false,
      notificationEnabled: true,
    });
  });

  it("나이는 정수이거나 없다 — 빈 문자열은 「묻지 않기를 골랐다」", () => {
    expect(toRequestBody(submission({ age: "" })).age).toBeNull();
    expect(toRequestBody(submission({ age: " 31 " })).age).toBe(31);
    // 숫자가 아니면 보내지 않는다 — 서버에 문자열 나이를 눕히지 않는다
    expect(toRequestBody(submission({ age: "스물" })).age).toBeNull();
  });

  it("성별 미선택은 「선택 안 함」으로 접힌다 — 서버에 그 구별이 없다", () => {
    // 05-b 를 건너뛴 것과 「선택 안 함」을 고른 것을 초안은 구별하지만
    // 서버 gender 는 필수이고 값이 셋뿐이다. 이 경계에서 구별이 사라진다.
    expect(toRequestBody(submission({ gender: null })).gender).toBe("UNSPECIFIED");
  });

  it("기타 직접 입력은 칩이 켜져 있을 때만 보낸다", () => {
    const off = toRequestBody(submission({ interests: ["SELF"], interestOther: "반려동물" }));
    expect(off.otherInterestDetail).toBeNull();

    const on = toRequestBody(submission({ interests: ["OTHER"], interestOther: " 반려동물 " }));
    expect(on.otherInterestDetail).toBe("반려동물");
  });

  it("쉬는 방법이 비면 빈 배열이 아니라 「유지」로 보낸다 — 빈 배열은 400 이다", () => {
    // 비울 방법이 계약에 없다. 빈 배열을 보내면 M2 의 저장이 통째로 거절된다.
    expect(toRequestBody(submission({ restMethods: [] })).restMethods).toBeNull();
  });

  it("쉬는 방법의 기타도 같은 규칙이다 — 서버가 OTHER 와 함께 요구한다", () => {
    const on = toRequestBody(submission({ restMethods: ["OTHER"], restMethodOther: "뜨개질" }));
    expect(on.otherRestMethodDetail).toBe("뜨개질");

    // 공백뿐이면 「없음」이다 — 빈 문자열을 눕히면 서버가 400 을 준다
    const blank = toRequestBody(submission({ restMethods: ["OTHER"], restMethodOther: "   " }));
    expect(blank.otherRestMethodDetail).toBeNull();
  });
});

describe("요청", () => {
  it("합의한 경로로 Bearer 를 실어 PUT 한다", async () => {
    const fetchMock = mockFetch(async () => respond(200, OK));

    await completeOnboarding(submission());

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`http://api.test${COMPLETE_ONBOARDING_PATH}`);
    expect(init.method).toBe("PUT");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer live-access");
  });
});

describe("응답", () => {
  it("성공이면 온보딩 필요 여부를 그대로 돌려준다", async () => {
    mockFetch(async () => respond(200, OK));

    await expect(completeOnboarding(submission())).resolves.toEqual({
      ok: true,
      data: { onboardingRequired: false },
    });
  });

  it("200 인데 아직 「온보딩 필요」면 그대로 알린다 — 화면이 판단한다", async () => {
    mockFetch(async () => respond(200, { userId: 7, onboardingRequired: true }));

    await expect(completeOnboarding(submission())).resolves.toEqual({
      ok: true,
      data: { onboardingRequired: true },
    });
  });

  it("형태가 계약과 다르면 성공이 아니다", async () => {
    mockFetch(async () => respond(200, { userId: 7 }));

    await expect(completeOnboarding(submission())).resolves.toEqual({
      ok: false,
      code: "malformed",
    });
  });

  it("400 은 사용자가 고칠 수 있는 것이다 — 서버 오류와 가른다", async () => {
    mockFetch(async () => respond(400, { code: "INVALID_REQUEST", message: "잘못된 요청입니다." }));

    await expect(completeOnboarding(submission())).resolves.toEqual({
      ok: false,
      code: "invalid",
    });
  });

  it("401 은 세션이 거부된 것이다", async () => {
    mockFetch(async () => respond(401, { code: "AUTHENTICATION_REQUIRED" }));

    await expect(completeOnboarding(submission())).resolves.toEqual({
      ok: false,
      code: "unauthorized",
    });
  });

  it("보낼 토큰이 없으면 요청하지 않는다 — 401 과 다르다", async () => {
    secure.__store.clear();
    const fetchMock = mockFetch(async () => respond(200, OK));

    await expect(completeOnboarding(submission())).resolves.toEqual({
      ok: false,
      code: "no_session",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("서버 주소가 없으면 요청하지 않는다", async () => {
    baseUrl.mockReturnValue("");

    await expect(completeOnboarding(submission())).resolves.toEqual({
      ok: false,
      code: "unconfigured",
    });
  });

  it("던지지 않는다 — 연결이 끊겨도 사유로 닫는다", async () => {
    mockFetch(async () => {
      throw new Error("offline");
    });

    await expect(completeOnboarding(submission())).resolves.toEqual({
      ok: false,
      code: "network",
    });
  });
});
