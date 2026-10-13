import { create } from "zustand";

/**
 * 온보딩을 마쳤는가 — **진입 판정(`S0`)이 홈과 온보딩을 가르는 값**이다.
 *
 * `ARCHITECTURE.md §3-2` 가 자리를 정해뒀다: "**MMKV 가 갖는 것은
 * `onboardingCompleted` 같은 비민감 플래그뿐**이고, 그것도 인증 이후에만
 * 읽는다." 세션과 달리 민감하지 않아 SecureStore 가 아니다.
 *
 * **기기에 남기지 않는다** — 정본은 서버다(`auth.ts` `syncMe`). 로그인과 콜드 스타트가
 * 서버에 물어 여기 적는다.
 *
 * **`null` 은 「아직 모른다」이고 `false` 와 다르다.** 서버에 못 물어본 채 켜졌으면(오프라인 ·
 * 서버 장애) `null` 이고, `S0` 는 그때 온보딩으로 보내지 않고 서버가 답할 때까지 기다린다.
 * 둘을 한 값으로 두었을 때는 오프라인으로 켤 때마다 온보딩을 마친 사람에게 온보딩이
 * 다시 떴다(2026-10-13).
 *
 * **인증 이후에만 읽는다** — 로그아웃하면 함께 지운다(`auth.ts` `signOut`).
 * 남겨두면 다음 사용자가 남의 완료 상태로 홈에 들어간다.
 */
type OnboardingCompletionStore = {
  completed: boolean | null;
  /** `10` 완료 화면의 `[모멘토리 시작하기]` 가 부른다 */
  complete: () => void;
  /** 로그아웃·계정 삭제 — 다시 「모른다」로 */
  reset: () => void;
};

export const useOnboardingCompletion = create<OnboardingCompletionStore>((set) => ({
  completed: null,
  complete: () => set({ completed: true }),
  reset: () => set({ completed: null }),
}));
