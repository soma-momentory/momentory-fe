import { login as kakaoLogin } from "@react-native-seoul/kakao-login";

/**
 * 카카오 네이티브 SDK 경계 — **네이티브를 부르는 곳은 여기 하나다.**
 *
 * SDK 가 주는 것은 카카오 토큰이고, 우리가 원하는 것은 **모멘토리 세션**이다.
 * 둘을 한 함수에서 다루면 「카카오는 됐는데 서버가 거절했다」를 구분할 수 없다 —
 * 그래서 여기서는 카카오 access token 만 꺼내고, 서버 교환은 `kakaoAuthApi.ts` 가 한다.
 *
 * **카카오 토큰은 앱 세션이 아니다.** 이 값은 서버로 한 번 보내고 버린다 —
 * SecureStore 에 넣지 않는다(`auth.ts` 주석 · `docs/ARCHITECTURE.md §3`).
 *
 * ⚠ **취소는 메시지로만 알 수 있다.** 라이브러리는 성공 외 모든 경우를 같은
 * 코드(`RNKakaoLogins`)로 reject 하고, 사유는 문구에만 담긴다 —
 * iOS `ClientFailed(Cancelled): …` · Android 카카오 SDK 의 취소 메시지.
 * 그래서 `/cancel/i` 로 가른다. 이 휴리스틱이 틀리면 「취소」가 「실패」로
 * 읽혀 안내 한 줄이 뜰 뿐이고, 로그인 상태에는 영향이 없다.
 */
export type KakaoSdkResult =
  /** 카카오가 발급한 access token. 서버로 보내는 즉시 잊는다 */
  | { kind: "token"; accessToken: string }
  /** 사용자가 스스로 닫았다 — **오류가 아니다.** 아무 말도 하지 않는다 */
  | { kind: "cancelled" }
  /** 카카오톡 미설치·네트워크·SDK 초기화 실패 등 */
  | { kind: "failed" };

const CANCELLED = /cancel/i;

/**
 * **개발 빌드에서만** 실패 사유를 남긴다. 릴리스에서는 아무것도 하지 않는다.
 *
 * 사용자에게는 한 줄 안내만 보이므로(`RULES.md` 4), 이 줄이 없으면 「로그인을
 * 마치지 못했어요」가 키 해시 미등록인지·콘솔 설정인지·네트워크인지 구분할 방법이
 * 없다 — 실제로 2026-08-07 실기기 검증에서 여기서 막혔다.
 *
 * **남기는 것은 라이브러리의 오류 메시지뿐이다** — 토큰은 이 경로에 오지 않는다
 * (`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 */
const warnInDev = (reason: string) => {
  if (__DEV__) console.warn("[kakao] 로그인 실패:", reason);
};

const messageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message?: unknown };
    return typeof message === "string" ? message : "";
  }
  return typeof error === "string" ? error : "";
};

/**
 * 카카오 로그인 창을 열고 access token 을 받아온다.
 *
 * **던지지 않는다** — 호출부가 try/catch 로 사유를 다시 분류하면 분류 규칙이
 * 두 곳에 생긴다. 결과는 항상 위 세 갈래 중 하나다.
 */
export async function requestKakaoAccessToken(): Promise<KakaoSdkResult> {
  try {
    const token = await kakaoLogin();
    const accessToken = typeof token?.accessToken === "string" ? token.accessToken.trim() : "";
    // 토큰 없이 resolve 되는 경로가 실제로 있었다(라이브러리 주석 참조) — 성공으로 세지 않는다
    if (!accessToken) {
      warnInDev("토큰 없이 resolve 됨");
      return { kind: "failed" };
    }
    return { kind: "token", accessToken };
  } catch (error) {
    const message = messageOf(error);
    warnInDev(message);
    return CANCELLED.test(message) ? { kind: "cancelled" } : { kind: "failed" };
  }
}
