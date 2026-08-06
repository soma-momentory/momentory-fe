import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { useDraft } from "@/features/onboarding/model/draft";

/**
 * 인증 부트스트랩 (M2-0). `ARCHITECTURE.md §3` 의 규칙을 그대로 옮긴다.
 *
 * ```
 * auth = 'hydrating' | 'anonymous' | 'authenticated'
 * ```
 *
 * - **SecureStore 읽기는 비동기다** — "첫 프레임에 판정"은 성립하지 않는다.
 *   `hydrating` 동안 보이는 것이 곧 `S0` 다(스플래시의 0.8초 하한이 이 읽기를 덮는다).
 * - **실패는 닫는 쪽으로 넘어진다.** 읽기 오류 · 손상된 값 · 만료 전부 `anonymous`.
 *   판단이 안 서면 로그인 화면이다.
 * - **로그인 여부를 다른 곳에 미러링하지 않는다.** 진실은 SecureStore 의 세션
 *   하나이고, 이 store 는 그 판정 결과만 든다.
 * - **라우트 가드가 최종 권한을 갖는다** — 판정은 여기서 하지만 강제는
 *   `(onboarding)`(·나중의 `(tabs)`) 레이아웃이 한다. 진입 판정 한 번으로 끝내지 않는다.
 * - 로그아웃은 세션과 함께 **온보딩 초안도 비운다** — 다음 사용자의 세션에
 *   앞 사람의 답이 남지 않게(§3-5. Query 캐시·아웃박스는 생기는 마일스톤에서 합류).
 *
 * ⚠ **토큰 갱신은 아직 없다.** 서버 계약(`docs/api/openapi.yaml`)이 없어 갱신
 * 엔드포인트도 없다 — 만료면 fail-closed 로 `anonymous` 다. M2-1 에서 소셜
 * SDK · 세션 교환과 함께 갱신을 붙이고, 그때 QueryClient 안쪽의 `AuthGate` 로
 * 옮긴다(`providers.tsx` 의 자리 주석).
 */
export type AuthStatus = "hydrating" | "anonymous" | "authenticated";

/** SecureStore 에 JSON 으로 눕는 세션. 서버 계약 전의 최소 형태다 */
export type Session = {
  accessToken: string;
  /** epoch ms. 지났으면 갱신 대상인데, 갱신이 없으므로 지금은 곧 로그아웃이다 */
  expiresAt: number;
};

/** SecureStore 키 — 세션의 유일한 자리. 미러를 만들지 않는다 */
export const SESSION_KEY = "momentory.session";

type AuthStore = {
  status: AuthStatus;
  /** 콜드 스타트 · 포그라운드 복귀에서 부른다. 결과는 status 로만 나온다 */
  hydrate: () => Promise<void>;
  /**
   * __DEV__ 전용 가짜 세션. 소셜 SDK(M2-1)가 붙기 전까지 화면 개발용 통로다.
   * 릴리스 빌드에서는 아무것도 하지 않는다 — 세션 없이 보호 흐름에 들어가지 않는다.
   */
  signInDev: () => Promise<void>;
  /** 세션 · 온보딩 초안을 함께 비운다 (§3-5) */
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthStore>((set) => ({
  status: "hydrating",

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      if (raw == null) {
        set({ status: "anonymous" });
        return;
      }
      const session = JSON.parse(raw) as Partial<Session>;
      const valid =
        typeof session.accessToken === "string" &&
        typeof session.expiresAt === "number" &&
        session.expiresAt > Date.now();
      if (!valid) {
        // 만료·손상 — 갱신 경로가 없으므로 fail-closed. 죽은 세션은 지워서
        // 다음 부트가 같은 판정을 반복하지 않게 한다.
        await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
        set({ status: "anonymous" });
        return;
      }
      set({ status: "authenticated" });
    } catch {
      // 읽기 오류·복호화 실패 — 판단이 안 서면 로그인 화면이다 (§3-4)
      set({ status: "anonymous" });
    }
  },

  signInDev: async () => {
    if (!__DEV__) return;
    const session: Session = {
      accessToken: "dev",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    } catch {
      // 개발 통로다 — 저장이 실패해도 이 세션 동안은 진행한다
    }
    set({ status: "authenticated" });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    // 초안까지 비운다 — 남기면 다음 사용자의 온보딩에 앞 사람 답이 섞인다
    useDraft.getState().reset();
    set({ status: "anonymous" });
  },
}));
