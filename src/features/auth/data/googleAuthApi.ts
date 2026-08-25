import {
  exchangeLoginSession,
  type ExchangeResult,
  type LoginSession,
  type TransportFailureCode,
} from "@/features/auth/data/loginSession";

/**
 * 구글 세션 교환 — `POST /api/v1/auth/google` (BE `GoogleLoginController`).
 *
 * ```
 * POST {API_BASE_URL}/api/v1/auth/google
 * Content-Type: application/json
 * Accept: application/json
 *
 * { "idToken": "<구글이 서명한 JWT>" }
 * ```
 *
 * ## 보내는 것은 **ID token 하나뿐이다**
 *
 * 애플의 `{ identityToken, nonce }` 보다도 짧다. 이유가 둘이다:
 *
 * - **이름·이메일을 보내지 않는다** — 서버가 토큰 안의 `email`·`email_verified`
 *   클레임에서 읽는다(애플과 같다 · `appleAuthApi.ts` 머리말).
 * - ⚠ **nonce 를 보내지 않는다** — SDK 에 그것을 넘길 자리가 없다
 *   (`googleSdk.ts` 머리말). 받아도 서버가 대조할 수 없는 값이라 계약에서 뺐다.
 *   재생 방어는 서버의 `aud`·`azp` 검사가 맡는다.
 *
 * ## 응답은 카카오·애플과 **글자 그대로 같다**
 *
 * 그래서 응답 검증과 전송을 `loginSession.ts` 로 나눠 쓴다. 여기 남은 것은
 * **구글이라서 다른 것**뿐이다: 경로 · 요청 본문 · 거절의 이름.
 */
export const GOOGLE_LOGIN_PATH = "/api/v1/auth/google";

/** 서버가 발급한 **모멘토리** 세션. 구글 토큰은 여기 없다 — 보내고 버렸다 */
export type GoogleLoginSession = LoginSession;

/**
 * 실패 사유. **화면 문구가 아니라 코드**다 — 문구는 `auth.ts` 가 정한다.
 *
 * 카카오·애플의 사유와 **합치지 않는다.** 같은 자리의 실패라도 사용자가 읽을
 * 문장이 갈린다 — 「애플 로그인을 마치지 못했어요」가 구글 줄에서 뜨면
 * 사용자는 누른 적 없는 것의 실패를 읽는다(`appleAuthApi.ts` 와 같은 판단).
 */
export type GoogleAuthFailureCode =
  /** 400 `INVALID_REQUEST` — 우리가 잘못 보냈다 (빈 `idToken` 등) */
  | "invalid_request"
  /**
   * 400 `GOOGLE_EMAIL_UNAVAILABLE` — 토큰에 **확인된 이메일이 없다.**
   *
   * 구글 계정은 거의 항상 확인된 이메일을 갖고 있어서 실제로는 보기 어렵다.
   * 다시 눌러도 같으므로 재시도를 권하지 않는다.
   */
  | "google_email_unavailable"
  /** 401 `GOOGLE_TOKEN_INVALID` — 만료·위조·서명 불일치 */
  | "google_token_invalid"
  /**
   * 401 `GOOGLE_CLIENT_ID_MISMATCH` — 토큰의 `aud` 나 `azp` 가 서버가 아는
   * 클라이언트 ID 목록에 없다.
   *
   * **사용자가 할 수 있는 일이 없다 — 우리 설정 오류다.** 앱의
   * `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` 와 서버의 `GOOGLE_ALLOWED_AUDIENCES` 가
   * 어긋났거나, **콘솔에 이 빌드의 SHA-1 이 없어** 구글이 다른 클라이언트로
   * 토큰을 낸 경우다. 사용자 문구는 다른 401 과 같지만 **사유는 갈라 둔다**:
   * 실기기에서 이 값이 돌아오면 「구글이 거절했다」가 아니라 「배포 설정이
   * 틀렸다」를 봐야 한다(특히 **스토어 설치본에서만** 이것이 뜨면 Play 앱 서명
   * 인증서의 SHA-1 이 빠진 것이다 · `docs/SETUP.md` 「지문」).
   */
  | "google_client_mismatch"
  /** 502·503 — 구글 쪽이 응답하지 않는다. 우리 잘못도 사용자 잘못도 아니다 */
  | "google_upstream"
  /** 그 밖의 5xx · 알 수 없는 상태 코드 */
  | "server"
  /** 닿지 못했거나 · 읽을 수 없거나 · 주소가 없다 (`loginSession.ts`) */
  | TransportFailureCode;

export type GoogleLoginResult = ExchangeResult<GoogleAuthFailureCode>;

/** 서버가 본문에 실어 주는 오류 코드 → 우리 사유. 상태 코드보다 이쪽이 정확하다 */
const BODY_CODES: Record<string, GoogleAuthFailureCode> = {
  INVALID_REQUEST: "invalid_request",
  GOOGLE_EMAIL_UNAVAILABLE: "google_email_unavailable",
  GOOGLE_TOKEN_INVALID: "google_token_invalid",
  GOOGLE_CLIENT_ID_MISMATCH: "google_client_mismatch",
  GOOGLE_API_SERVER_ERROR: "google_upstream",
  GOOGLE_API_RESPONSE_ERROR: "google_upstream",
  GOOGLE_API_NETWORK_ERROR: "google_upstream",
};

/**
 * 본문을 읽지 못했을 때의 차선책이다.
 *
 * ⚠ **400 은 본문 없이는 가를 수 없다** — 계약이 `INVALID_REQUEST` 와
 * `GOOGLE_EMAIL_UNAVAILABLE` 을 같은 상태 코드에 둔다. 본문이 없으면
 * 「우리가 잘못 보냈다」로 접는다: 둘 중 **우리가 고칠 수 있는 쪽**이다
 * (`appleAuthApi.ts` 와 같은 판단).
 */
const failureByStatus = (status: number): GoogleAuthFailureCode => {
  if (status === 400) return "invalid_request";
  if (status === 401) return "google_token_invalid";
  if (status === 502 || status === 503) return "google_upstream";
  return "server";
};

const classify = (status: number, serverCode: string | null): GoogleAuthFailureCode =>
  (serverCode ? BODY_CODES[serverCode] : null) ?? failureByStatus(status);

/**
 * 구글 ID token 을 모멘토리 세션으로 바꾼다.
 *
 * **던지지 않는다.** 네트워크 실패도 계약 위반도 전부 `{ ok: false, code }` 다 —
 * 호출부가 오류 종류를 다시 추측하지 않게 한다.
 */
export async function exchangeGoogleIdToken(idToken: string): Promise<GoogleLoginResult> {
  // 이 하나뿐이다 — 이름·이메일은 서버가 토큰 안에서 읽고, nonce 는 계약에 없다
  return exchangeLoginSession(GOOGLE_LOGIN_PATH, { idToken }, classify);
}
