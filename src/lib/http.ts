import { getAccessToken } from "@/features/auth/model/auth";
import { getApiBaseUrl } from "@/lib/config";

/**
 * 인증이 필요한 서버 호출의 단일 통로 — **Bearer 토큰 주입 · 타임아웃 · 안전 파싱**.
 *
 * `kakaoAuthApi.ts` 의 방어 원칙을 그대로 옮긴다:
 * - **던지지 않는다.** 전송 실패도 계약 위반도 전부 `{ ok: false, error }` 다 —
 *   호출부가 오류 종류를 다시 추측하지 않게 한다.
 * - **서버를 믿지 않는다.** `data` 는 파싱만 한 값이고 **형태 검증은 호출부 몫**이다
 *   (`retroApi.ts` 가 `ReplyDto` 를 런타임에 검사한다). `fetch` 는 형태를 보장하지 않는다.
 * - **토큰의 정본은 SecureStore 세션**이다. 매 호출에서 `getAccessToken()` 으로 읽는다 —
 *   그 함수가 만료를 보면 먼저 조용히 갱신을 시도하므로, 여기는 갱신 성공 여부를
 *   모른 채 결과(새 토큰 또는 `null`)만 받는다. `null`(비로그인·손상·갱신 실패)이면
 *   **보내지 않고** `unauthenticated` 로 닫는다 — 이미 죽은 걸 아는 토큰을 보내
 *   401 을 받느니 fail-closed 로 넘어간다.
 *
 * 본문·토큰을 로그로 남기지 않는다(`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 */

/**
 * LLM 턴은 서버가 Gemini 를 부르고 오므로 로그인 교환(10초)보다 길게 잡는다.
 * 무한 대기는 입력칸이 영영 잠기는 것과 같다.
 */
export const DEFAULT_TIMEOUT_MS = 25_000;

export type HttpError =
  /** `EXPO_PUBLIC_API_BASE_URL` 이 비었다 — 기본 주소를 지어내지 않는다 */
  | { code: "unconfigured" }
  /** 유효한 세션이 없다 — 요청을 아예 보내지 않았다 */
  | { code: "unauthenticated" }
  /** 요청이 서버에 닿지 못했다 — 오프라인 · DNS · 평문 차단 · 타임아웃 */
  | { code: "network" }
  /** 2xx 인데 본문이 JSON 이 아니다 */
  | { code: "malformed" }
  /** 4xx · 5xx. `body` 는 서버가 실어 준 오류 본문(있으면) — 호출부가 `code` 를 읽는다 */
  | { code: "http"; status: number; body: unknown };

export type HttpResult<T> = { ok: true; data: T } | { ok: false; error: HttpError };

type RequestOptions = {
  /** 기본 {@link DEFAULT_TIMEOUT_MS}. 짧은 조회는 줄여 잡는다 */
  timeoutMs?: number;
  /** 화면이 벗어날 때 등 바깥에서 취소하는 신호 */
  signal?: AbortSignal;
  /** 사용자별 요청은 토큰을 읽은 뒤에도 이 ID의 세션일 때만 보낸다 */
  expectedUserId?: number;
};

/**
 * 서버가 받는 메서드. **`GET`·`POST` 로 시작했다가 일정 API 를 붙이며 넓혔다** —
 * 완료·감정 변경(`PUT`) · 수동 일정 수정(`PATCH`) · 삭제(`DELETE`)가 전부
 * 여기를 지난다(`docs/api/openapi.json`).
 *
 * 넓히는 것 말고는 아무것도 바뀌지 않는다. `DELETE` 는 대개 본문이 없고
 * `204` 로 답하는데, 본문 없는 응답은 이미 `data: null` 로 닫힌다(아래
 * `parseJson`) — 메서드별 분기를 만들지 않는다.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** 본문 없는 응답(204)·JSON 파싱 실패를 가른다 */
const parseJson = async (
  response: Response,
): Promise<{ ok: true; value: unknown } | { ok: false }> => {
  const text = await response.text().catch(() => null);
  if (text == null) return { ok: false };
  if (text.length === 0) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
};

/**
 * 인증 요청 하나. `data` 는 **검증되지 않은** 파싱 결과다 — 호출부가 형태를 확인한다.
 *
 * 본문 없는 성공(`204`)은 `{ ok: true, data: null }` 이다 — 삭제처럼 돌려받을
 * 것이 없는 호출은 `authedRequest<null>` 로 받는다.
 */
export async function authedRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<HttpResult<T>> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return { ok: false, error: { code: "unconfigured" } };

  const token = await getAccessToken(options?.expectedUserId);
  if (token == null) return { ok: false, error: { code: "unauthenticated" } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // 바깥 취소를 우리 컨트롤러로 잇는다 — 이미 취소됐으면 즉시 반영한다
  const external = options?.signal;
  const onExternalAbort = () => controller.abort();
  if (external != null) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    // 타임아웃(abort)과 전송 실패를 가르지 않는다 — 사용자에게 같은 상황이다
    return { ok: false, error: { code: "network" } };
  } finally {
    clearTimeout(timer);
    if (external != null) external.removeEventListener("abort", onExternalAbort);
  }

  const parsed = await parseJson(response);

  if (!response.ok) {
    // 오류 본문은 **있으면 읽고 없으면 넘어간다** — 여기서 또 실패하지 않는다
    return {
      ok: false,
      error: { code: "http", status: response.status, body: parsed.ok ? parsed.value : null },
    };
  }

  if (!parsed.ok) return { ok: false, error: { code: "malformed" } };
  return { ok: true, data: parsed.value as T };
}
