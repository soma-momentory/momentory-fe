import { getApiBaseUrl } from "@/lib/config";

/**
 * 카카오 세션 교환 — `POST /api/v1/auth/kakao` (BE 합의 2026-08-07).
 *
 * ```
 * POST {API_BASE_URL}/api/v1/auth/kakao
 * Content-Type: application/json
 * Accept: application/json
 *
 * { "accessToken": "<카카오 SDK access token>" }
 * ```
 *
 * **서버를 믿지 않고 응답을 런타임에 검사한다.** `fetch` 는 형태를 보장하지
 * 않으므로 `as` 로 단언하면 필드가 빠진 200 응답이 그대로 세션이 되어
 * SecureStore 에 눕는다 — 다음 부트에서야 이상한 세션으로 드러난다.
 *
 * **토큰과 응답 본문을 로그로 남기지 않는다.** 실패도 사유 코드까지만 남기고
 * 본문은 버린다(`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 *
 * 갱신(refresh)은 여기 없다 — 로그인 직후 최초 세션을 만드는 자리일 뿐이고,
 * 만료된 세션을 새 토큰으로 바꾸는 것은 `reissueApi.ts`(`POST …/reissue`) 몫이다.
 */
export const KAKAO_LOGIN_PATH = "/api/v1/auth/kakao";

/** 서버가 응답을 주지 않을 때 끊는 시간. 무한 대기는 버튼이 영영 잠기는 것과 같다 */
export const REQUEST_TIMEOUT_MS = 10_000;

/** 서버가 발급한 **모멘토리** 세션. 카카오 토큰은 여기 없다 — 보내고 버렸다 */
export type KakaoLoginSession = {
  accessToken: string;
  refreshToken: string;
  /** **초 단위**다. 절대 시각으로 바꾸는 곳은 `auth.ts` 하나뿐이다 */
  accessTokenExpiresIn: number;
  userId: number;
  /** true 면 온보딩부터, false 면 홈으로 */
  onboardingRequired: boolean;
};

/**
 * 실패 사유. **화면 문구가 아니라 코드**다 — 문구는 `auth.ts` 가 정한다.
 * 여기서 문장을 만들면 같은 실패에 두 문구가 생긴다.
 */
export type AuthFailureCode =
  /** 400 `INVALID_REQUEST` — 우리가 잘못 보냈다 */
  | "invalid_request"
  /** 401 `KAKAO_TOKEN_INVALID` — 카카오 토큰이 만료·위조·불일치 */
  | "kakao_token_invalid"
  /** 502·503 — 카카오 쪽이 응답하지 않는다. 우리 잘못도 사용자 잘못도 아니다 */
  | "kakao_upstream"
  /** 그 밖의 5xx · 알 수 없는 상태 코드 */
  | "server"
  /** 요청이 서버에 닿지 못했다 — 오프라인 · DNS · 평문 차단 · 타임아웃 */
  | "network"
  /** 200 인데 형태가 계약과 다르다 — JSON 아님 · 필드 누락 · 타입 불일치 */
  | "malformed"
  /** `EXPO_PUBLIC_API_BASE_URL` 이 비었다. 기본 주소를 지어내지 않는다 */
  | "unconfigured";

export type KakaoLoginResult =
  { ok: true; session: KakaoLoginSession } | { ok: false; code: AuthFailureCode };

/** 서버가 본문에 실어 주는 오류 코드 → 우리 사유. 상태 코드보다 이쪽이 정확하다 */
const BODY_CODES: Record<string, AuthFailureCode> = {
  INVALID_REQUEST: "invalid_request",
  KAKAO_TOKEN_INVALID: "kakao_token_invalid",
  KAKAO_API_SERVER_ERROR: "kakao_upstream",
  KAKAO_API_NETWORK_ERROR: "kakao_upstream",
};

const failureByStatus = (status: number): AuthFailureCode => {
  if (status === 400) return "invalid_request";
  if (status === 401) return "kakao_token_invalid";
  if (status === 502 || status === 503) return "kakao_upstream";
  // 그 밖은 전부 「서버가 우리를 받아주지 않았다」로 접는다 — 사용자에게는 같은 말이다
  return "server";
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * 성공 응답을 세션으로 옮긴다. **하나라도 어긋나면 `null`** — 부분 수용은
 * 「반쯤 로그인된 상태」를 만들고, 그건 로그인 실패보다 고치기 어렵다.
 */
const toSession = (value: unknown): KakaoLoginSession | null => {
  if (typeof value !== "object" || value === null) return null;
  const body = value as Record<string, unknown>;

  // 계약이 `"Bearer"` 를 고정한다. 대소문자만 눈감아 준다 — 그 이상은 계약 이탈이다
  const tokenType = typeof body.tokenType === "string" ? body.tokenType.toLowerCase() : "";
  if (tokenType !== "bearer") return null;

  if (!isNonEmptyString(body.accessToken)) return null;
  if (!isNonEmptyString(body.refreshToken)) return null;
  // 0·음수는 「이미 만료된 세션」이라 받자마자 로그아웃이다 — 계약 위반으로 본다
  if (!isFiniteNumber(body.accessTokenExpiresIn) || body.accessTokenExpiresIn <= 0) return null;
  if (!isFiniteNumber(body.userId)) return null;
  if (typeof body.onboardingRequired !== "boolean") return null;

  return {
    accessToken: body.accessToken.trim(),
    refreshToken: body.refreshToken.trim(),
    accessTokenExpiresIn: body.accessTokenExpiresIn,
    userId: body.userId,
    onboardingRequired: body.onboardingRequired,
  };
};

/** 오류 응답의 본문은 **있으면 읽고 없으면 넘어간다** — 여기서 또 실패하지 않는다 */
const readErrorCode = async (response: Response): Promise<AuthFailureCode | null> => {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return null;
    const { code } = body as { code?: unknown };
    return typeof code === "string" ? (BODY_CODES[code] ?? null) : null;
  } catch {
    return null;
  }
};

/**
 * 카카오 access token 을 모멘토리 세션으로 바꾼다.
 *
 * **던지지 않는다.** 네트워크 실패도 계약 위반도 전부 `{ ok: false, code }` 다 —
 * 호출부가 오류 종류를 다시 추측하지 않게 한다.
 */
export async function exchangeKakaoToken(kakaoAccessToken: string): Promise<KakaoLoginResult> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return { ok: false, code: "unconfigured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${KAKAO_LOGIN_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ accessToken: kakaoAccessToken }),
      signal: controller.signal,
    });
  } catch {
    // 타임아웃(abort)과 전송 실패를 가르지 않는다 — 사용자에게 같은 상황이다
    return { ok: false, code: "network" };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const fromBody = await readErrorCode(response);
    return { ok: false, code: fromBody ?? failureByStatus(response.status) };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, code: "malformed" };
  }

  const session = toSession(body);
  return session ? { ok: true, session } : { ok: false, code: "malformed" };
}
