import { getApiBaseUrl } from "@/lib/config";

/**
 * 소셜 로그인 **세션 교환의 공통 부분** — 카카오·애플이 함께 쓴다 (2026-08-24).
 *
 * 두 엔드포인트(`POST /api/v1/auth/kakao` · `…/auth/apple`)는 **보내는 값만 다르고
 * 나머지가 같다.** 응답이 글자 그대로 같은 모양이고(`accessToken`·`refreshToken`·
 * `tokenType`·`accessTokenExpiresIn`·`userId`·`onboardingRequired`), 실패를 다루는
 * 방식도 같다. 그 「같은 부분」이 여기 있다.
 *
 * **미리 공통으로 만든 것이 아니라, 같아진 것을 확인하고 모았다.** 애플 계약을
 * 열 때 FE 가 제안한 조건이 「응답을 카카오와 완전히 동일하게」였고(`DISCUSSION.md`
 * §1-10 「정할 것 넷」1), 서버가 그대로 냈다 — 그래서 응답 검증을 나눠 쓴다.
 *
 * ## 왜 모으는가
 *
 * 여기 있는 것은 전부 **판정**이다 — 「이 응답을 세션으로 받아도 되는가」·
 * 「닿지 못한 것인가 거절당한 것인가」. 같은 판정이 공급자마다 하나씩 생기면
 * 한쪽만 고쳐진 채로 남고, 그 어긋남은 **로그인 실패로만 드러나서** 눈에 띄지 않는다
 * (인증 실패는 화면에 한 줄로만 흡수된다 · `RULES.md` 4).
 *
 * ## 공급자마다 다른 것은 여기 없다
 *
 * **경로 · 요청 본문 · 실패 사유의 이름**은 각 어댑터가 들고 있다
 * (`kakaoAuthApi.ts` · `appleAuthApi.ts`). 특히 사유 이름을 여기서 정하지 않는 것은,
 * 「카카오가 거절했다」와 「애플이 거절했다」가 사용자에게 다른 문장이기 때문이다 —
 * 문구는 `auth.ts` 가 사유별로 따로 정한다.
 *
 * **토큰과 응답 본문을 로그로 남기지 않는다** — 실패도 사유 코드까지만 남기고
 * 본문은 버린다(`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 *
 * 갱신(refresh)은 여기 없다 — 최초 세션을 만드는 자리일 뿐이고, 만료된 세션을
 * 새 토큰으로 바꾸는 것은 `reissueApi.ts`(`POST …/reissue`) 몫이다.
 */

/** 서버가 응답을 주지 않을 때 끊는 시간. 무한 대기는 버튼이 영영 잠기는 것과 같다 */
export const LOGIN_REQUEST_TIMEOUT_MS = 10_000;

/**
 * 서버가 발급한 **모멘토리** 세션. 공급자 토큰은 여기 없다 — 보내고 버렸다.
 *
 * 카카오와 애플이 **같은 타입 하나**를 쓴다. 이 값이 갈리면 `auth.ts` 의 저장
 * 코드도 갈려야 하는데, 저장은 공급자를 묻지 않는 일이다.
 */
export type LoginSession = {
  accessToken: string;
  refreshToken: string;
  /** **초 단위**다. 절대 시각으로 바꾸는 곳은 `auth.ts` 하나뿐이다 */
  accessTokenExpiresIn: number;
  userId: number;
  /** true 면 온보딩부터, false 면 홈으로 */
  onboardingRequired: boolean;
};

/**
 * **전송이 스스로 내는 사유**들 — 공급자와 무관하다. 서버의 답을 받아 보기도
 * 전에 끝난 경우이거나(`unconfigured`·`network`), 받았는데 읽을 수 없는 경우다.
 */
export type TransportFailureCode =
  /** 요청이 서버에 닿지 못했다 — 오프라인 · DNS · 평문 차단 · 타임아웃 */
  | "network"
  /** 200 인데 형태가 계약과 다르다 — JSON 아님 · 필드 누락 · 타입 불일치 */
  | "malformed"
  /** `EXPO_PUBLIC_API_BASE_URL` 이 비었다. 기본 주소를 지어내지 않는다 */
  | "unconfigured";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * 성공 응답을 세션으로 옮긴다. **하나라도 어긋나면 `null`** — 부분 수용은
 * 「반쯤 로그인된 상태」를 만들고, 그건 로그인 실패보다 고치기 어렵다.
 *
 * **서버를 믿지 않고 런타임에 검사한다.** `fetch` 는 형태를 보장하지 않으므로
 * `as` 로 단언하면 필드가 빠진 200 응답이 그대로 세션이 되어 SecureStore 에
 * 눕는다 — 다음 부트에서야 이상한 세션으로 드러난다.
 */
export const toLoginSession = (value: unknown): LoginSession | null => {
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
const readServerErrorCode = async (response: Response): Promise<string | null> => {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return null;
    const { code } = body as { code?: unknown };
    return typeof code === "string" ? code : null;
  } catch {
    return null;
  }
};

export type ExchangeResult<Code extends string> =
  { ok: true; session: LoginSession } | { ok: false; code: Code | TransportFailureCode };

/**
 * 공급자 토큰 한 벌을 모멘토리 세션으로 바꾼다.
 *
 * **던지지 않는다.** 네트워크 실패도 계약 위반도 전부 `{ ok: false, code }` 다 —
 * 호출부가 오류 종류를 다시 추측하지 않게 한다.
 *
 * `classify` 가 **거절의 이름을 정하는 유일한 자리**다. 서버가 본문에 실어 준
 * 오류 코드(있으면)와 상태 코드를 함께 받아 공급자의 말로 옮긴다 — 본문 쪽이
 * 상태 코드보다 정확하므로 그 판단도 `classify` 안에서 한다.
 */
export async function exchangeLoginSession<Code extends string>(
  path: string,
  requestBody: object,
  classify: (status: number, serverCode: string | null) => Code,
): Promise<ExchangeResult<Code>> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return { ok: false, code: "unconfigured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOGIN_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch {
    // 타임아웃(abort)과 전송 실패를 가르지 않는다 — 사용자에게 같은 상황이다
    return { ok: false, code: "network" };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    return { ok: false, code: classify(response.status, await readServerErrorCode(response)) };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, code: "malformed" };
  }

  const session = toLoginSession(body);
  return session ? { ok: true, session } : { ok: false, code: "malformed" };
}
