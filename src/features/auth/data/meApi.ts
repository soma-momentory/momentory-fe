import type { Gender } from "@/features/onboarding/model/draft";
import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 현재 로그인 사용자 — `GET /api/v1/users/me` (`docs/api/openapi.json`).
 *
 * ```
 * 200 { userId, role, onboardingRequired, profile: Profile | null }
 *     Profile { nickname, age: int|null, gender, interestAreas[],
 *               reflectionTime "21:30", calendarIntegrationEnabled }
 * 401 { code: "AUTHENTICATION_REQUIRED" }
 * ```
 *
 * **온보딩을 마쳤는가의 정본이 여기 있다.** 그전까지 그 판정은 기기 메모리에만
 * 있어서(`features/onboarding/model/completion.ts`) 앱을 껐다 켜면 온보딩을 다시
 * 봤다 — MMKV(M3) 를 기다리지 않고 서버 답으로 닫는다.
 *
 * **서버 enum 은 이 파일 밖으로 나가지 않는다.** 화면과 store 는 이미 자기 id
 * 체계(`"relations"` · `"none"` …)를 쓰고 있고, 그 둘이 섞이면 어느 쪽 값인지
 * 매번 확인해야 한다. 경계에서 한 번 옮긴다 — 그게 `data/` 가 있는 이유다.
 *
 * ⚠ **서버 `Profile` 에 없는 것**: `restMethods`(`07`) · `notifyDaily/Weekly/News` ·
 * 기타 관심사 직접 입력(`interestOther`). 지금 값을 덮지 않고 그대로 둔다.
 */
export const ME_PATH = "/api/v1/users/me";

/**
 * 스플래시가 이 요청을 기다린다 — 기본 25초(`DEFAULT_TIMEOUT_MS`)는 LLM 턴 기준이라
 * 첫 화면을 그만큼 붙잡아 둘 수 없다. 못 받으면 로컬 판정으로 넘어간다.
 */
export const ME_TIMEOUT_MS = 8_000;

/** 서버가 아는 사용자 — 화면이 쓰는 모양으로 옮긴 뒤의 것 */
export type Me = {
  userId: number;
  /** `true` 면 온보딩부터. **이 값이 완료 플래그의 정본이다** */
  onboardingRequired: boolean;
  /** 온보딩 전에는 없다 — 그때는 아무것도 덮지 않는다 */
  profile: MeProfile | null;
};

/** 필드 이름·값이 전부 FE 것이다. 서버 이름(`reflectionTime` 등)은 여기서 끝난다 */
export type MeProfile = {
  nickname: string;
  /** 빈 문자열은 「나이를 묻지 않기로 했다」 — draft·useProfile 과 같은 규약 */
  age: string;
  gender: Gender;
  interests: string[];
  retroTime: string;
  calendarLinked: boolean;
};

/**
 * 실패 사유 — **코드**다. 문구는 `auth.ts` 가 정한다.
 *
 * `no_session` 과 `unauthorized` 를 **반드시 가른다.** 앞의 것은 요청을 보내지도
 * 못한 경우이고 거기엔 **갱신이 네트워크 문제로 실패한 경우가 섞여 있다**
 * (`auth.ts` 의 `retry` 분기 — 그때 세션은 멀쩡히 살아 있다). 둘을 한 코드로
 * 묶으면 순간적인 연결 문제 한 번에 멀쩡한 로그인이 날아간다.
 */
export type MeFailureCode =
  /** 401 — 서버가 이 access token 을 거부했다. **세션 폐기 신호는 이것뿐이다** */
  | "unauthorized"
  /** 보낼 토큰이 없어 요청하지 않았다 — 비로그인 · 손상 · **갱신 일시 실패** */
  | "no_session"
  /** 요청이 서버에 닿지 못했다 */
  | "network"
  /** 5xx · 알 수 없는 상태 */
  | "server"
  /** 200 인데 형태가 계약과 다르다 */
  | "malformed"
  /** `EXPO_PUBLIC_API_BASE_URL` 이 비었다 */
  | "unconfigured";

export type MeResult = { ok: true; data: Me } | { ok: false; code: MeFailureCode };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** 서버가 본문에 실어 주는 오류 코드 → 우리 사유. 상태 코드보다 이쪽이 정확하다 */
const BODY_CODES: Record<string, MeFailureCode> = {
  AUTHENTICATION_REQUIRED: "unauthorized",
};

const readBodyCode = (body: unknown): MeFailureCode | null => {
  if (!isObject(body)) return null;
  return typeof body.code === "string" ? (BODY_CODES[body.code] ?? null) : null;
};

const mapError = (error: HttpError): MeFailureCode => {
  switch (error.code) {
    case "unconfigured":
      return "unconfigured";
    case "unauthenticated":
      // **보내지 않았다.** 401 과 다르다 — 위 주석 참조
      return "no_session";
    case "network":
      return "network";
    case "malformed":
      return "malformed";
    case "http": {
      const fromBody = readBodyCode(error.body);
      if (fromBody != null) return fromBody;
      return error.status === 401 ? "unauthorized" : "server";
    }
  }
};

// ── 서버 값 → FE 값 ──────────────────────────────────────────────────────

/** `UNSPECIFIED` 는 「선택 안 함」(`"none"`)이다. 미선택(`null`)은 서버에 없다 */
const GENDERS: Record<string, Gender> = {
  MALE: "male",
  FEMALE: "female",
  UNSPECIFIED: "none",
};

/** `06` 의 칩 id 와 같은 값을 낸다. 둘만 이름이 다르다 — `RELATIONSHIP` · `OTHER` */
const INTERESTS: Record<string, string> = {
  STUDY: "study",
  CAREER: "career",
  WORK: "work",
  RELATIONSHIP: "relations",
  FAMILY: "family",
  SELF: "self",
  HEALTH: "health",
  OTHER: "etc",
};

// ── 런타임 검증 ──────────────────────────────────────────────────────────

/**
 * 프로필 하나. **`nickname` 이 없으면 통째로 `null`** — 이름 없는 프로필로
 * 화면을 채우면 온보딩을 마쳤는지 아닌지를 화면이 다시 추측하게 된다.
 * 나머지는 없거나 어긋나면 그 필드만 기본값으로 접는다.
 *
 * **모르는 관심사 코드는 버리고 나머지를 살린다** — 서버가 항목을 늘렸을 때
 * 프로필 전체가 사라지는 것보다 하나가 비는 편이 낫다.
 */
const toProfile = (v: unknown): MeProfile | null => {
  if (!isObject(v)) return null;
  if (typeof v.nickname !== "string" || v.nickname.trim().length === 0) return null;

  const areas = Array.isArray(v.interestAreas) ? v.interestAreas : [];

  return {
    nickname: v.nickname.trim(),
    // 서버는 정수 또는 null 이고 화면은 입력칸 문자열이다 — 없으면 빈 문자열
    age: typeof v.age === "number" && Number.isFinite(v.age) ? String(v.age) : "",
    gender: (typeof v.gender === "string" ? GENDERS[v.gender] : undefined) ?? "none",
    interests: areas
      .map((code) => (typeof code === "string" ? INTERESTS[code] : undefined))
      .filter((id): id is string => id !== undefined),
    // 시각이 비면 화면이 할 말을 잃는다 — 빈 값은 받지 않고 store 의 값을 지킨다
    retroTime: typeof v.reflectionTime === "string" ? v.reflectionTime : "",
    calendarLinked: v.calendarIntegrationEnabled === true,
  };
};

/** `userId` · `onboardingRequired` 가 어긋나면 `null` — 이 둘로 진입을 가른다 */
export const toMe = (v: unknown): Me | null => {
  if (!isObject(v)) return null;
  if (typeof v.userId !== "number" || !Number.isFinite(v.userId)) return null;
  if (typeof v.onboardingRequired !== "boolean") return null;

  return {
    userId: v.userId,
    onboardingRequired: v.onboardingRequired,
    // 온보딩 전에는 `null` 이고, 서버가 `@JsonInclude(NON_NULL)` 이라 아예 안 오기도 한다
    profile: toProfile(v.profile),
  };
};

// ── 호출 ────────────────────────────────────────────────────────────────

/** 지금 토큰의 주인을 서버에 묻는다. **던지지 않는다** */
export async function fetchMe(options?: { signal?: AbortSignal }): Promise<MeResult> {
  const result = await authedRequest<unknown>("GET", ME_PATH, undefined, {
    timeoutMs: ME_TIMEOUT_MS,
    signal: options?.signal,
  });
  if (!result.ok) return { ok: false, code: mapError(result.error) };

  const me = toMe(result.data);
  return me == null ? { ok: false, code: "malformed" } : { ok: true, data: me };
}
