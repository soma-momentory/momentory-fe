import { captureAnalytics, identifyAnalytics, resetAnalytics, track } from "@/features/analytics";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import {
  exchangeAppleIdentityToken,
  type AppleAuthFailureCode,
} from "@/features/auth/data/appleAuthApi";
import { requestAppleCredential } from "@/features/auth/data/appleSdk";
import {
  exchangeGoogleIdToken,
  type GoogleAuthFailureCode,
} from "@/features/auth/data/googleAuthApi";
import {
  requestGoogleIdToken,
  revokeGoogleAccess,
  signOutGoogle,
} from "@/features/auth/data/googleSdk";
import { exchangeKakaoToken, type AuthFailureCode } from "@/features/auth/data/kakaoAuthApi";
import { requestKakaoAccessToken } from "@/features/auth/data/kakaoSdk";
import { type LoginSession } from "@/features/auth/data/loginSession";
import { revokeRefreshToken } from "@/features/auth/data/logoutApi";
import { fetchMe } from "@/features/auth/data/meApi";
import { reissueAccessToken, type ReissueFailureCode } from "@/features/auth/data/reissueApi";
import { deleteAccount, type WithdrawFailureCode } from "@/features/auth/data/withdrawApi";
import { useMonthSchedules } from "@/features/archive/model/monthSchedules";
import { clearSyncState } from "@/features/calendar/data/syncStateStore";
import { useCalendarSync } from "@/features/calendar/model/calendarSync";
import { useDiary } from "@/features/diary/model/diary";
import { useDay } from "@/features/home/model/day";
import { adoptProfile, useProfile, useSettings } from "@/features/my/model/settings";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { useDraft } from "@/features/onboarding/model/draft";
import { clearGuideMemory } from "@/features/rest/data/guideMemory";
import { clearRecommendationMemory } from "@/features/rest/data/recommendMemory";
import { useRetro } from "@/features/retro/model/retro";

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
 * - **로그아웃** — 기기의 세션과 사용자에게 묶인 store 를 비우고(§3-5 ·
 *   `clearUserScopedStores`), `POST /api/v1/auth/logout` 으로 서버의 refresh token
 *   도 폐기한다(`logoutApi.ts`). **로컬을 먼저 비우고 폐기는 배웅으로 보낸다** —
 *   기다리지 않으므로 서버가 죽어 있어도 로그아웃은 즉시 끝난다.
 * - **토큰 갱신** — access token 이 만료됐고 refresh token 이 있으면 `POST
 *   /api/v1/auth/reissue` 로 조용히 새 토큰 쌍을 받는다(`reissueApi.ts`). **서버가
 *   refresh token 을 실제로 거부했을 때만**(폐기·만료·무효) `anonymous` 로 닫고
 *   세션을 지운다 — 네트워크·타임아웃·서버 오류처럼 이번 시도만 실패한 것뿐인
 *   경우는 세션을 그대로 두고 다음 호출이 다시 시도하게 한다. 여기서까지
 *   fail-closed 를 적용하면 순간적인 연결 문제 한 번에 멀쩡한 로그인이
 *   영구히 날아간다. **refresh token 은 한 번 쓰면 서버가 폐기하고 회전한다** —
 *   동시에 여러 요청이 만료를 보고 각자 갱신을 시도하면 나중 것이
 *   `REFRESH_TOKEN_REVOKED` 로 튕긴다. `refreshInFlight` 하나로 이 창을 닫는다 —
 *   전체 세션에 갱신은 한 번에 하나뿐이다.
 * - **내가 누구인가는 서버가 답한다** — 세션이 살아 있으면 `GET /api/v1/users/me`
 *   로 온보딩 완료 여부와 프로필을 받아 온다(`meApi.ts`). 그전까지 완료 여부는
 *   기기 메모리에만 있어서 **앱을 껐다 켜면 온보딩을 다시 봤다.** 조회가 실패하면
 *   아무것도 덮지 않는다 — **401 만 세션 폐기 신호로 읽는다.**
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
  refreshToken: string;
  /** epoch ms. 지나면 access token 은 죽고 refresh 대상이다 */
  expiresAt: number;
  userId: number;
};

/** SecureStore 키 — 세션의 유일한 자리. 미러를 만들지 않는다 */
export const SESSION_KEY = "momentory.session";

/**
 * 지금 세션의 사용자 id. **store 에 미러를 두지 않는 규칙**(§3) 때문에 세션을
 * 그때그때 읽는다 — 진실은 SecureStore 에 있다.
 *
 * 사용자마다 따로 눕는 것(캘린더 동기화 상태 등)을 다루는 쪽이 부른다. 그쪽이
 * `auth` 를 import 하는 방향이어야 한다 — 반대로 하면 `auth` 가 이미 그 모듈들을
 * 로그아웃에서 부르고 있어 **순환 import** 가 된다.
 */
export async function currentUserId(): Promise<number | null> {
  return (await readSession())?.userId ?? null;
}

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

/**
 * 애플 로그인의 실패 사유 → 사용자 문구. 카카오와 **같은 규칙, 다른 표**다
 * (`RULES.md` 4 — 한 줄 · 모달·재시도 버튼·경고 아이콘 없음).
 *
 * 표를 합치지 않는다 — 「카카오 로그인을 마치지 못했어요」가 애플 줄에서 뜨면
 * 사용자는 누른 적 없는 것의 실패를 읽는다. 사유 이름이 같아도 문구는 갈린다.
 *
 * **재시도를 권하지 않는 둘**이 있다 — 다시 눌러도 같기 때문이다:
 *
 * - `unavailable` — Android 이거나 iOS 12 이하이거나 기기에 애플 계정이 없다
 *   (`appleSdk.ts`). 이 기기에서는 애플 줄이 앞으로도 안 된다
 * - `apple_email_unavailable` — 서버도 애플도 정상인데 **토큰에 확인된 이메일이
 *   없다**(`appleAuthApi.ts`). 사용자가 애플 ID 설정에서 이메일 공유를 켜야
 *   풀리는 일이라, **유일하게 사용자가 할 일을 알려 주는 문구**다
 *
 * `apple_client_mismatch` 와 `apple_nonce_mismatch` 는 사용자가 할 수 있는 일이
 * 없어 `apple_token_invalid` 와 **같은 문장**을 준다 — 사유를 갈라 둔 것은
 * 우리가 읽기 위해서다(둘 다 「우리 설정이 틀렸다」의 신호일 수 있다).
 */
const APPLE_FAILURE_MESSAGES: Record<AppleAuthFailureCode | "sdk" | "unavailable", string> = {
  sdk: "애플 로그인을 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  unavailable: "이 기기에서는 애플 로그인을 쓸 수 없어요. 다른 방법으로 로그인해 주세요.",
  apple_email_unavailable:
    "애플 계정 이메일을 확인할 수 없어요. 애플 ID 설정에서 이메일 공유를 켠 뒤 다시 시도해 주세요.",
  apple_token_invalid: "애플 로그인 정보가 만료됐어요. 다시 시도해 주세요.",
  apple_nonce_mismatch: "애플 로그인 정보가 만료됐어요. 다시 시도해 주세요.",
  apple_client_mismatch: "애플 로그인 정보가 만료됐어요. 다시 시도해 주세요.",
  apple_upstream: "애플 쪽 연결이 잠시 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  network: "지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  unconfigured: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  invalid_request: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  server: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  malformed: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
};

/** 세션을 저장하지 못했을 때 — 다음 부트에서 어차피 로그아웃이라 **여기서 닫는다** */
const STORE_FAILED_MESSAGE = "로그인 정보를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

/**
 * 회원탈퇴 실패 사유 → 사용자 문구. 로그인 실패와 같은 규칙이다 — **한 줄이고
 * 모달·재시도 버튼이 없다**(`RULES.md` 4). 확인 모달은 실행 **전** 되돌릴 수
 * 없음을 알리는 자리이고, 실패는 그 뒤 **한 줄로 흡수한다.**
 *
 * `kakao` 는 사유를 조금 더 밝힌다 — 계정이 지워지지 않았음을 사용자가 알아야
 * 「탈퇴됐나?」를 확인하러 다시 들어오지 않는다. 나머지는 재시도가 답이라 같다.
 */
/**
 * 구글 실패 문구. **애플 것과 합치지 않는다** — 사유의 개수도 뜻도 다르고,
 * 사용자가 누른 줄의 이름이 문장에 들어간다(`googleAuthApi.ts` 머리말).
 *
 * ⚠ `misconfigured`(앱의 클라이언트 ID 누락)와 `unconfigured`(API 주소 누락 ·
 * `loginSession.ts`)는 **다른 것이다.** 이름이 비슷해 합치고 싶어지지만, 앞은
 * 구글 줄만 막히고 뒤는 세 줄이 전부 막힌다 — 문구도 그래서 다르다.
 *
 * `misconfigured`(우리 설정 누락)와 `unavailable`(Play 서비스 없음)을 가르는 것은
 * **재시도를 권할지가 갈리기** 때문이다 — 앞은 우리가 고칠 때까지 같고,
 * 뒤는 이 기기에서 영영 안 된다.
 */
const GOOGLE_FAILURE_MESSAGES: Record<
  GoogleAuthFailureCode | "sdk" | "unavailable" | "misconfigured",
  string
> = {
  sdk: "Google 로그인을 마치지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  unavailable: "이 기기에서는 Google 로그인을 쓸 수 없어요. 다른 방법으로 로그인해 주세요.",
  misconfigured: "지금은 Google 로그인을 쓸 수 없어요. 다른 방법으로 로그인해 주세요.",
  google_email_unavailable: "Google 계정 이메일을 확인할 수 없어요. 다른 방법으로 로그인해 주세요.",
  google_token_invalid: "Google 로그인 정보가 만료됐어요. 다시 시도해 주세요.",
  google_client_mismatch: "Google 로그인 정보가 만료됐어요. 다시 시도해 주세요.",
  google_upstream: "Google 쪽 연결이 잠시 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  network: "지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  unconfigured: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  invalid_request: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  server: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  malformed: "지금은 로그인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
};

const WITHDRAW_FAILURE_MESSAGES: Record<WithdrawFailureCode, string> = {
  unauthenticated: "다시 로그인한 뒤 시도해 주세요.",
  kakao: "카카오 연결 해제에 실패해 탈퇴하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  network: "지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  server: "지금은 탈퇴할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  unconfigured: "지금은 탈퇴할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
};

type AuthStore = {
  status: AuthStatus;
  /** 로그인 진행 중 — 버튼을 잠그는 값이자 중복 클릭을 막는 자물쇠다 */
  signingIn: boolean;
  /** 화면에 놓는 한 줄. 취소면 `null` 이다 */
  signInError: string | null;
  /** 콜드 스타트 · 포그라운드 복귀에서 부른다. 결과는 status 로만 나온다 */
  hydrate: () => Promise<void>;
  /**
   * 서버에 지금 토큰의 주인을 묻고 **온보딩 완료 여부와 프로필을 맞춘다.**
   * 실패는 조용하다 — 401 일 때만 세션을 내린다.
   */
  syncMe: () => Promise<void>;
  /**
   * `S1` 의 [카카오 로그인]. 카카오 SDK → 서버 교환 → SecureStore 순서다.
   * **어느 단계에서 멈춰도 `authenticated` 가 되지 않는다.**
   */
  signInWithKakao: () => Promise<SignInOutcome>;
  /**
   * `S1` 의 [Apple로 로그인]. 애플 SDK → 서버 교환 → SecureStore 순서다 —
   * **카카오와 같다**(2026-08-24 · `POST /api/v1/auth/apple`).
   * **어느 단계에서 멈춰도 `authenticated` 가 되지 않는다.**
   */
  signInWithApple: () => Promise<SignInOutcome>;
  /**
   * 구글 로그인. 카카오·애플과 **같은 순서, 같은 코드**다 —
   * SDK → 서버 교환 → SecureStore. 자물쇠(`signingIn`)도 셋이 나눠 쓴다.
   */
  signInWithGoogle: () => Promise<SignInOutcome>;
  /** 안내 한 줄을 지운다 — 다시 누를 때 지난 실패가 남아 있지 않게 */
  clearSignInError: () => void;
  /**
   * __DEV__ 전용 가짜 세션. 아직 SDK 가 없는 **Google** 자리의 개발 통로다.
   * 애플은 2026-08-24 부터 자기 갈래(`signInWithApple`)를 지난다 — 이 통로를 쓰지 않는다.
   * 릴리스 빌드에서는 아무것도 하지 않는다 — 세션 없이 보호 흐름에 들어가지 않는다.
   */
  signInDev: () => Promise<void>;
  /**
   * 기기의 세션 · 사용자에게 묶인 store 를 비우고, 서버의 refresh token 도
   * 폐기한다 (§3-5). **폐기를 기다리지 않는다** — 즉시 `anonymous` 로 닫는다
   */
  signOut: () => Promise<void>;
  /**
   * 회원탈퇴 — `DELETE /api/v1/users/me`. **로그아웃과 달리 서버를 기다린다** —
   * 카카오 연결 해제가 실패하면 계정이 남으므로, 성공했을 때만 세션과 기기 흔적을
   * 비우고 `anonymous` 로 닫는다. 성공하면 `true`.
   */
  withdraw: () => Promise<boolean>;
  /** 진행 중 — 확인 버튼을 잠그는 값이자 중복 실행을 막는 자물쇠다 */
  withdrawing: boolean;
  /** 탈퇴 실패 한 줄. 성공·재시도 시작 때 `null` 이다 */
  withdrawError: string | null;
  /** 안내 한 줄을 지운다 — 확인 모달을 다시 열 때 지난 실패가 남지 않게 */
  clearWithdrawError: () => void;
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

/** 모양만 본다 — 만료 여부는 별도(`isExpired`)다 */
const isSessionShape = (value: unknown): value is Session => {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Partial<Session>;
  return (
    typeof session.accessToken === "string" &&
    session.accessToken.length > 0 &&
    typeof session.refreshToken === "string" &&
    typeof session.expiresAt === "number" &&
    typeof session.userId === "number"
  );
};

const isExpired = (session: Session): boolean => session.expiresAt <= nowMs();

/** 저장에 실패하면 **세션이 없는 것으로 친다** — 성공했다고 말하지 않는다 */
const persist = async (session: Session): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
};

/**
 * SecureStore 의 세션을 읽어 **모양까지 확인한 것만** 돌려준다.
 *
 * 없음 · 손상 · 읽기 오류를 전부 `null` 하나로 접는다 — **무엇을 할지는 호출부가
 * 정한다.** `hydrate` 는 죽은 값을 지우고 로그인 화면으로 닫고, `getAccessToken`
 * 은 그냥 토큰이 없다고 답하고, `signOut` 은 폐기할 refresh token 을 여기서 든다.
 *
 * **만료는 보지 않는다** — 만료된 세션도 refresh token 은 살아 있어 갱신·폐기에
 * 쓸 수 있다. 만료 판정은 `isExpired` 가 따로 한다.
 */
const readSession = async (): Promise<Session | null> => {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (raw == null) return null;
    const session: unknown = JSON.parse(raw);
    return isSessionShape(session) ? session : null;
  } catch {
    return null;
  }
};

/**
 * 폐기 실패를 **개발 빌드에서만** 남긴다 — `kakaoSdk.ts` 와 같은 방식.
 *
 * 로그아웃은 결과를 보지 않는 설계다(그래야 서버가 죽어도 로그아웃이 끝난다).
 * 그런데 그 침묵은 **폐기가 성공한 것과 요청이 나가지도 못한 것을 구분할 수
 * 없게** 만든다 — 실제로 이 경로는 검증할 방법이 없어 한 번 막혔다. 사유 코드
 * 한 줄이면 logcat 에서 갈린다: 아무 말이 없으면 서버가 받았다는 뜻이다.
 *
 * **남기는 것은 사유 코드뿐이다** — 토큰도 본문도 남기지 않는다
 * (`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 */
const warnInDev = (reason: string) => {
  if (__DEV__) console.warn("[auth] 로그아웃 폐기 실패:", reason);
};

/**
 * 로그아웃·계정 삭제가 비우는 것 — **목록의 단일 지점**이다(`ARCHITECTURE §3-5`).
 *
 * 남기면 다음 사용자의 세션에 앞 사람의 것이 섞인다. 온보딩 답만의 문제가 아니다 —
 * `useRetro` 는 **서버가 그 사용자를 위해 생성한 대화 전문**을 들고 있고, `useDiary`
 * 는 그 대화가 남긴 일기다. 로그인 화면으로 나갔다가 다른 계정으로 들어와도
 * 메모리에 그대로 있으면 그건 남의 기록을 보여주는 것이다.
 *
 * ⚠ **아직 못 비우는 것이 셋 있다** — MMKV 캐시 · Query 캐시 · 아웃박스 큐.
 * 셋 다 도입 전이라 비울 것이 없다. 생기는 마일스톤에서 이 함수에 합류한다
 * (§3-5 · §4 "큐는 계정에 묶인다. 로그아웃 시 비운다").
 */
const clearUserScopedStores = (userId?: number) => {
  resetAnalytics();
  useDraft.getState().reset();
  useOnboardingCompletion.getState().reset();
  useRetro.getState().reset();
  useDiary.getState().reset();
  // 일정이 서버에서 오면서 앞 사람의 하루가 남을 수 있게 됐다 (2026-08-11)
  useDay.getState().reset();
  // 보관함이 든 한 달치 일정도 앞 사람의 것이다 (2026-08-24)
  useMonthSchedules.getState().reset();
  useProfile.getState().reset();
  useSettings.getState().reset();
  useCalendarSync.getState().reset();

  // 캘린더 동기화 상태는 **기기에 눕는다** — 메모리를 비우는 것만으로는 부족하다.
  // 남기면 다음 사용자가 앞 사람의 해시와 비교해 **자기 첫 동기화를 통째로
  // 건너뛴다**(`syncStateStore.ts`). `userId` 를 모르면 지울 키도 없으므로
  // 부르는 쪽이 세션을 지우기 **전에** 읽어 넘겨야 한다.
  //
  // 기다리지 않는다 — 로그아웃은 실패할 수 없는 동작이고(아래 `signOut` 주석),
  // 지우지 못해도 키에 `userId` 가 박혀 있어 다른 계정이 그것을 보지는 않는다.
  if (userId != null) void clearSyncState(userId);
  // 쉼 추천의 기기 기억(오늘 매듭지었나 · 연달아 닫은 횟수)도 그 사람의 것이다 (2026-10-12)
  void clearRecommendationMemory();
  // 설명 카드를 본 쉼터도 그 사람의 것이다 — 다음 사람도 처음 들어간 쉼터에서 카드를 본다
  void clearGuideMemory();
};

/**
 * 서버가 내준 세션을 **이 기기의 로그인 상태로 만든다** — 카카오와 애플이 함께 쓴다.
 *
 * 교환 뒤의 일은 **공급자를 묻지 않는다.** 저장 · 온보딩 플래그 · `authenticated` ·
 * 프로필 배웅까지 순서와 판정이 같아서, 따로 두면 한쪽만 고쳐진 채로 남는다 —
 * 그리고 그 어긋남은 「로그인은 됐는데 온보딩이 다시 뜬다」처럼 **로그인이 끝난
 * 뒤에야** 드러난다.
 *
 * 실패는 하나뿐이다: **기기에 남기지 못한 경우.** 그때는 `authenticated` 로
 * 넘기지 않는다 — 앱을 끄면 사라질 세션을 「로그인됐다」고 말하지 않는다.
 */
const adoptSession = async (
  set: (partial: Partial<AuthStore>) => void,
  get: () => AuthStore,
  session: LoginSession,
  provider: "kakao" | "apple" | "google",
): Promise<SignInOutcome> => {
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
    track("login_not_completed", { provider, outcome: "failed" });
    return { kind: "failed", message: STORE_FAILED_MESSAGE };
  }

  // 온보딩 완료 여부는 **서버가 정본**이다. 이 기기에 남아 있던 로컬
  // 플래그(앞 사용자·앞 세션의 것)를 서버 답에 맞춰 덮는다.
  useOnboardingCompletion.setState({ completed: !session.onboardingRequired });

  identifyAnalytics(session.userId);
  track("login_succeeded", { provider, onboarding_required: session.onboardingRequired });
  set({ status: "authenticated" });

  // 프로필을 뒤따라 채운다 — **기다리지 않는다.** 다음 화면은 위 플래그가
  // 이미 정했고, 여기서 더 받을 것은 닉네임·관심사뿐이라 로그인을 붙잡을
  // 이유가 없다. 실패해도 조용하다(`syncMe`).
  void get().syncMe();

  return { kind: "signed-in", onboardingRequired: session.onboardingRequired };
};

/**
 * 계보가 갈린 뒤 손에 남은 refresh token 을 **서버에서도 지운다.**
 *
 * 서버는 이미 회전시켰다 — 우리가 안 쓴다고 그것이 죽는 것은 아니다. 그냥 버리면
 * **로그아웃한 기기가 받아온 토큰이 서버에 살아남는다.** 로그아웃이 보낸 폐기는
 * 그보다 앞선(이미 폐기된) 토큰을 가리켰으므로 이 한 장은 아무도 지우지 않는다.
 *
 * 로그아웃과 같은 배웅이다 — 기다리지 않고 결과도 보지 않는다.
 */
const orphanRevoke = (refreshToken: string) => {
  void revokeRefreshToken(refreshToken).then((result) => {
    if (!result.ok) warnInDev(result.code);
  });
};

/**
 * **갱신은 자기가 시작한 세션만 교체한다** — 기기에 있는 것이 아직 `expected` 일
 * 때만 `next` 로 바꾼다.
 *
 * 갱신은 서버 왕복이라 **그 사이에 세션이 갈릴 수 있다.** 확인 없이 쓰면 두 방향으로
 * 잘못된다 — 그새 로그아웃했으면 지워진 세션을 **되살리고**(다음 부트에 조용히
 * 로그인된 상태가 된다), 다른 계정으로 들어왔으면 **남의 세션을 덮는다.**
 *
 * ⚠ 읽기와 쓰기 사이의 한 틱은 여전히 열려 있다 — SecureStore 에 원자적 교체가
 * 없어서 그 이상은 잠금 없이 좁힐 수 없다. 왕복(초 단위)이 마이크로태스크 몇 개로
 * 줄어드는 것이 이 함수가 하는 일이다.
 */
type SwapResult = "written" | "stale" | "failed";

const swapSession = async (expected: Session, next: Session): Promise<SwapResult> => {
  const current = await SecureStore.getItemAsync(SESSION_KEY).catch(() => null);
  if (current !== JSON.stringify(expected)) return "stale";
  return (await persist(next)) ? "written" : "failed";
};

/**
 * 갱신하던 세션이 **아직 그대로일 때만** 지운다. 지웠으면 `true`.
 *
 * 서버가 refresh token 을 거부했을 때 쓴다. 확인 없이 지우면 그새 들어온 **새
 * 세션을 지우게 된다** — 갓 로그인한 사용자가 이유 없이 튕겨 나간다.
 *
 * **지웠는지를 돌려주는 것이 중요하다** — 못 지웠다는 것은 이 거부가 지금 세션과
 * 관계없다는 뜻이고, 그때 `evicted` 라고 말하면 호출부가 멀쩡한 로그인을 내린다.
 */
const deleteIfUnchanged = async (expected: Session): Promise<boolean> => {
  const current = await SecureStore.getItemAsync(SESSION_KEY).catch(() => null);
  if (current !== JSON.stringify(expected)) return false;
  await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
  return true;
};

/**
 * 서버가 refresh token 자체를 거부한 사유 — 재로그인 말고는 답이 없다.
 * 네트워크·타임아웃·서버 5xx·형태 위반은 **여기 없다** — 그건 이 순간의 요청이
 * 실패한 것뿐이지 refresh token 이 죽었다는 근거가 아니다. 이걸 구분하지 않고
 * 아무 실패에나 세션을 지우면, 에뮬레이터·서버 사이 한 번의 순간적인 지연·오류로
 * 멀쩡한 refresh token 이 날아가 계속 재로그인해야 하는 상태가 된다.
 */
const isRefreshTokenDead = (code: ReissueFailureCode): boolean =>
  code === "refresh_invalid" || code === "refresh_revoked" || code === "refresh_expired";

/**
 * 갱신 시도 결과. **셋을 구분한다** — 실패를 `null` 하나로만 표현하면 호출부가
 * 종류를 다시 추측하게 되고, 일시적 실패에도 로그아웃 처리를 하게 된다.
 */
type RefreshOutcome =
  | { ok: true; session: Session }
  /** refresh token 이 실제로 거부됐다 — 재로그인 말고는 답이 없다 */
  | { ok: false; reason: "evicted" }
  /** 이번 시도만 실패했다(네트워크·5xx 등) — 세션은 그대로다 */
  | { ok: false; reason: "retry" }
  /**
   * 갱신이 도는 사이 세션이 갈렸다 — **결과를 버린다.** 상태 판정은 세션을 바꾼
   * 쪽(로그아웃·로그인)이 이미 했으므로 여기서 덧쓰지 않는다.
   */
  | { ok: false; reason: "stale" };

/**
 * 죽은 access token 을 새 access/refresh 쌍으로 바꾼다. **refresh token 이
 * 실제로 거부됐을 때만** 세션을 지운다 — 그 밖의 실패는 이번 시도만 접고,
 * 세션은 남겨 다음 API 호출이 다시 시도할 수 있게 한다.
 */
const performRefresh = async (session: Session): Promise<RefreshOutcome> => {
  const reissued = await reissueAccessToken(session.refreshToken);

  if (!reissued.ok) {
    if (!isRefreshTokenDead(reissued.code)) return { ok: false, reason: "retry" };
    // 죽은 세션을 지운다 — 단 **그 사이 갈리지 않았을 때만.** 로그아웃 뒤 다시
    // 로그인했다면 지금 있는 것은 새 세션이고, 그건 이 거부와 관계가 없다
    const removed = await deleteIfUnchanged(session);
    return { ok: false, reason: removed ? "evicted" : "stale" };
  }

  // 갱신은 세션의 주인을 바꾸지 않는다 — userId 는 옛 세션 것을 그대로 쓴다
  // (`reissueApi.ts` 의 응답 계약엔 userId 가 없다).
  const refreshed: Session = {
    accessToken: reissued.session.accessToken,
    refreshToken: reissued.session.refreshToken,
    expiresAt: nowMs() + reissued.session.accessTokenExpiresIn * 1000,
    userId: session.userId,
  };

  switch (await swapSession(session, refreshed)) {
    case "written":
      return { ok: true, session: refreshed };
    case "stale":
      // 왕복 사이에 로그아웃했거나 다른 계정으로 들어왔다. 아무것도 쓰지 않는다
      orphanRevoke(refreshed.refreshToken);
      return { ok: false, reason: "stale" };
    case "failed": {
      // 새로 받은 토큰을 기기에 남기지 못했다 — 이 쌍은 이미 쓴 것으로 서버에
      // 기록됐으니 옛 refresh token 도 다음 시도에 못 쓴다. 세션을 지운다.
      const removed = await deleteIfUnchanged(session);
      return { ok: false, reason: removed ? "evicted" : "stale" };
    }
  }
};

/**
 * 진행 중인 갱신 요청 — 전역에 하나만 둔다. refresh token 은 회전해 한 번
 * 쓰면 서버가 폐기하므로, 동시에 두 호출이 각자 재발급을 보내면 늦은 쪽이
 * `REFRESH_TOKEN_REVOKED` 로 튕긴다. 진행 중이면 그 결과를 나눠 받는다.
 */
let refreshInFlight: Promise<RefreshOutcome> | null = null;

const refreshSession = (session: Session): Promise<RefreshOutcome> => {
  if (refreshInFlight == null) {
    refreshInFlight = performRefresh(session).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

/**
 * 인증 API 호출에 실을 **모멘토리 access token**. 없거나 손상이면, 혹은
 * 만료됐는데 refresh token 마저 죽어 있으면 `null`.
 *
 * **`useAuth` store 가 아니라 SecureStore 에서 읽는다** — 토큰의 정본은 세션
 * 하나뿐이고 store 는 판정 결과(`status`)만 든다. 미러를 만들면 로그아웃·만료
 * 뒤에 죽은 토큰이 남아 인증된 것처럼 요청을 실어 보낸다.
 *
 * 만료면 **여기서 조용히 갱신을 시도한다** — 성공하면 호출부는 만료를 아예
 * 모른 채 새 토큰을 받는다. **refresh token 이 실제로 거부됐을 때만** `status`
 * 를 내려 라우트 가드가 즉시 로그인으로 돌려보내게 한다(다음 `hydrate` 를
 * 기다리지 않는다) — 일시적 실패(네트워크 등)로는 로그아웃시키지 않는다.
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    const session = await readSession();
    if (session == null) return null;
    if (!isExpired(session)) return session.accessToken;

    const result = await refreshSession(session);
    if (!result.ok) {
      // 세션이 실제로 사라졌을 때만 로그아웃 상태로 내린다 — 일시적 실패로는
      // 세션이 그대로 남아 있으니 다음 호출이 다시 시도한다. `stale` 이면
      // 세션을 바꾼 쪽이 이미 판정했으므로 여기서 덧쓰지 않는다.
      if (result.reason === "evicted") {
        resetAnalytics();
        useAuth.setState({ status: "anonymous" });
      }
      return null;
    }
    return result.session.accessToken;
  } catch {
    return null;
  }
};

export const useAuth = create<AuthStore>((set, get) => ({
  status: "hydrating",
  signingIn: false,
  signInError: null,
  withdrawing: false,
  withdrawError: null,

  hydrate: async () => {
    try {
      const session = await readSession();
      if (session == null) {
        // 없거나 손상이다. 손상이면 갱신할 refresh token 도 못 읽으므로
        // fail-closed 이고, 죽은 값은 지워서 다음 부트가 같은 판정을 반복하지
        // 않게 한다 — 없을 때의 삭제는 아무 일도 하지 않는다.
        await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
        resetAnalytics();
        set({ status: "anonymous" });
        return;
      }
      if (!isExpired(session)) {
        identifyAnalytics(session.userId);
        set({ status: "authenticated" });
        await get().syncMe();
        return;
      }
      // access token 은 죽었지만 refresh token 은 있다 — 로그인 화면부터 다시
      // 보여주기 전에 갱신을 한 번 시도한다. 만료된 토큰으로 보호 라우트에
      // 들어가 첫 401 을 보고서야 튕겨 나오지 않게 하는 자리다(§3-1).
      const result = await refreshSession(session);
      // 부팅 중에 세션이 갈렸다면(로그아웃 등) 판정은 그쪽이 이미 했다 — 덧쓰면
      // 방금 로그아웃한 사람을 다시 들여보내게 된다.
      if (!result.ok && result.reason === "stale") return;
      // 세션이 실제로 죽었을 때(evicted)만 로그인 화면으로 닫는다. 일시적
      // 실패(네트워크 등)는 여기서 재로그인을 강제하지 않는다 — 세션은 남아
      // 있으니 authenticated 로 들여보내고, 화면의 첫 API 호출이 다시 시도한다.
      if (!result.ok && result.reason === "evicted") {
        resetAnalytics();
        set({ status: "anonymous" });
        return;
      }
      identifyAnalytics(session.userId);
      set({ status: "authenticated" });
      await get().syncMe();
    } catch {
      // 읽기 오류·복호화 실패 — 판단이 안 서면 로그인 화면이다 (§3-4)
      resetAnalytics();
      set({ status: "anonymous" });
    }
  },

  /**
   * **스플래시가 이걸 기다린다.** `S0` 는 `status !== "hydrating"` 이면 곧장
   * 라우팅하므로, 온보딩 완료 여부를 여기서 받아두지 않으면 온보딩으로 보냈다가
   * 홈으로 튀는 깜빡임이 된다. 그래서 `hydrate` 는 이걸 `await` 하고,
   * `meApi` 의 8초 상한이 그 기다림의 최대치를 정한다.
   *
   * **실패는 조용하다.** `no_session`(갱신이 네트워크로 실패한 경우가 여기 섞인다) ·
   * `network` · `server` · `malformed` 는 **아무것도 덮지 않는다** — 서버에게
   * 못 물어본 것을 「온보딩을 안 했다」로 읽으면 오프라인일 때마다 온보딩이 뜬다.
   * 콜드 스타트에서 실패하면 완료 여부가 `null`(모름)로 남고, `S0` 가 이걸 다시 부른다.
   */
  syncMe: async () => {
    const result = await fetchMe();

    if (result.ok) {
      // 온보딩 완료 여부의 정본은 서버다 — 기기에 남아 있던 판정을 덮는다
      useOnboardingCompletion.setState({ completed: !result.data.onboardingRequired });

      // 온보딩 전에는 프로필이 없다. 없는 것으로 지금 값을 지우지 않는다
      if (result.data.profile != null) adoptProfile(result.data.profile);
      return;
    }

    if (result.code === "unauthorized") {
      // 갱신까지 마친 토큰을 서버가 거부했다 — 이건 일시적 실패가 아니다.
      // 지우기 전에 세션을 읽는다 — 사용자별로 눕는 것을 비우려면 `userId` 가 필요하다
      const session = await readSession();
      await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
      clearUserScopedStores(session?.userId);
      set({ status: "anonymous" });
    }
  },

  signInWithKakao: async () => {
    // 중복 클릭 — 두 번째 누름은 카카오 창을 한 번 더 열지 않는다.
    // 두 요청이 겹치면 나중에 끝난 쪽이 앞선 세션을 덮어쓴다.
    if (get().signingIn) return { kind: "busy" };
    set({ signingIn: true, signInError: null });
    track("login_started", { provider: "kakao" });

    try {
      const sdk = await requestKakaoAccessToken();
      if (sdk.kind === "cancelled") {
        // 사용자의 답이다 — 안내 한 줄도 띄우지 않는다
        track("login_not_completed", { provider: "kakao", outcome: "cancelled" });
        return { kind: "cancelled" };
      }
      if (sdk.kind === "failed") {
        const message = FAILURE_MESSAGES.sdk;
        set({ signInError: message });
        track("login_not_completed", { provider: "kakao", outcome: "failed" });
        return { kind: "failed", message };
      }

      const exchanged = await exchangeKakaoToken(sdk.accessToken);
      if (!exchanged.ok) {
        const message = FAILURE_MESSAGES[exchanged.code];
        set({ signInError: message });
        track("login_not_completed", { provider: "kakao", outcome: "failed" });
        return { kind: "failed", message };
      }

      // 저장·플래그·배웅은 공급자를 묻지 않는다 — 애플과 같은 코드를 지난다
      return await adoptSession(set, get, exchanged.session, "kakao");
    } finally {
      set({ signingIn: false });
    }
  },

  /**
   * 애플 로그인 (2026-08-24 SDK · **교환 연결 2026-08-24**). 카카오와 **같은
   * 순서, 같은 코드**다 — 애플 SDK → 서버 교환 → SecureStore.
   *
   * ## 비어 있던 가운데 칸이 찼다
   *
   * `POST /api/v1/auth/apple` 이 계약에 들어오면서(`DISCUSSION.md` §1-10 · BE
   * `AppleLoginController`) 「인가됐다」와 「로그인됐다」 사이의 틈이 닫혔다.
   * 서버가 **응답을 카카오와 글자 그대로 같게** 냈으므로, 교환 뒤의 일은
   * `adoptSession` 하나를 카카오와 나눠 쓴다.
   *
   * ⚠ **보내는 것은 identity token 과 nonce 원문 둘뿐이다.** 서버가 이름·이메일을
   * 요청 본문이 아니라 **토큰 안의 클레임**에서 읽는다(`appleAuthApi.ts` 머리말) —
   * 그래서 「애플이 이름을 첫 인가에만 준다」가 더 이상 로그인을 막지 않고,
   * 릴리스에서 애플 줄을 잠가 두었던 이유도 함께 사라졌다(`login.tsx`).
   *
   * `appleSdk.ts` 는 `authorizationCode`·`fullName`·`email` 을 계속 꺼내 온다 —
   * **지금은 아무도 쓰지 않는다.** 경계를 좁히지 않은 것은 서버가 요구하게 되는
   * 날 SDK 경계를 다시 열지 않으려는 것이고, 쓰지 않는 값은 **여기서 버린다**
   * (기기에도 로그에도 남기지 않는다 · `docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
   *
   * ## 지키는 것 — 카카오와 같다
   *
   * - **취소는 조용하다**
   * - **실패는 한 줄이다** — 모달·재시도 버튼 없음(`RULES.md` 4)
   * - **자물쇠는 하나다** — `signingIn` 을 카카오와 나눠 쓴다. 두 줄을 번갈아
   *   눌러도 시트는 한 번만 열린다
   * - **어느 단계에서 멈춰도 `authenticated` 가 되지 않는다**
   */
  signInWithApple: async () => {
    // 중복 클릭 — 카카오와 같은 자물쇠다. 애플 시트는 한 번에 하나만 열린다
    if (get().signingIn) return { kind: "busy" };
    set({ signingIn: true, signInError: null });
    track("login_started", { provider: "apple" });

    try {
      const sdk = await requestAppleCredential();

      // 사용자의 답이다 — 안내 한 줄도 띄우지 않는다
      if (sdk.kind === "cancelled") {
        track("login_not_completed", { provider: "apple", outcome: "cancelled" });
        return { kind: "cancelled" };
      }

      if (sdk.kind !== "credential") {
        const message =
          sdk.kind === "unavailable"
            ? APPLE_FAILURE_MESSAGES.unavailable
            : APPLE_FAILURE_MESSAGES.sdk;
        set({ signInError: message });
        track("login_not_completed", { provider: "apple", outcome: "failed" });
        return { kind: "failed", message };
      }

      const exchanged = await exchangeAppleIdentityToken(
        sdk.credential.identityToken,
        // nonce 원문 — 토큰과 **같은 인가에서** 나온 짝이어야 서버가 받아들인다
        sdk.credential.nonce,
        // 탈퇴 때 애플 연결을 끊을 refresh token 으로 서버가 바꿔 둔다
        sdk.credential.authorizationCode,
      );
      if (!exchanged.ok) {
        const message = APPLE_FAILURE_MESSAGES[exchanged.code];
        set({ signInError: message });
        track("login_not_completed", { provider: "apple", outcome: "failed" });
        return { kind: "failed", message };
      }

      // 저장·플래그·배웅은 공급자를 묻지 않는다 — 카카오와 같은 코드를 지난다
      return await adoptSession(set, get, exchanged.session, "apple");
    } finally {
      set({ signingIn: false });
    }
  },

  /**
   * 구글 로그인. 카카오·애플과 **같은 순서, 같은 코드**다 —
   * SDK → 서버 교환 → SecureStore.
   *
   * ## 애플 갈래와 한 줄만 다르다
   *
   * 서버로 보내는 것이 **ID token 하나뿐**이다 — nonce 가 없다. SDK 에 그것을
   * 넘길 자리가 없어서이고(`googleSdk.ts` 머리말), 그래서 「토큰과 nonce 는 같은
   * 인가에서 나온 짝이어야 한다」는 애플 쪽 규약이 여기에는 없다.
   *
   * ## 지키는 것 — 카카오·애플과 같다
   *
   * - **취소는 조용하다**
   * - **실패는 한 줄이다** — 모달·재시도 버튼 없음(`RULES.md` 4)
   * - **자물쇠는 하나다** — `signingIn` 을 셋이 나눠 쓴다. 세 줄을 번갈아
   *   눌러도 시트는 한 번만 열린다
   * - **어느 단계에서 멈춰도 `authenticated` 가 되지 않는다**
   */
  signInWithGoogle: async () => {
    if (get().signingIn) return { kind: "busy" };
    set({ signingIn: true, signInError: null });
    track("login_started", { provider: "google" });

    try {
      const sdk = await requestGoogleIdToken();

      // 사용자의 답이다 — 안내 한 줄도 띄우지 않는다
      if (sdk.kind === "cancelled") {
        track("login_not_completed", { provider: "google", outcome: "cancelled" });
        return { kind: "cancelled" };
      }

      if (sdk.kind !== "id-token") {
        const message =
          sdk.kind === "unavailable"
            ? GOOGLE_FAILURE_MESSAGES.unavailable
            : sdk.kind === "unconfigured"
              ? GOOGLE_FAILURE_MESSAGES.misconfigured
              : GOOGLE_FAILURE_MESSAGES.sdk;
        set({ signInError: message });
        track("login_not_completed", { provider: "google", outcome: "failed" });
        return { kind: "failed", message };
      }

      const exchanged = await exchangeGoogleIdToken(sdk.idToken);
      if (!exchanged.ok) {
        const message = GOOGLE_FAILURE_MESSAGES[exchanged.code];
        set({ signInError: message });
        track("login_not_completed", { provider: "google", outcome: "failed" });
        return { kind: "failed", message };
      }

      // 저장·플래그·배웅은 공급자를 묻지 않는다 — 카카오·애플과 같은 코드를 지난다
      return await adoptSession(set, get, exchanged.session, "google");
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
    identifyAnalytics(session.userId);
    set({ status: "authenticated" });
  },

  signOut: async () => {
    const record = captureAnalytics();
    // 지우기 전에 refresh token 을 든다 — 폐기 요청이 가리킬 것이 이것뿐이다
    const session = await readSession();

    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    if (session != null) record("logout_completed", {});
    clearUserScopedStores(session?.userId);
    set({ status: "anonymous", signInError: null });

    // 배웅 — **기다리지 않고 결과를 보지 않는다.** 이 기기에는 이미 세션이
    // 없으므로 폐기가 실패해도 사용자는 로그아웃 상태다. 기다리면 서버가
    // 느린 만큼(최대 10초) 마이 화면이 아무 반응 없이 서 있게 되는데,
    // `SettingRow` 에는 진행 중을 보일 자리가 없고 화면도 `void signOut()` 로
    // 기다릴 준비가 안 돼 있다. **로그아웃은 실패할 수 없는 동작으로 둔다.**
    if (session != null) {
      void revokeRefreshToken(session.refreshToken).then((result) => {
        if (!result.ok) warnInDev(result.code);
      });
    }

    // 구글 SDK 가 기기에 남긴 로그인 상태도 비운다 — **연결을 끊는 것이 아니다.**
    // 이것이 없으면 다음에 Google 줄을 눌렀을 때 계정 선택 없이 직전 계정으로
    // 바로 들어가서, 계정을 바꾸려는 사용자가 바꿀 수 없다.
    //
    // 구글로 로그인한 적이 없어도 부른다 — SDK 가 조용히 넘어가고, 어느
    // 공급자로 들어왔는지는 기기에 남겨 두지 않기 때문이다(세션에 provider 가 없다).
    // 카카오·애플에는 대응하는 자리가 없다: 둘 다 기기에 로그인 상태를 남기지 않는다.
    void signOutGoogle();
  },

  clearWithdrawError: () => set({ withdrawError: null }),

  withdraw: async () => {
    // 중복 실행 방지 — 확인 버튼을 두 번 눌러도 요청은 한 번이다
    if (get().withdrawing) return false;
    set({ withdrawing: true, withdrawError: null });
    const record = captureAnalytics();
    record("withdrawal_submitted", {});

    try {
      // **로그아웃과 다르게 기다린다.** 서버가 카카오 연결부터 끊는데 그게 실패하면
      // 계정이 남는다 — 성공을 확인하기 전에 기기를 비우면 「탈퇴됐다」고 보여주고도
      // 계정이 살아 있는 상태가 된다(다음 로그인에 되살아난다).
      const result = await deleteAccount();
      if (!result.ok) {
        record("withdrawal_failed", {});
        set({ withdrawError: WITHDRAW_FAILURE_MESSAGES[result.code] });
        return false;
      }

      // 구글 연결 해제는 **서버가 할 수 없다** — 우리가 받는 것은 ID token 하나뿐이고
      // 보관하지 않아서, 끊을 수 있는 쪽은 access token 을 든 이 기기뿐이다
      // (`googleSdk.ts`). 카카오·애플은 서버가 이미 끊었다(`UserWithdrawalService`).
      //
      // **기다리되 실패를 무시한다.** 서버가 계정을 지운 뒤라 여기서 되돌리면
      // 「탈퇴됐다는데 계정이 남아 있다」가 된다 — 남는 것은 구글 계정 설정의
      // 항목 하나이고 사용자가 직접 지울 수 있다.
      record("withdrawal_completed", {});
      await revokeGoogleAccess();

      // 서버가 계정을 지웠다 — 이제 기기의 흔적을 지운다. 지우기 전에 세션을 읽어
      // `userId` 를 든다(사용자별로 눕는 것을 비우는 데 필요하다).
      const session = await readSession();
      await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
      clearUserScopedStores(session?.userId);

      // 라우트 가드가 이 전이를 보고 로그인으로 돌려보낸다 — 화면이 직접 옮기지 않는다
      set({ status: "anonymous", signInError: null });
      return true;
    } finally {
      set({ withdrawing: false });
    }
  },
}));
