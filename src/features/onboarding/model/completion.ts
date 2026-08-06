import { create } from "zustand";

/**
 * 온보딩을 마쳤는가 — **진입 판정(`S0`)이 홈과 온보딩을 가르는 값**이다.
 *
 * `ARCHITECTURE.md §3-2` 가 자리를 정해뒀다: "**MMKV 가 갖는 것은
 * `onboardingCompleted` 같은 비민감 플래그뿐**이고, 그것도 인증 이후에만
 * 읽는다." 세션과 달리 민감하지 않아 SecureStore 가 아니다.
 *
 * ⚠ **아직 기기에 남기지 않는다.** MMKV 도입이 M3(`§1` 「도입 예정」)라서
 * 지금은 메모리다 — **앱을 껐다 켜면 온보딩을 다시 본다.** `draft.ts` ·
 * `retro.ts` 와 같은 제약이고 같은 시점에 함께 풀린다.
 * 그때 바뀌는 것은 이 파일 안쪽뿐이고, `S0` 의 분기는 그대로다.
 *
 * **인증 이후에만 읽는다** — 로그아웃하면 함께 지운다(`auth.ts` `signOut`).
 * 남겨두면 다음 사용자가 남의 완료 상태로 홈에 들어간다.
 */
type OnboardingCompletionStore = {
  completed: boolean;
  /** `10` 완료 화면의 `[모멘토리 시작하기]` 가 부른다 */
  complete: () => void;
  /** 로그아웃·계정 삭제 */
  reset: () => void;
};

export const useOnboardingCompletion = create<OnboardingCompletionStore>((set) => ({
  completed: false,
  complete: () => set({ completed: true }),
  reset: () => set({ completed: false }),
}));
