import { getApiBaseUrl } from "@/lib/config";

/**
 * 토큰 갱신 — `POST /api/v1/auth/reissue` (BE 합의 — `RefreshTokenReissueController`).
 *
 * ```
 * POST {API_BASE_URL}/api/v1/auth/reissue
 * Content-Type: application/json
 * Accept: application/json
 *
 * { "refreshToken": "<모멘토리 refresh token>" }
 * ```
 *
 * **refresh token 은 회전한다** — 성공 응답은 새 access/refresh 토큰 쌍이고, 쓰인
 * refresh token 은 서버에서 즉시 폐기된다. 응답의 `refreshToken` 을 저장하지 않으면
 * 다음 갱신이 이미 폐기된 토큰으로 실패한다.
 *
 * `kakaoAuthApi.ts` 와 같은 방어 원칙 — 서버를 믿지 않고 응답을 런타임에 검사하고,
 * 던지지 않는다. 토큰·본문은 로그로 남기지 않는다.
 */
export const REISSUE_PATH = "/api/v1/auth/reissue";

/** 서버가 응답을 주지 않을 때 끊는 시간. 로그인 교환과 같은 기준 */
export const REQUEST_TIMEOUT_MS = 10_000;

/** 응답이 주는 것 — `userId` 는 없다. 갱신은 세션의 주인을 바꾸지 않으므로 옛 값을 그대로 쓴다 */
export type ReissueSession = {
  accessToken: string;
  refreshToken: string;
  /** **초 단위**다. 절대 시각으로 바꾸는 곳은 `auth.ts` 하나뿐이다 */
  accessTokenExpiresIn: number;
};

/**
 * 실패 사유. **코드**다 — 문구는 `auth.ts` 가 정한다.
 */
export type ReissueFailureCode =
  /** 400 `INVALID_REQUEST` — 우리가 잘못 보냈다 */
  | "invalid_request"
  /** 401 `REFRESH_TOKEN_INVALID` — 형식이 맞지 않거나 우리 발급이 아니다 */
  | "refresh_invalid"
  /** 401 `REFRESH_TOKEN_REVOKED` — 이미 한 번 쓰여 폐기됐다(회전·중복 갱신) */
  | "refresh_revoked"
  /** 401 `REFRESH_TOKEN_EXPIRED` — 수명이 다했다. 재로그인 말고는 방법이 없다 */
  | "refresh_expired"
  /** 그 밖의 5xx · 알 수 없는 상태 코드 */
  | "server"
  /** 요청이 서버에 닿지 못했다 — 오프라인 · DNS · 평문 차단 · 타임아웃 */
  | "network"
  /** 200 인데 형태가 계약과 다르다 */
  | "malformed"
  /** `EXPO_PUBLIC_API_BASE_URL` 이 비었다 */
  | "unconfigured";

export type ReissueResult =
  { ok: true; session: ReissueSession } | { ok: false; code: ReissueFailureCode };

/** refresh token 셋 중 무엇이 문제인지는 재로그인 필요 여부를 가르지 않지만, 사유는 남긴다 */
const BODY_CODES: Record<string, ReissueFailureCode> = {
  INVALID_REQUEST: "invalid_request",
  REFRESH_TOKEN_INVALID: "refresh_invalid",
  REFRESH_TOKEN_REVOKED: "refresh_revoked",
  REFRESH_TOKEN_EXPIRED: "refresh_expired",
};

const failureByStatus = (status: number): ReissueFailureCode => {
  if (status === 400) return "invalid_request";
  if (status === 401) return "refresh_invalid";
  return "server";
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** 하나라도 어긋나면 `null` — 반쯤 갱신된 세션을 만들지 않는다 */
const toSession = (value: unknown): ReissueSession | null => {
  if (typeof value !== "object" || value === null) return null;
  const body = value as Record<string, unknown>;

  const tokenType = typeof body.tokenType === "string" ? body.tokenType.toLowerCase() : "";
  if (tokenType !== "bearer") return null;

  if (!isNonEmptyString(body.accessToken)) return null;
  if (!isNonEmptyString(body.refreshToken)) return null;
  if (!isFiniteNumber(body.accessTokenExpiresIn) || body.accessTokenExpiresIn <= 0) return null;

  return {
    accessToken: body.accessToken.trim(),
    refreshToken: body.refreshToken.trim(),
    accessTokenExpiresIn: body.accessTokenExpiresIn,
  };
};

const readErrorCode = async (response: Response): Promise<ReissueFailureCode | null> => {
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
 * refresh token 을 새 access/refresh 토큰 쌍으로 바꾼다.
 *
 * **던지지 않는다.** 호출부(`auth.ts`)가 오류 종류를 다시 추측하지 않게 한다.
 */
export async function reissueAccessToken(refreshToken: string): Promise<ReissueResult> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return { ok: false, code: "unconfigured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${REISSUE_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
  } catch {
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
