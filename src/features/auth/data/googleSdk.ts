import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { getGoogleIosClientId, getGoogleWebClientId } from "@/lib/config";

/**
 * 구글 네이티브 SDK 경계 — **네이티브를 부르는 곳은 여기 하나다.**
 * `kakaoSdk.ts`·`appleSdk.ts` 와 같은 자리이고 같은 규칙을 따른다.
 *
 * SDK 가 주는 것은 **구글이 서명한 ID token** 이고, 우리가 원하는 것은
 * **모멘토리 세션**이다. 둘을 한 함수에서 다루면 「구글은 됐는데 서버가
 * 거절했다」를 구분할 수 없다 — 그래서 여기서는 토큰만 꺼낸다.
 * 서버 교환은 [`googleAuthApi.ts`](./googleAuthApi.ts) 가 한다
 * (`POST /api/v1/auth/google`).
 *
 * **구글 토큰은 앱 세션이 아니다.** 서버로 한 번 보내고 버릴 값이라
 * SecureStore 에 넣지 않는다 — 카카오·애플 토큰과 같은 규칙이다(`ARCHITECTURE §3`).
 *
 * ## ⚠ nonce 를 보내지 않는다 — 애플과 다른 점이다
 *
 * 애플 쪽은 nonce 원문과 해시를 짝지어 재생을 막지만
 * (`appleSdk.ts`), 여기에는 그 자리가 없다: 이 라이브러리의 **무료 모듈에
 * nonce 를 넘길 인자가 아예 없다**(v16 기준 · `SignInParams` 는 `loginHint`
 * 하나뿐이고, nonce 는 유료 Universal 모듈에만 있다). 없는 것을 있는 척
 * 보내면 서버가 대조할 수 없는 값이 되므로 보내지 않는다.
 *
 * 그 자리를 **서버의 `azp` 검사**가 메운다 — 구글은 토큰을 실제로 요청한
 * 클라이언트를 그 클레임에 적고, 서버가 그것이 우리 것인지 본다
 * (BE `GoogleIdTokenVerifier` 머리말). **nonce 만큼은 아니다**: 요청을 통째로
 * 가로챈 상대는 여전히 막지 못하고, 그 창을 닫는 것은 HTTPS 다.
 *
 * ## 「이 기기에서 되는가」를 여기서 흡수한다
 *
 * 구글 로그인은 **두 플랫폼 모두** 있지만, Android 에서는 Google Play 서비스가
 * 있어야 한다(중국향 기기·일부 커스텀 ROM 에는 없다). 그 판정은 전부 이
 * 파일에 있다 — 화면은 플랫폼도 Play 서비스도 묻지 않는다(`appleSdk.ts` 와
 * 같은 규칙).
 */
export type GoogleSdkResult =
  /** 구글이 서명한 ID token. 서버로 보내는 즉시 잊는다 */
  | { kind: "id-token"; idToken: string }
  /** 사용자가 스스로 닫았다 — **오류가 아니다.** 아무 말도 하지 않는다 */
  | { kind: "cancelled" }
  /** 이 기기에 Google Play 서비스가 없다 — 다시 눌러도 같다 */
  | { kind: "unavailable" }
  /** 클라이언트 ID 가 비었다 — **우리 설정 오류다.** 사용자가 할 수 있는 일이 없다 */
  | { kind: "unconfigured" }
  /** 네트워크 · 기기의 구글 계정 문제 · 인가 거부 등 */
  | { kind: "failed" };

/**
 * **개발 빌드에서만** 사유를 남긴다 — `kakaoSdk.ts`·`appleSdk.ts` 와 같은 이유다.
 * 사용자에게는 한 줄 안내만 보이므로(`RULES.md` 4), 이 줄이 없으면
 * 「로그인을 마치지 못했어요」가 SHA-1 미등록인지 · 웹 클라이언트 ID 누락인지 ·
 * 네트워크인지 구분할 방법이 없다.
 *
 * **남기는 것은 오류 코드·메시지뿐이다** — ID token 은 이 경로에 오지 않는다
 * (`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 */
const warnInDev = (reason: string) => {
  if (__DEV__) console.warn("[google] 로그인 실패:", reason);
};

const messageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
};

const trimmed = (value: string | null | undefined): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * SDK 에 클라이언트 ID 를 알린다. **매번 불러도 된다** — `configure` 는 값을
 * 덮어쓸 뿐이고, 라이브러리가 그 결과를 내부 promise 로 들고 있다가
 * `signIn()` 이 기다린다.
 *
 * ⚠ **`webClientId` 가 두 플랫폼 모두에서 필요하다.** Android 는 이 값이
 * `serverClientId` 로 가서 **ID token 의 `aud`** 가 되고(없으면 토큰을 아예 받지
 * 못한다), iOS 는 `iosClientId` 로 로그인하지만 서버가 두 값을 모두 받아들이므로
 * 어느 쪽이 와도 통과한다(BE `google.auth.allowed-audiences`).
 *
 * `offlineAccess` 는 켜지 않는다 — 그것은 서버가 사용자를 대신해 구글 API 를
 * 부를 때 쓰는 authorization code 를 받는 설정이고, 우리는 **신원 확인만** 한다.
 */
const configure = (): boolean => {
  const webClientId = getGoogleWebClientId();
  if (!webClientId) {
    warnInDev("웹 클라이언트 ID 가 비어 있다 (.env EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)");
    return false;
  }

  GoogleSignin.configure({
    webClientId,
    // iOS 에서만 쓰인다. 비어 있으면 넘기지 않는다 — 빈 문자열을 주면
    // SDK 가 그것을 클라이언트 ID 로 알아들으려 한다
    ...(getGoogleIosClientId() ? { iosClientId: getGoogleIosClientId() } : {}),
    scopes: ["email", "profile"],
  });
  return true;
};

/**
 * 구글 로그인 시트를 열고 ID token 을 받아온다.
 *
 * **던지지 않는다** — 호출부가 try/catch 로 사유를 다시 분류하면 분류 규칙이
 * 두 곳에 생긴다. 결과는 항상 위 다섯 갈래 중 하나다(`appleSdk.ts` 와 같은 규약).
 *
 * **취소는 코드로 알 수 있다** — 애플과 같고 카카오와 다르다. 이 라이브러리는
 * 취소를 예외가 아니라 `{ type: "cancelled" }` 응답으로 돌려주므로 문구
 * 휴리스틱이 필요 없다.
 */
export async function requestGoogleIdToken(): Promise<GoogleSdkResult> {
  if (!configure()) return { kind: "unconfigured" };

  try {
    // Android 전용 확인 — iOS 에서는 라이브러리가 항상 true 로 닫는다.
    // 없으면 여기서 던지므로 아래 catch 가 사유를 가른다
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    // 사용자의 답이다 — 오류가 아니다
    if (response.type === "cancelled") return { kind: "cancelled" };

    const idToken = trimmed(response.data.idToken);
    if (!idToken) {
      // 거의 항상 **웹 클라이언트 ID 문제**다 — 로그인은 됐는데 서버에 낼 것이
      // 없는 상태라, 여기서 닫지 않으면 빈 토큰이 400 으로 돌아온다
      warnInDev("ID token 이 비어 있다 — 웹 클라이언트 ID 를 확인한다");
      return { kind: "failed" };
    }

    return { kind: "id-token", idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return { kind: "cancelled" };
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { kind: "unavailable" };
      // 시트가 이미 열려 있다 — 자물쇠(`auth.ts` 의 signingIn)가 놓친 경우다.
      // 사용자에게는 아무 말도 하지 않는다: 열려 있는 시트가 곧 안내다
      if (error.code === statusCodes.IN_PROGRESS) return { kind: "cancelled" };
      warnInDev(error.code);
      return { kind: "failed" };
    }
    warnInDev(messageOf(error));
    return { kind: "failed" };
  }
}

/**
 * 기기에 남은 구글 로그인 상태를 지운다 — **연결을 끊지는 않는다.**
 *
 * 이것을 하지 않으면 다음 로그인에서 계정 선택 화면 없이 **직전 계정으로
 * 바로 들어간다.** 계정을 바꾸려는 사용자가 바꿀 수 없게 되므로, 모멘토리에서
 * 로그아웃할 때 함께 지운다.
 *
 * **던지지 않는다.** 실패해도 모멘토리 로그아웃은 이미 끝났다 —
 * 「로그아웃은 실패할 수 없는 동작으로 둔다」(`auth.ts` signOut).
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    warnInDev(messageOf(error));
  }
}

/**
 * 구글 계정의 「연결된 앱」에서 모멘토리를 지운다 — **탈퇴 때만** 부른다.
 *
 * ⚠ **서버가 대신 해 줄 수 없는 일이다.** 카카오·애플은 서버가 공급자에게
 * 연결 해제를 알리지만(`UserWithdrawalService`), 구글은 그럴 재료가 서버에
 * 없다 — 우리가 받는 것은 ID token 하나뿐이고 그것은 보관하지 않는다.
 * 끊을 수 있는 쪽은 access token 을 들고 있는 **이 기기**뿐이다.
 *
 * **던지지 않고, 실패해도 탈퇴를 막지 않는다.** 서버는 이미 계정을 지웠고,
 * 여기서 실패로 되돌리면 「탈퇴됐다는데 계정이 남아 있다」가 된다 —
 * 그쪽이 훨씬 나쁘다. 남는 것은 구글 계정 설정의 항목 하나이고, 사용자가
 * 직접 지울 수 있다.
 */
export async function revokeGoogleAccess(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess();
  } catch (error) {
    warnInDev(messageOf(error));
  }
}
