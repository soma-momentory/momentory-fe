import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 회원탈퇴 — `DELETE /api/v1/users/me` (BE #42 · `docs/api/openapi.json`).
 *
 * ```
 * DELETE {API_BASE_URL}/api/v1/users/me
 * Authorization: Bearer <access token>
 *
 * 204                                    탈퇴 완료(본문 없음)
 * 401 { code: "AUTHENTICATION_REQUIRED" }
 * 502 { code: "KAKAO_API_SERVER_ERROR" | "KAKAO_API_RESPONSE_ERROR" }
 * 503 { code: "KAKAO_API_NETWORK_ERROR" }
 * ```
 *
 * 서버는 **카카오 연결을 먼저 끊고** 모멘토리 계정과 내부 데이터를 지운다. 카카오
 * 연결 해제가 실패하면(502·503) 계정은 아직 살아 있다 — **그래서 로그아웃과 달리
 * 결과를 기다린다.** 성공(204)을 확인해야 기기의 흔적을 지운다(`auth.ts`).
 *
 * **Bearer 를 실어야 하므로 `src/lib/http.ts` 를 지난다** — 로그아웃(`logoutApi.ts`)
 * 이 refresh token 으로 신원을 증명해 그 통로를 벗어난 것과는 다르다. 탈퇴는 지금
 * 로그인한 사용자가 누구인지를 access token 으로 말한다.
 *
 * 본문 없는 204 는 `authedRequest` 가 `data: null` 로 닫는다 — 돌려받을 것이 없다.
 */
export const WITHDRAW_PATH = "/api/v1/users/me";

/**
 * 실패 사유 — **코드**다. 문구는 `auth.ts` 가 정한다(`RULES.md` 4 — 오류는 한 줄).
 *
 * `kakao` 를 따로 두는 것은 사용자가 할 수 있는 일이 다르기 때문이다 — 계정은
 * 아직 그대로이고 잠시 뒤 다시 시도하면 된다. 그 밖의 실패도 재시도가 답이라
 * 문구는 같아지지만, 사유를 남겨 뒤에 갈릴 여지를 둔다.
 */
export type WithdrawFailureCode =
  /** 401 — access token 을 서버가 거부했다. 보낼 토큰이 없던 경우도 여기로 접는다 */
  | "unauthenticated"
  /** 502·503 — 카카오 연결 해제 실패. **계정은 지워지지 않았다** */
  | "kakao"
  /** 요청이 서버에 닿지 못했다 — 오프라인 · 타임아웃 */
  | "network"
  /** 그 밖의 5xx · 알 수 없는 상태 · 형태 위반 */
  | "server"
  /** `EXPO_PUBLIC_API_BASE_URL` 이 비었다 */
  | "unconfigured";

export type WithdrawResult = { ok: true } | { ok: false; code: WithdrawFailureCode };

const mapError = (error: HttpError): WithdrawFailureCode => {
  switch (error.code) {
    case "unconfigured":
      return "unconfigured";
    case "unauthenticated":
      // 보낼 토큰이 없어 요청하지 않았다 — 사용자에겐 재로그인이 답이다
      return "unauthenticated";
    case "network":
      return "network";
    case "malformed":
      // 204 는 본문이 없어 여기 오지 않는다. 왔다면 계약과 다른 응답이다
      return "server";
    case "http":
      if (error.status === 401) return "unauthenticated";
      // 502·503 은 전부 카카오 연결 해제 단계다(위 계약)
      if (error.status === 502 || error.status === 503) return "kakao";
      return "server";
  }
};

/**
 * 지금 로그인한 계정을 지운다. **던지지 않는다** — 전부 `{ ok, code }` 다.
 *
 * 성공은 서버가 카카오 연결을 끊고 계정까지 지웠다는 뜻이다. 그 뒤 기기의 세션과
 * 흔적을 비우는 것은 호출부(`auth.ts` 의 `withdraw`) 몫이다.
 */
export async function deleteAccount(options?: { signal?: AbortSignal }): Promise<WithdrawResult> {
  const result = await authedRequest<null>("DELETE", WITHDRAW_PATH, undefined, {
    signal: options?.signal,
  });
  return result.ok ? { ok: true } : { ok: false, code: mapError(result.error) };
}
