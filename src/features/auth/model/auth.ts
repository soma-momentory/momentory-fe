import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { exchangeKakaoToken, type AuthFailureCode } from "@/features/auth/data/kakaoAuthApi";
import { requestKakaoAccessToken } from "@/features/auth/data/kakaoSdk";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { useDraft } from "@/features/onboarding/model/draft";

/**
 * 인증 부트스트랩 (M2-0) + 카카오 로그인 (M2-1). `ARCHITECTURE.md §3` 의 규칙을 그대로 옮긴다.
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
 * ⚠ **토큰 갱신은 아직 없다.** 서버가 `refreshToken` 을 주지만 **그것을 쓸
 * 엔드포인트가 합의되지 않았다**(2026-08-07) — 계약이 없는 API 를 지어내지
 * 않는다. 그래서 저장만 하고, 만료면 여전히 fail-closed 로 `anonymous` 다.
 * 계약이 오면 갱신을 붙이면서 QueryClient 안쪽의 `AuthGate` 로 옮긴다
 * (`providers.tsx` 의 자리 주석 · `docs/DISCUSSION.md` §1-6).
 */
export type AuthStatus = "hydrating" | "anonymous" | "authenticated";

/**
 * SecureStore 에 JSON 으로 눕는 세션 — **서버가 발급한 모멘토리 토큰만** 담는다.
 *
 * **카카오 토큰은 여기 없다.** 카카오 access token 은 서버 교환 요청에 한 번
 * 실려 나가고 그대로 버린다 — 앱 세션이 아니므로 기기에 남길 이유가 없고,
 * 남기면 지워야 할 비밀이 하나 더 는다.
 */
export type Session = {
  accessToken: string;
  /** 갱신 계약이 생길 때까지 **저장만** 한다 (위 ⚠) */
  refreshToken: string;
  /** epoch ms. 지났으면 갱신 대상인데, 갱신이 없으므로 지금은 곧 로그아웃이다 */
  expiresAt: number;
  userId: number;
};

/** SecureStore 키 — 세션의 유일한 자리. 미러를 만들지 않는다 */
export const SESSION_KEY = "momentory.session";

/**
 * 로그인 시도의 결과. **셋을 구분한다** — 취소는 오류가 아니고, SDK 실패와
 * 서버 실패는 사용자가 할 수 있는 일이 다르다.
 */
export type SignInOutcome =
  /** 세션이 생겼다. 다음 화면은 `onboardingRequired` 가 정한다 */
  | { kind: "signed-in"; onboardingRequired: boolean }
  /** 사용자가 창을 닫았다 — **아무 말도 하지 않는다** */
  | { kind: "cancelled" }
  /** 실패. `message` 는 화면에 그대로 놓는 **한 줄** 이다 */
  | { kind: "failed"; message: string }
  /** 이미 진행 중이라 무시했다 — 중복 클릭 */
  | { kind: "busy" };

/**
 * 실패 사유 → 사용자 문구. **한 줄이고, 모달·재시도 버튼·경고 아이콘이 없다**
 * (`RULES.md` 4 — "오류·거부·실패는 한 줄 안내로 흡수한다").
 *
 * 기술 용어·상태 코드·서버 메시지를 그대로 노출하지 않는다. 사용자가 할 수
 * 있는 일이 같으면 문구도 같다 — 사유를 세분해 보여줘도 선택지가 늘지 않는다.
 */
const FAILURE_MESSAGES: Record<AuthFailureCode | "sdk", string> = {
  sdk: "카카오 로그인을 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  network: "지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  unconfigured: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  kakao_token_invalid: "카카오 로그인 정보가 만료됐어요. 다시 시도해 주세요.",
  kakao_upstream: "카카오 쪽 연결이 잠시 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  invalid_request: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  server: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  malformed: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
};

/** 세션을 저장하지 못했을 때 — 다음 부트에서 어차피 로그아웃이라 **여기서 닫는다** */
const STORE_FAILED_MESSAGE = "로그인 정보를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

type AuthStore = {
  status: AuthStatus;
  /** 로그인 진행 중 — 버튼을 잠그는 값이자 중복 클릭을 막는 자물쇠다 */
  signingIn: boolean;
  /** 화면에 놓는 한 줄. 취소면 `null` 이다 */
  signInError: string | null;
  /** 콜드 스타트 · 포그라운드 복귀에서 부른다. 결과는 status 로만 나온다 */
  hydrate: () => Promise<void>;
  /**
   * `S1` 의 [카카오로 계속하기]. 카카오 SDK → 서버 교환 → SecureStore 순서다.
   * **어느 단계에서 멈춰도 `authenticated` 가 되지 않는다.**
   */
  signInWithKakao: () => Promise<SignInOutcome>;
  /** 안내 한 줄을 지운다 — 다시 누를 때 지난 실패가 남아 있지 않게 */
  clearSignInError: () => void;
  /**
   * __DEV__ 전용 가짜 세션. 아직 SDK 가 없는 Apple·Google 자리의 개발 통로다.
   * 릴리스 빌드에서는 아무것도 하지 않는다 — 세션 없이 보호 흐름에 들어가지 않는다.
   */
  signInDev: () => Promise<void>;
  /** 세션 · 온보딩 초안을 함께 비운다 (§3-5) */
  signOut: () => Promise<void>;
};

/**
 * 세션의 시계는 **기기 실제 시각**이다 — `src/lib/clock.ts` 를 쓰지 않는다.
 *
 * 그 모듈의 기본값 `SampleClock` 은 화면 데모용으로 날짜를 2026-07-27 에
 * 고정한다. 만료 판정에 그것을 쓰면 저장할 때와 읽을 때의 기준이 갈려
 * 「방금 받은 세션이 이미 만료」가 된다. 날짜 표기가 아니라 **경과 시간**을
 * 재는 자리라 실제 시계가 맞다.
 */
const nowMs = () => Date.now();

const isValidSession = (value: unknown): value is Session => {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Partial<Session>;
  return (
    typeof session.accessToken === "string" &&
    session.accessToken.length > 0 &&
    typeof session.refreshToken === "string" &&
    typeof session.expiresAt === "number" &&
    typeof session.userId === "number" &&
    session.expiresAt > nowMs()
  );
};

/** 저장에 실패하면 **세션이 없는 것으로 친다** — 성공했다고 말하지 않는다 */
const persist = async (session: Session): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
};

export const useAuth = create<AuthStore>((set, get) => ({
  status: "hydrating",
  signingIn: false,
  signInError: null,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      if (raw == null) {
        set({ status: "anonymous" });
        return;
      }
      const session: unknown = JSON.parse(raw);
      if (!isValidSession(session)) {
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

  signInWithKakao: async () => {
    // 중복 클릭 — 두 번째 누름은 카카오 창을 한 번 더 열지 않는다.
    // 두 요청이 겹치면 나중에 끝난 쪽이 앞선 세션을 덮어쓴다.
    if (get().signingIn) return { kind: "busy" };
    set({ signingIn: true, signInError: null });

    try {
      const sdk = await requestKakaoAccessToken();
      if (sdk.kind === "cancelled") {
        // 사용자의 답이다 — 안내 한 줄도 띄우지 않는다
        return { kind: "cancelled" };
      }
      if (sdk.kind === "failed") {
        const message = FAILURE_MESSAGES.sdk;
        set({ signInError: message });
        return { kind: "failed", message };
      }

      const exchanged = await exchangeKakaoToken(sdk.accessToken);
      if (!exchanged.ok) {
        const message = FAILURE_MESSAGES[exchanged.code];
        set({ signInError: message });
        return { kind: "failed", message };
      }

      const { session } = exchanged;
      const stored = await persist({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        // 서버가 주는 것은 **초 단위 잔여 시간**이다. 저장은 절대 시각으로 —
        // 상대 시간을 그대로 두면 앱이 꺼져 있던 동안을 셈에서 놓친다.
        expiresAt: nowMs() + session.accessTokenExpiresIn * 1000,
        userId: session.userId,
      });
      if (!stored) {
        // 기기에 남기지 못한 세션은 앱을 끄면 사라진다 — 그 사실을 지금 말한다
        set({ signInError: STORE_FAILED_MESSAGE });
        return { kind: "failed", message: STORE_FAILED_MESSAGE };
      }

      // 온보딩 완료 여부는 **서버가 정본**이다. 이 기기에 남아 있던 로컬
      // 플래그(앞 사용자·앞 세션의 것)를 서버 답에 맞춰 덮는다.
      const completion = useOnboardingCompletion.getState();
      if (session.onboardingRequired) completion.reset();
      else completion.complete();

      set({ status: "authenticated" });
      return { kind: "signed-in", onboardingRequired: session.onboardingRequired };
    } finally {
      set({ signingIn: false });
    }
  },

  clearSignInError: () => set({ signInError: null }),

  signInDev: async () => {
    if (!__DEV__) return;
    const session: Session = {
      accessToken: "dev",
      refreshToken: "dev",
      expiresAt: nowMs() + 24 * 60 * 60 * 1000,
      userId: 0,
    };
    // 개발 통로다 — 저장이 실패해도 이 세션 동안은 진행한다
    await persist(session);
    set({ status: "authenticated" });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    // 초안까지 비운다 — 남기면 다음 사용자의 온보딩에 앞 사람 답이 섞인다
    useDraft.getState().reset();
    // 온보딩 완료 플래그도 — 남기면 다음 사용자가 남의 완료 상태로 홈에 들어간다
    useOnboardingCompletion.getState().reset();
    set({ status: "anonymous", signInError: null });
  },
}));
