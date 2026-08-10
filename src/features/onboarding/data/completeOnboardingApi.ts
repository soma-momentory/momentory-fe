import {
  OTHER_INTEREST,
  OTHER_REST_METHOD,
  UNSPECIFIED_GENDER,
} from "@/features/onboarding/model/draft";
import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 온보딩 답 커밋 — `PUT /api/v1/users/me/onboarding` (`docs/api/openapi.json`).
 *
 * ```
 * { nickname, age, gender, interestAreas, otherInterestDetail,
 *   restMethods, otherRestMethodDetail, reflectionTime,
 *   calendarIntegrationEnabled, notificationEnabled }
 *   → 200 { userId, onboardingRequired }
 *   → 400 { code, message }   → 401 { code }
 * ```
 *
 * **온보딩 완료의 정본은 서버다.** `syncMe` 가 `onboardingRequired` 를 보고
 * 진입을 가르므로(`auth.ts`), 이 요청이 닿지 않으면 앱을 다시 열었을 때
 * 온보딩을 처음부터 다시 본다 — 그래서 `10` 은 **성공을 확인하고** 홈으로 간다.
 *
 * **화면 모양과 서버 모양이 다른 자리가 셋이다.** 그 번역이 이 파일의 일이고,
 * 화면은 서버 필드 이름을 모른다:
 *
 * 1. **나이는 문자열이 아니다.** 초안은 입력 그대로 `string` 이고 빈 문자열은
 *    「묻지 않기를 골랐다」다 — 서버는 `integer | null` 이라 비면 `null` 이다.
 * 2. **성별의 「미선택」이 서버에 없다.** 초안은 `null`(묻지 않고 지나감)과
 *    `UNSPECIFIED`(해당 없음을 고름)를 구별하는데(`05-b.md`) 서버 `gender` 는
 *    **필수**이고 값이 셋뿐이다. 그래서 `null` 을 `UNSPECIFIED` 로 보낸다 —
 *    **이 경계에서 구별이 사라진다.** 되돌려 받을 방법이 없으므로 `05-b` 를
 *    건너뛴 사람은 다음에 `M2` 에서 「선택 안 함」이 골라진 것으로 보인다.
 * 3. **「기타」의 직접 입력은 칩이 켜져 있을 때만 보낸다.** 칩을 끄고도 값이
 *    남아 있으면 서버에는 「기타를 안 골랐는데 설명이 있는」 모양이 된다.
 *    **반대로 칩이 켜져 있으면 값이 있어야 한다** — 없으면 서버가 400 이다
 *    (`DISCUSSION.md` §1-7). 그 값을 받는 자리가 `06-b` 와 `07` 이다.
 */
export const COMPLETE_ONBOARDING_PATH = "/api/v1/users/me/onboarding";

/**
 * 온보딩의 마지막 한 번이자 `M2` 의 저장이다. 사용자가 `[시작하기]` 를 누르고
 * 기다리는 시간이라 `meApi` 와 같은 자리에 둔다 — 더 길면 앱이 멈춘 것으로 읽힌다.
 */
export const COMPLETE_ONBOARDING_TIMEOUT_MS = 10_000;

/**
 * 보내는 것 — **초안·프로필의 말로 받는다.** 화면이 서버 필드 이름을 알 필요가
 * 없고, 서버가 이름을 바꾸면 이 파일만 고친다.
 */
export type OnboardingSubmission = {
  nickname: string;
  /** 입력 그대로. 빈 문자열은 「묻지 않기를 골랐다」 */
  age: string;
  /** `null` 은 미선택 — 서버에 보낼 때 `UNSPECIFIED` 가 된다(위 2번) */
  gender: string | null;
  /** 서버 `interestAreas[].code` */
  interests: string[];
  interestOther: string;
  /** 서버 `restMethods[].code` — 이모지 라벨이 아니다 */
  restMethods: string[];
  restMethodOther: string;
  /** `"HH:mm"` */
  retroTime: string;
  notifyRetro: boolean;
  calendarLinked: boolean;
};

export type CompleteOnboardingFailureCode =
  /** 400 — 서버가 받을 수 없는 답이다. **사용자가 고칠 수 있는 것이 있다** */
  | "invalid"
  /** 401 — 서버가 이 토큰을 거부했다 */
  | "unauthorized"
  /** 보낼 토큰이 없어 요청하지 않았다 (갱신 일시 실패가 여기 섞인다) */
  | "no_session"
  | "network"
  | "server"
  | "malformed"
  | "unconfigured";

export type CompleteOnboardingResult =
  | { ok: true; data: { onboardingRequired: boolean } }
  | { ok: false; code: CompleteOnboardingFailureCode };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** 빈 문자열·공백뿐이면 「없음」이다 — 서버에 빈 문자열을 눕히지 않는다 */
const asDetail = (v: string): string | null => {
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * 나이는 **정수이거나 없다.** 숫자가 아닌 것이 들어오면 `null` 이다 — 입력칸이
 * `number-pad` 라 정상 경로로는 오지 않지만, 그 가정을 여기서 다시 세우지 않는다.
 */
const asAge = (v: string): number | null => {
  const trimmed = v.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

/** 화면의 말 → 서버의 말. **테스트가 보는 곳이라 따로 내보낸다** */
export const toRequestBody = (input: OnboardingSubmission) => ({
  nickname: input.nickname.trim(),
  age: asAge(input.age),
  // 미선택(null)은 서버에 없다 — 「선택 안 함」으로 접힌다(위 2번)
  gender: input.gender ?? UNSPECIFIED_GENDER,
  interestAreas: input.interests,
  // 칩이 꺼져 있으면 값이 남아 있어도 보내지 않는다
  otherInterestDetail: input.interests.includes(OTHER_INTEREST)
    ? asDetail(input.interestOther)
    : null,
  // **빈 배열은 400 이다** — 생략(`null`)은 「유지」로 읽힌다(`TASKS.md` 계약 성질).
  // `07` 이 1개 이상을 강제하므로 온보딩에는 오지 않는 길이고, `M2` 에서 전부
  // 지웠을 때가 여기다: 비울 방법이 계약에 없으므로 **지금 값을 그대로 둔다.**
  restMethods: input.restMethods.length > 0 ? input.restMethods : null,
  otherRestMethodDetail: input.restMethods.includes(OTHER_REST_METHOD)
    ? asDetail(input.restMethodOther)
    : null,
  reflectionTime: input.retroTime,
  calendarIntegrationEnabled: input.calendarLinked,
  notificationEnabled: input.notifyRetro,
});

const readBodyCode = (body: unknown): CompleteOnboardingFailureCode | null => {
  if (!isObject(body)) return null;
  return body.code === "AUTHENTICATION_REQUIRED" ? "unauthorized" : null;
};

const mapError = (error: HttpError): CompleteOnboardingFailureCode => {
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
      if (error.status === 401) return "unauthorized";
      return error.status === 400 ? "invalid" : "server";
    }
  }
};

/**
 * 온보딩 답을 서버에 남긴다. **던지지 않는다** — 실패는 전부 사유 코드다.
 *
 * 응답의 `onboardingRequired` 를 그대로 돌려준다. 200 인데 아직 `true` 라면
 * 서버가 받고도 완료로 치지 않은 것이라, 화면은 **성공으로 보지 않는다** —
 * 그대로 홈에 보내면 다음 실행에 온보딩이 다시 뜬다.
 */
export async function completeOnboarding(
  input: OnboardingSubmission,
  options?: { signal?: AbortSignal },
): Promise<CompleteOnboardingResult> {
  const result = await authedRequest<unknown>(
    "PUT",
    COMPLETE_ONBOARDING_PATH,
    toRequestBody(input),
    { timeoutMs: COMPLETE_ONBOARDING_TIMEOUT_MS, signal: options?.signal },
  );
  if (!result.ok) return { ok: false, code: mapError(result.error) };

  const body = result.data;
  if (!isObject(body) || typeof body.onboardingRequired !== "boolean") {
    return { ok: false, code: "malformed" };
  }
  return { ok: true, data: { onboardingRequired: body.onboardingRequired } };
}
