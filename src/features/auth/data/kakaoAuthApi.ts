import {
  exchangeLoginSession,
  LOGIN_REQUEST_TIMEOUT_MS,
  type ExchangeResult,
  type LoginSession,
  type TransportFailureCode,
} from "@/features/auth/data/loginSession";

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
 * **이 파일에 남은 것은 「카카오라서 다른 것」뿐이다** (2026-08-24 정리) — 경로 ·
 * 요청 본문 · 거절의 이름. 전송·응답 검증은 애플과 나눠 쓴다(`loginSession.ts`).
 * 옮긴 것이지 바꾼 것이 아니다 — 판정은 그대로다.
 */
export const KAKAO_LOGIN_PATH = "/api/v1/auth/kakao";

/** @deprecated 이름만 남긴다 — 값은 `loginSession.ts` 가 공급자 공통으로 들고 있다 */
export const REQUEST_TIMEOUT_MS = LOGIN_REQUEST_TIMEOUT_MS;

/** 서버가 발급한 **모멘토리** 세션. 카카오 토큰은 여기 없다 — 보내고 버렸다 */
export type KakaoLoginSession = LoginSession;

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
  /** 닿지 못했거나 · 읽을 수 없거나 · 주소가 없다 (`loginSession.ts`) */
  | TransportFailureCode;

export type KakaoLoginResult = ExchangeResult<AuthFailureCode>;

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

const classify = (status: number, serverCode: string | null): AuthFailureCode =>
  (serverCode ? BODY_CODES[serverCode] : null) ?? failureByStatus(status);

/**
 * 카카오 access token 을 모멘토리 세션으로 바꾼다.
 *
 * **던지지 않는다.** 네트워크 실패도 계약 위반도 전부 `{ ok: false, code }` 다 —
 * 호출부가 오류 종류를 다시 추측하지 않게 한다.
 */
export async function exchangeKakaoToken(kakaoAccessToken: string): Promise<KakaoLoginResult> {
  // 카카오 토큰 외에는 아무것도 보내지 않는다 — 앱 키·기기 정보를 얹지 않는다
  return exchangeLoginSession(KAKAO_LOGIN_PATH, { accessToken: kakaoAccessToken }, classify);
}
