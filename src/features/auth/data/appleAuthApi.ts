import {
  exchangeLoginSession,
  type ExchangeResult,
  type LoginSession,
  type TransportFailureCode,
} from "@/features/auth/data/loginSession";

/**
 * 애플 세션 교환 — `POST /api/v1/auth/apple` (계약 반입 2026-08-24 · BE `AppleLoginController`).
 *
 * ```
 * POST {API_BASE_URL}/api/v1/auth/apple
 * Content-Type: application/json
 * Accept: application/json
 *
 * { "identityToken": "<애플이 서명한 JWT>", "nonce": "<이번 인가의 nonce 원문>" }
 * ```
 *
 * **`DISCUSSION.md` §1-10 이 이 파일이 없어서 열려 있던 절이다.** 서버가 계약을
 * 내면서 닫혔고, 그때 FE 가 물은 넷 중 **셋이 답을 받았다** — 아래에 옮겨 적는다.
 *
 * ## 서버가 받는 것은 **identity token 과 nonce 원문 둘뿐이다**
 *
 * FE 제안은 `{ identityToken, authorizationCode }` 였고 이름·이메일도 선택 필드로
 * 두자고 했는데, 서버는 **이름·이메일을 받지 않는다.** 짐작이 틀린 것이 아니라
 * **더 나은 답이 왔다** — 서버가 그 토큰 **안의 `email` 클레임**을 읽기 때문에
 * (BE `AppleIdentityTokenVerifier.requireVerifiedEmail`) 요청 본문으로 이메일을
 * 실어 보낼 이유가 사라졌다. `nonce` 는 그 뒤 재생 공격을 막으려고 함께 넣었다
 * (아래 「`nonce` 원문을 함께 보낸다」).
 *
 * ⚠ **그래서 「첫 인가 한 번」 문제가 풀렸다.** 애플이 이름·이메일을 credential
 * 로 주는 것은 첫 인가뿐이지만, **identity token 의 `email` 클레임은 매번 온다** —
 * 서버가 그쪽을 보므로 사용자가 언제 로그인하든 계정을 세울 수 있다. 릴리스에서
 * 애플 줄을 잠가 두었던 이유가 이것이었고(`login.tsx` 의 옛 `isAppleLineOpen`),
 * 그 잠금이 이 계약과 함께 풀렸다.
 *
 * **`authorizationCode`·`fullName`·`email` 을 보내지 않는다.** 서버가 읽지 않는
 * 값을 실어 보내면 「보냈으니 저쪽이 갖고 있겠지」가 되고, 그건 탈퇴 시 애플
 * 연결 해제(§1-10 「정할 것 넷」4 · 아직 열려 있다)를 논할 때 사실과 어긋난 전제가
 * 된다. `appleSdk.ts` 는 그 값들을 계속 꺼내 온다 — **서버가 요구하게 되는 날
 * 이 파일 한 줄만 늘리면 되도록** 경계는 그대로 두었다.
 *
 * ⚠ 특히 `authorizationCode` 는 **탈퇴 revoke 가 붙는 날 필요해진다** — 서버가
 * 그것을 애플 refresh token 으로 바꿔 두어야 연결을 끊을 수 있다(§1-10 의 4번).
 *
 * ## `nonce` 원문을 함께 보낸다
 *
 * §1-10 「정할 것 넷」3 이 닫혔다 — **양쪽을 같은 날 붙였다.** 앱이 `signInAsync`
 * 에 준 것은 SHA-256 **해시**이고 그것이 토큰의 `nonce` 클레임으로 돌아온다.
 * 여기서 보내는 것은 그 **원문**이고, 서버가 원문을 해시해 클레임과 맞춘다
 * (BE `AppleIdentityTokenVerifier`). 인코딩은 양쪽 다 **hex** 다 —
 * 갈리면 항상 불일치라 로그인이 통째로 막힌다.
 *
 * **원문을 로그에도 기기에도 남기지 않는다.** 한 번 보내고 버리는 값이라
 * identity token 과 같은 등급으로 다룬다(`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 *
 * ⚠ **이것이 막는 것과 막지 못하는 것.** 다른 경로에서 주운 identity token 을
 * 되쓰는 것은 막는다 — 원문을 모르면 서버가 거절한다. 다만 **요청 하나를 통째로
 * 가로챈 상대**는 둘 다 갖게 되므로 막지 못한다. 그 창을 닫는 것은 HTTPS 이고,
 * 개발 서버는 아직 평문이다(§1-6). nonce 는 그 대체재가 아니다.
 *
 * ## 응답은 카카오와 **글자 그대로 같다**
 *
 * FE 가 계약을 열 때 건 조건이 그것이었고(§1-10 「정할 것 넷」1) 서버가 그대로
 * 냈다 — 그래서 응답 검증과 전송을 `loginSession.ts` 로 나눠 쓴다. 여기 남은
 * 것은 **애플이라서 다른 것**뿐이다: 경로 · 요청 본문 · 거절의 이름.
 */
export const APPLE_LOGIN_PATH = "/api/v1/auth/apple";

/** 서버가 발급한 **모멘토리** 세션. 애플 토큰은 여기 없다 — 보내고 버렸다 */
export type AppleLoginSession = LoginSession;

/**
 * 실패 사유. **화면 문구가 아니라 코드**다 — 문구는 `auth.ts` 가 정한다.
 *
 * 카카오의 `AuthFailureCode` 와 **합치지 않는다.** 사유의 개수도 뜻도 다르고
 * (`apple_email_unavailable` 은 카카오에 없다), 같은 자리의 실패라도 사용자가
 * 읽을 문장이 갈린다 — 「카카오 로그인을 마치지 못했어요」가 애플 줄에서 뜨면
 * 사용자는 누른 적 없는 것의 실패를 읽는다.
 */
export type AppleAuthFailureCode =
  /** 400 `INVALID_REQUEST` — 우리가 잘못 보냈다 (빈 `identityToken` 등) */
  | "invalid_request"
  /**
   * 400 `APPLE_EMAIL_UNAVAILABLE` — 토큰에 **확인된 이메일이 없다.**
   *
   * 다른 실패와 성격이 다르다: 서버도 애플도 정상이고, **사용자의 애플 ID 설정**이
   * 이메일을 내주지 않은 상태다. 다시 눌러도 같으므로 재시도를 권하지 않는다.
   */
  | "apple_email_unavailable"
  /** 401 `APPLE_TOKEN_INVALID` — 만료·위조·서명 불일치 */
  | "apple_token_invalid"
  /**
   * 401 `APPLE_NONCE_MISMATCH` — 토큰의 `nonce` 클레임이 우리가 보낸 원문의
   * 해시와 다르다.
   *
   * **정상 흐름에서는 나올 수 없다** — 같은 `requestAppleCredential()` 호출이
   * 둘을 함께 만들기 때문이다. 이 값이 오면 둘 중 하나다: 누군가 다른 데서 주운
   * 토큰을 끼워 넣었거나, **양쪽의 해시 인코딩이 어긋났거나**(hex ↔ base64).
   * 사용자 문구는 다른 401 과 같지만 **사유는 갈라 둔다** — 실기기에서 이것이
   * 반복되면 공격이 아니라 우리 규약이 틀린 것이다.
   */
  | "apple_nonce_mismatch"
  /**
   * 401 `APPLE_CLIENT_ID_MISMATCH` — 토큰의 `aud` 가 서버가 아는 번들 ID 와 다르다.
   *
   * **사용자가 할 수 있는 일이 없다 — 우리 설정 오류다.** 앱 번들 ID
   * (`kr.momentory.app`)와 서버의 `APPLE_CLIENT_ID` 가 어긋났다는 뜻이라,
   * 사용자 문구는 위와 같아도 **사유는 갈라 둔다**: 실기기에서 이 값이 돌아오면
   * 「애플이 거절했다」가 아니라 「배포 설정이 틀렸다」를 봐야 한다.
   */
  | "apple_client_mismatch"
  /** 502·503 — 애플 쪽이 응답하지 않는다. 우리 잘못도 사용자 잘못도 아니다 */
  | "apple_upstream"
  /** 그 밖의 5xx · 알 수 없는 상태 코드 */
  | "server"
  /** 닿지 못했거나 · 읽을 수 없거나 · 주소가 없다 (`loginSession.ts`) */
  | TransportFailureCode;

export type AppleLoginResult = ExchangeResult<AppleAuthFailureCode>;

/** 서버가 본문에 실어 주는 오류 코드 → 우리 사유. 상태 코드보다 이쪽이 정확하다 */
const BODY_CODES: Record<string, AppleAuthFailureCode> = {
  INVALID_REQUEST: "invalid_request",
  APPLE_EMAIL_UNAVAILABLE: "apple_email_unavailable",
  APPLE_TOKEN_INVALID: "apple_token_invalid",
  APPLE_NONCE_MISMATCH: "apple_nonce_mismatch",
  APPLE_CLIENT_ID_MISMATCH: "apple_client_mismatch",
  APPLE_API_SERVER_ERROR: "apple_upstream",
  APPLE_API_RESPONSE_ERROR: "apple_upstream",
  APPLE_API_NETWORK_ERROR: "apple_upstream",
};

/**
 * 본문을 읽지 못했을 때의 차선책이다.
 *
 * ⚠ **400 은 본문 없이는 가를 수 없다** — 계약이 `INVALID_REQUEST` 와
 * `APPLE_EMAIL_UNAVAILABLE` 을 같은 상태 코드에 둔다. 본문이 없으면
 * 「우리가 잘못 보냈다」로 접는다: 둘 중 **우리가 고칠 수 있는 쪽**이고,
 * 이메일 문제를 잘못 띄우면 사용자가 애플 설정을 헛되이 뒤진다.
 */
const failureByStatus = (status: number): AppleAuthFailureCode => {
  if (status === 400) return "invalid_request";
  if (status === 401) return "apple_token_invalid";
  if (status === 502 || status === 503) return "apple_upstream";
  return "server";
};

const classify = (status: number, serverCode: string | null): AppleAuthFailureCode =>
  (serverCode ? BODY_CODES[serverCode] : null) ?? failureByStatus(status);

/**
 * 애플 identity token 을 모멘토리 세션으로 바꾼다.
 *
 * **던지지 않는다.** 네트워크 실패도 계약 위반도 전부 `{ ok: false, code }` 다 —
 * 호출부가 오류 종류를 다시 추측하지 않게 한다.
 */
export async function exchangeAppleIdentityToken(
  identityToken: string,
  nonce: string,
): Promise<AppleLoginResult> {
  // 이 둘뿐이다 — 이름·이메일은 서버가 토큰 안에서 읽는다(위 머리말)
  return exchangeLoginSession(APPLE_LOGIN_PATH, { identityToken, nonce }, classify);
}
