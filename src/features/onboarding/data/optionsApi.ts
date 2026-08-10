import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 온보딩 선택지 — `GET /api/v1/onboarding/options` (`docs/api/openapi.json`).
 *
 * ```
 * 200 { nickname: { maxLength, duplicateAllowed },
 *       genders: [{ code, label }], interestAreas: [{ code, label }],
 *       reflectionTimeFormat: "HH:mm", defaultTimeZone: "Asia/Seoul" }
 * 401 { code: "AUTHENTICATION_REQUIRED" }
 * ```
 *
 * **목록의 주인은 서버다.** 코드도 라벨도 순서도 서버가 정한다 — 그래서 화면이
 * 칩 배열을 들고 있지 않고, 서버가 항목을 늘리면 칩도 저절로 늘어난다.
 * 대신 **`code` 를 그대로 초안에 저장한다**(`draft.ts`) — 우리 id 로 옮겼다가
 * 되돌리면 서버가 새로 넣은 코드에는 옮길 이름이 없어 그 칩만 조용히 사라진다.
 *
 * **없는 항목은 `null` 로 돌려준다.** 폴백은 여기서 하지 않는다 — 무엇을 대신
 * 그릴지는 `model/options.ts` 가 정한다. 어댑터가 기본값까지 지어내면
 * 「서버가 준 것」과 「우리가 지어낸 것」을 호출부가 구분할 수 없다.
 *
 * ⚠ **서버가 주지 않는 것**: 관심사 상한 3 · 닉네임 금지어 · 「기타」 직접 입력
 * 12자. 전부 화면·`draft.ts` 에 남는다.
 *
 * ⚠ **쉬는 방법 15종(`07`)은 이제 서버가 준다** — 응답에 `restMethods` 가 있다
 * (BE `689feca` · 2026-08-10 재반입). **아직 읽지 않는다**: `07` 이 이모지 라벨을
 * id 로 들고 있어 서버 코드로 옮기는 전환이 먼저다(`TASKS.md` 「3단계의 선행 둘」).
 */
export const OPTIONS_PATH = "/api/v1/onboarding/options";

/**
 * 짧은 조회다 — 기본 25초(LLM 턴 기준)를 쓰면 실패한 요청이 그만큼
 * 재시도를 막는다(`model/options.ts` 가 진행 중이면 새로 보내지 않는다).
 */
export const OPTIONS_TIMEOUT_MS = 8_000;

/** 칩 하나. `id` 는 서버의 `code` 다 — 이름만 화면 어휘(`ChipFlow`)에 맞췄다 */
export type Option = { id: string; label: string };

export type NicknamePolicy = {
  maxLength: number;
  /**
   * 지금 서버는 `true` 를 준다. `false` 가 되면 **중복 확인 경로가 필요하다** —
   * 지금은 확인할 엔드포인트가 없어 화면이 할 수 있는 일이 없다.
   */
  duplicateAllowed: boolean;
};

/**
 * 받은 것 — **하나씩 따로 `null` 이 될 수 있다.** 성별만 어긋났다고 관심사까지
 * 버리면 멀쩡한 절반을 잃는다.
 */
export type OnboardingOptions = {
  nickname: NicknamePolicy | null;
  genders: Option[] | null;
  interestAreas: Option[] | null;
  /**
   * `"HH:mm"` · `"Asia/Seoul"`. **아직 아무도 읽지 않는다** — `08` 은
   * `lib/time.ts` 가 정한 `"HH:mm"` 을 쓰고 시간대는 서버가 알아서 한다.
   * 계약에 있으므로 받아는 두고, 쓰는 화면이 생기면 store 로 올린다.
   */
  reflectionTimeFormat: string | null;
  defaultTimeZone: string | null;
};

/** 실패 사유 — **코드**다. 화면 문구는 없다: 실패하면 조용히 폴백으로 그린다 */
export type OptionsFailureCode =
  /** 401 — 서버가 이 토큰을 거부했다 */
  | "unauthorized"
  /** 보낼 토큰이 없어 요청하지 않았다 (갱신 일시 실패가 여기 섞인다) */
  | "no_session"
  | "network"
  | "server"
  | "malformed"
  | "unconfigured";

export type OptionsResult =
  { ok: true; data: OnboardingOptions } | { ok: false; code: OptionsFailureCode };

/** **배열은 객체가 아니다** — `typeof [] === "object"` 라 여기서 걸러야 한다 */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const readBodyCode = (body: unknown): OptionsFailureCode | null => {
  if (!isObject(body)) return null;
  return body.code === "AUTHENTICATION_REQUIRED" ? "unauthorized" : null;
};

const mapError = (error: HttpError): OptionsFailureCode => {
  switch (error.code) {
    case "unconfigured":
      return "unconfigured";
    case "unauthenticated":
      // 보내지 않았다 — 401 과 다르다(`meApi.ts` 의 같은 구분)
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

// ── 런타임 검증 ──────────────────────────────────────────────────────────

const asText = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

/**
 * 칩 목록 하나. **어긋난 항목은 버리고 나머지를 살린다** — 하나가 망가졌다고
 * 목록 전체를 폴백으로 되돌리면 서버가 새로 넣은 항목까지 사라진다.
 * 남는 것이 없으면 `null`(= 폴백을 쓰라는 뜻)이다.
 */
const toOptions = (v: unknown): Option[] | null => {
  if (!Array.isArray(v)) return null;
  const out: Option[] = [];
  for (const item of v) {
    if (!isObject(item)) continue;
    const id = asText(item.code);
    const label = asText(item.label);
    if (id != null && label != null) out.push({ id, label });
  }
  return out.length > 0 ? out : null;
};

/** 상한이 0 이하면 입력칸이 잠긴다 — 그런 값은 받지 않는다 */
const toNicknamePolicy = (v: unknown): NicknamePolicy | null => {
  if (!isObject(v)) return null;
  const { maxLength } = v;
  if (typeof maxLength !== "number" || !Number.isInteger(maxLength) || maxLength <= 0) return null;
  // 서버가 안 주면 「허용」으로 읽는다 — 지금 막을 방법이 없는 쪽이 기본이다
  return { maxLength, duplicateAllowed: v.duplicateAllowed !== false };
};

export const toOnboardingOptions = (v: unknown): OnboardingOptions | null => {
  if (!isObject(v)) return null;

  const parsed: OnboardingOptions = {
    nickname: toNicknamePolicy(v.nickname),
    genders: toOptions(v.genders),
    interestAreas: toOptions(v.interestAreas),
    reflectionTimeFormat: asText(v.reflectionTimeFormat),
    defaultTimeZone: asText(v.defaultTimeZone),
  };

  // **셋 다 못 읽었으면 성공이 아니다.** 「받은 것만 덮는다」는 규칙 때문에
  // 이런 응답도 조용히 통과하는데, 그러면 store 가 「서버 답을 받았다」로
  // 굳어 다시 묻지 않는다 — 대역인 채로 영영 남는다.
  if (parsed.nickname == null && parsed.genders == null && parsed.interestAreas == null) {
    return null;
  }
  return parsed;
};

// ── 호출 ────────────────────────────────────────────────────────────────

/** 선택지를 받아온다. **던지지 않는다** */
export async function fetchOnboardingOptions(options?: {
  signal?: AbortSignal;
}): Promise<OptionsResult> {
  const result = await authedRequest<unknown>("GET", OPTIONS_PATH, undefined, {
    timeoutMs: OPTIONS_TIMEOUT_MS,
    signal: options?.signal,
  });
  if (!result.ok) return { ok: false, code: mapError(result.error) };

  const data = toOnboardingOptions(result.data);
  return data == null ? { ok: false, code: "malformed" } : { ok: true, data };
}
