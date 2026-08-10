import type { CompleteOnboardingFailureCode } from "@/features/onboarding/data/completeOnboardingApi";

/**
 * 온보딩 답을 서버에 남기지 못했을 때의 **한 줄**.
 *
 * 두 화면이 같은 엔드포인트를 쓴다 — `10`(온보딩 완료)과 `M2`(회고 프로필
 * 저장). 문구를 화면마다 적으면 한쪽만 고쳐지고, 같은 실패가 두 말투로 보인다.
 *
 * **어댑터가 아니라 여기 있다.** `data/` 는 사유 코드까지만 안다(`optionsApi.ts`
 * 주석 · `auth.ts` 가 `kakaoAuthApi` 의 코드를 문구로 바꾸는 것과 같은 층).
 *
 * 말투는 `S1` 과 같다 — **무엇을 할 수 있는지만** 말하고 원인을 늘어놓지 않는다
 * (`RULES.md` 4). `invalid`(400)만 다르다: 다시 눌러도 같은 답이 나가므로
 * 「잠시 뒤」가 거짓말이 된다 — 고칠 곳으로 보낸다.
 */
export const ONBOARDING_FAILURE_MESSAGES: Record<CompleteOnboardingFailureCode, string> = {
  invalid: "답을 저장하지 못했어요. 뒤로 가서 답을 확인해 주세요.",
  unauthorized: "로그인이 만료됐어요. 다시 로그인해 주세요.",
  no_session: "로그인이 만료됐어요. 다시 로그인해 주세요.",
  network: "지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  server: "지금은 저장할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  malformed: "지금은 저장할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  unconfigured: "지금은 저장할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
};
