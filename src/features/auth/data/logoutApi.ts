import { getApiBaseUrl } from "@/lib/config";

/**
 * 현재 기기 로그아웃 — `POST /api/v1/auth/logout` (BE 합의 2026-08-10).
 *
 * ```
 * POST {API_BASE_URL}/api/v1/auth/logout
 * Content-Type: application/json
 * Accept: application/json
 *
 * { "refreshToken": "<모멘토리 refresh token>" }
 * ```
 *
 * **제출한 refresh token 하나만 멱등적으로 폐기한다** — 다른 기기의 세션은 살아
 * 있고, 같은 토큰을 두 번 보내도 결과가 같다. 성공은 `204`(본문 없음)다.
 *
 * ⚠ **`src/lib/http.ts` 를 지나지 않는다.** 「인증이 필요한 서버 호출은 `http.ts`
 * 하나를 지난다」(`TASKS.md` 「둘이 부딪히는 곳」)는 **Bearer 를 실어야 하는** 호출의
 * 규칙이고, 이 계약은 그 밖이다 — 신원을 증명하는 것이 refresh token 자체여서
 * `reissue`·`kakao` 와 같은 부류다. 게다가 `authedRequest` 를 쓰면 `getAccessToken()`
 * 이 만료를 보고 **폐기 요청보다 먼저 재발급을 보낸다.** refresh token 은 회전하므로
 * 그 순간 우리가 손에 든 토큰이 죽고, 폐기 요청은 이미 없는 토큰을 가리키게 된다.
 *
 * 토큰과 응답 본문을 로그로 남기지 않는다(`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 */
export const LOGOUT_PATH = "/api/v1/auth/logout";

/** 서버가 응답을 주지 않을 때 끊는 시간. 로그인 교환·갱신과 같은 기준 */
export const REQUEST_TIMEOUT_MS = 10_000;

/**
 * 실패 사유. **코드**다 — 문구는 호출부가 정한다.
 *
 * 지금은 아무도 이 코드를 화면에 옮기지 않는다. `signOut` 은 결과를 보지 않고
 * 로컬을 이미 비운 뒤이기 때문이다(`auth.ts`). 그래도 사유를 남기는 것은
 * 「실패했다」와 「무엇이 실패했다」가 다른 정보이고, 뒤에 회원 탈퇴가 이 파일을
 * 다시 쓸 때 그 구분이 필요해지기 때문이다.
 */
export type LogoutFailureCode =
  /** 400 `INVALID_REQUEST` — 우리가 잘못 보냈다(빈 refresh token 등) */
  | "invalid_request"
  /** 그 밖의 5xx · 알 수 없는 상태 코드 */
  | "server"
  /** 요청이 서버에 닿지 못했다 — 오프라인 · DNS · 평문 차단 · 타임아웃 */
  | "network"
  /** `EXPO_PUBLIC_API_BASE_URL` 이 비었다. 기본 주소를 지어내지 않는다 */
  | "unconfigured";

export type LogoutResult = { ok: true } | { ok: false; code: LogoutFailureCode };

/** 서버가 본문에 실어 주는 오류 코드 → 우리 사유. 상태 코드보다 이쪽이 정확하다 */
const BODY_CODES: Record<string, LogoutFailureCode> = {
  INVALID_REQUEST: "invalid_request",
};

const failureByStatus = (status: number): LogoutFailureCode => {
  if (status === 400) return "invalid_request";
  // 401 은 계약에 없다 — 이미 폐기된 토큰도 204 다(멱등). 나머지는 전부 서버 쪽으로 접는다
  return "server";
};

/** 오류 응답의 본문은 **있으면 읽고 없으면 넘어간다** — 여기서 또 실패하지 않는다 */
const readErrorCode = async (response: Response): Promise<LogoutFailureCode | null> => {
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
 * 이 기기의 refresh token 을 서버에서 폐기한다.
 *
 * **던지지 않는다.** 네트워크 실패도 계약 위반도 전부 `{ ok: false, code }` 다.
 *
 * **성공 응답의 본문을 읽지 않는다.** 204 에는 본문이 없고, 없는 것을 파싱하려
 * 들면 그 자체가 실패가 된다 — 폐기는 이미 끝났는데 실패로 보고하게 된다.
 */
export async function revokeRefreshToken(refreshToken: string): Promise<LogoutResult> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return { ok: false, code: "unconfigured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${LOGOUT_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
  } catch {
    // 타임아웃(abort)과 전송 실패를 가르지 않는다 — 결과가 같다
    return { ok: false, code: "network" };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const fromBody = await readErrorCode(response);
    return { ok: false, code: fromBody ?? failureByStatus(response.status) };
  }

  return { ok: true };
}
