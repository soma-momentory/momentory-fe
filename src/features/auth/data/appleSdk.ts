import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

/**
 * 애플 네이티브 SDK 경계 — **네이티브를 부르는 곳은 여기 하나다.**
 * `kakaoSdk.ts` 와 같은 자리이고 같은 규칙을 따른다.
 *
 * SDK 가 주는 것은 **애플이 서명한 identity token** 이고, 우리가 원하는 것은
 * **모멘토리 세션**이다. 둘을 한 함수에서 다루면 「애플은 됐는데 서버가
 * 거절했다」를 구분할 수 없다 — 그래서 여기서는 credential 만 꺼낸다.
 *
 * 서버 교환은 [`appleAuthApi.ts`](./appleAuthApi.ts) 가 한다 (2026-08-24 ·
 * `POST /api/v1/auth/apple`) — 카카오의 `kakaoAuthApi.ts` 와 같은 자리다.
 * **이 파일은 그 어댑터가 생기면서 한 줄도 바뀌지 않았다**: 경계를 credential
 * 에서 끊어 두었기 때문이고, 그것이 「애플은 됐는데 서버가 거절했다」를
 * 구분할 수 있는 이유다.
 *
 * **애플 토큰은 앱 세션이 아니다.** 서버로 한 번 보내고 버릴 값이라
 * SecureStore 에 넣지 않는다 — 카카오 토큰과 같은 규칙이다(`ARCHITECTURE §3`).
 *
 * ⚠ **지금 서버로 가는 것은 `identityToken` 하나뿐이다.** 나머지 셋
 * (`authorizationCode`·`fullName`·`email`)은 꺼내 오기만 하고 아무도 쓰지 않는다 —
 * 서버가 이름·이메일을 토큰 안의 클레임에서 읽기 때문이다(`appleAuthApi.ts`).
 * 그래도 계속 꺼내는 것은, 서버가 요구하게 되는 날 **이 경계를 다시 열지
 * 않으려는 것**이다.
 *
 * ## iOS 전용이라는 사실을 여기서 흡수한다
 *
 * 네이티브 Sign in with Apple 은 iOS 에만 있다. Android 와 옛 iOS 에서는
 * 네이티브 모듈 자체가 없어 `isAvailableAsync()` 가 `false` 를 준다 —
 * 라이브러리가 그 경우 가짜 모듈로 대신한다(`ExpoAppleAuthentication.js`).
 *
 * **화면은 플랫폼을 묻지 않는다.** 로그인 화면에 애플 줄은 두 플랫폼 모두
 * 같은 모양으로 있고, 「이 기기에서 되는가」의 판정은 전부 이 파일에 있다 —
 * 화면에 `Platform.OS === "ios"` 를 적기 시작하면 같은 판정이 여러 곳에 생긴다.
 */
export type AppleCredential = {
  /**
   * 애플이 준 사용자 식별자. **같은 개발팀의 앱 사이에서 안정적**이고
   * 재로그인해도 바뀌지 않는다 — 서버가 계정을 잇는 열쇠다.
   */
  userIdentifier: string;
  /**
   * 애플이 서명한 JWT. **서버가 검증할 값이 이것이다** — `aud` 가
   * `kr.momentory.app` 인지 서버가 본다(`docs/SETUP.md` 「애플 콘솔에서
   * 정확히 무엇을 하는가」 4번).
   */
  identityToken: string;
  /** 서버가 애플에 되물을 때 쓰는 **단기** 코드. 세션마다 바뀐다 */
  authorizationCode: string;
  /**
   * ⚠ **첫 인가에서만 온다.** 두 번째 로그인부터 애플은 `null` 을 준다 —
   * 서버 교환이 붙으면 **그 한 번에 실어 보내야** 이름이 영영 사라지지 않는다.
   *
   * 다만 없어도 막히지 않는다 — 호칭은 온보딩 `04` 가 따로 받는다
   * (`docs/ARCHITECTURE.md` §1 「애플 로그인」).
   */
  fullName: string | null;
  /**
   * 첫 인가에서만 온다. 사용자가 가리기를 고르면 애플 도메인의
   * **가림 주소**(`...@privaterelay.appleid.com`)가 대신 온다 — 형식은
   * 이메일이지만 사람이 읽는 주소가 아니다.
   */
  email: string | null;
  /**
   * 이번 인가에 쓴 nonce 의 **원문**이다 — 서버로 보낸다.
   *
   * 애플에게 준 것은 이 값의 SHA-256 해시이고, 그것이 identity token 의 `nonce`
   * 클레임으로 돌아온다. **원문과 토큰이 함께 있어야** 서버가 둘을 맞춰 볼 수
   * 있다(위 머리말). 세션마다 새로 만든다 — 재사용하면 막으려던 재생이 된다.
   */
  nonce: string;
};

export type AppleSdkResult =
  /** 애플이 인가했다. 서버로 보내는 즉시 잊는다 */
  | { kind: "credential"; credential: AppleCredential }
  /** 사용자가 스스로 닫았다 — **오류가 아니다.** 아무 말도 하지 않는다 */
  | { kind: "cancelled" }
  /** 이 기기에 Sign in with Apple 이 없다 — Android · iOS 12 이하 */
  | { kind: "unavailable" }
  /** 네트워크 · 기기의 애플 계정 문제 · 인가 거부 등 */
  | { kind: "failed" };

/**
 * nonce 원문의 길이(바이트). 32바이트면 추측으로 맞히는 것은 사실상 불가능하고,
 * hex 로 64자라 요청 본문에 실어도 부담이 없다.
 */
const NONCE_BYTES = 32;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * 이번 인가에 쓸 nonce 한 쌍을 만든다 — **애플에는 해시, 서버에는 원문**(머리말).
 *
 * `digestStringAsync` 는 기본이 hex 출력이라 그대로 쓴다. 서버도 hex 로 맞춰
 * 비교한다(BE `AppleIdentityTokenVerifier`) — **인코딩이 갈리면 항상 불일치**라
 * 로그인이 통째로 막히므로, 여기서 정한 것이 계약이다.
 */
const createNonce = async (): Promise<{ raw: string; hashed: string }> => {
  const raw = toHex(await Crypto.getRandomBytesAsync(NONCE_BYTES));
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
};

/**
 * **취소는 코드로 알 수 있다** — 카카오와 다른 점이다.
 *
 * 카카오는 성공 외 전부를 같은 코드로 reject 해서 메시지를 정규식으로 갈랐지만
 * (`kakaoSdk.ts`), 애플 SDK 는 취소에 `ERR_REQUEST_CANCELED` 를 준다.
 * 문구 휴리스틱이 필요 없으므로 쓰지 않는다.
 */
const CANCELLED_CODE = "ERR_REQUEST_CANCELED";

/**
 * **개발 빌드에서만** 사유를 남긴다 — `kakaoSdk.ts` 와 같은 이유다.
 * 사용자에게는 한 줄 안내만 보이므로(`RULES.md` 4), 이 줄이 없으면
 * 「로그인을 마치지 못했어요」가 엔타이틀먼트 누락인지 · 기기의 애플 계정
 * 문제인지 · 네트워크인지 구분할 방법이 없다.
 *
 * **남기는 것은 오류 코드·메시지뿐이다** — identity token 은 이 경로에 오지
 * 않는다(`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 */
const warnInDev = (reason: string) => {
  if (__DEV__) console.warn("[apple] 로그인 실패:", reason);
};

const codeOf = (error: unknown): string => {
  if (typeof error !== "object" || error === null) return "";
  const { code } = error as { code?: unknown };
  return typeof code === "string" ? code : "";
};

const messageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
};

const trimmed = (value: string | null | undefined): string =>
  typeof value === "string" ? value.trim() : "";

/** 비어 있으면 `null` — 「값이 없다」와 「빈 문자열이 왔다」를 구분하지 않는다 */
const optional = (value: string | null | undefined): string | null => trimmed(value) || null;

/**
 * 애플이 준 이름 조각을 한 줄로 잇는다.
 *
 * `formatFullName` 을 쓰지 않는 것은 그것이 **기기 로캘의 표기 규칙**을
 * 따르기 때문이다 — 우리는 사람에게 보여줄 이름이 아니라 서버로 넘길 값 하나가
 * 필요하고, 조각이 통째로 비는 경우(대부분의 재로그인)를 `null` 로 닫아야 한다.
 *
 * 한국어 이름은 성이 앞이지만 애플은 `givenName`·`familyName` 으로만 준다 —
 * 순서를 우리가 정하면 로캘마다 어긋나므로 **애플이 채워 준 순서**(성 → 이름)를
 * 그대로 잇는다. 어차피 화면에 놓지 않는 값이다.
 */
const joinName = (name: AppleAuthentication.AppleAuthenticationFullName | null): string | null => {
  if (name == null) return null;
  const joined = [name.familyName, name.givenName].map(trimmed).filter(Boolean).join(" ");
  return joined || null;
};

/**
 * 이 기기에서 Sign in with Apple 을 쓸 수 있는가.
 *
 * **던지지 않는다** — 라이브러리가 네이티브 모듈이 없을 때 `false` 로 닫지만,
 * 그것까지 믿지 않고 한 겹 더 감싼다. 판단이 안 서면 「쓸 수 없다」다.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    warnInDev(messageOf(error));
    return false;
  }
}

/**
 * 애플 로그인 시트를 열고 credential 을 받아온다.
 *
 * **던지지 않는다** — 호출부가 try/catch 로 사유를 다시 분류하면 분류 규칙이
 * 두 곳에 생긴다. 결과는 항상 위 네 갈래 중 하나다(`kakaoSdk.ts` 와 같은 규약).
 *
 * ✅ **`nonce` 를 보낸다** (2026-08-24 · `DISCUSSION.md` §1-10 「정할 것 넷」3 이
 * 닫혔다). **양쪽을 같은 날 붙였다** — 한쪽만 넣으면 아무도 보지 않는 값이 된다.
 *
 * 규약은 애플 권고대로다: **애플에는 해시를, 서버에는 원문을 준다.**
 *
 * ```
 * raw    = 무작위 32바이트의 hex        → 서버로 (요청 본문의 `nonce`)
 * hashed = SHA-256(raw) 의 hex          → 애플로 (`signInAsync({ nonce })`)
 * ```
 *
 * 애플은 **우리가 준 값을 그대로** identity token 의 `nonce` 클레임에 넣는다.
 * 그래서 서버는 받은 원문을 SHA-256 해서 그 클레임과 맞춰 본다 —
 * **원문을 아는 쪽만 그 토큰을 쓸 수 있다.**
 */
export async function requestAppleCredential(): Promise<AppleSdkResult> {
  if (!(await isAppleSignInAvailable())) return { kind: "unavailable" };

  try {
    // 시트를 열기 전에 만든다 — 실패하면 인가를 시작하지도 않는다.
    // nonce 없이 얻은 credential 은 서버가 어차피 거절한다
    const nonce = await createNonce();

    const credential = await AppleAuthentication.signInAsync({
      // 둘 다 **첫 인가에서만** 온다. 그래도 요청은 해 둔다 — 요청하지 않으면
      // 그 한 번마저 오지 않고, 애플은 두 번째 기회를 주지 않는다
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      // **해시를 준다.** 애플은 이 값을 그대로 토큰의 `nonce` 클레임에 넣고,
      // 서버는 우리가 따로 보낸 원문을 해시해 그것과 맞춰 본다
      nonce: nonce.hashed,
    });

    const identityToken = trimmed(credential.identityToken);
    const authorizationCode = trimmed(credential.authorizationCode);
    const userIdentifier = trimmed(credential.user);

    // 라이브러리가 이미 셋을 확인하고 `ERR_REQUEST_FAILED` 로 던지지만,
    // 그것은 라이브러리의 약속이지 계약이 아니다 — 빈 토큰이 서버로 나가
    // 400 으로 돌아오는 것보다 여기서 닫는 편이 사유가 분명하다
    if (!identityToken || !authorizationCode || !userIdentifier) {
      warnInDev("credential 에 필수 값이 없다");
      return { kind: "failed" };
    }

    return {
      kind: "credential",
      credential: {
        userIdentifier,
        identityToken,
        authorizationCode,
        fullName: joinName(credential.fullName),
        email: optional(credential.email),
        nonce: nonce.raw,
      },
    };
  } catch (error) {
    const code = codeOf(error);
    if (code === CANCELLED_CODE) return { kind: "cancelled" };
    warnInDev(code || messageOf(error));
    return { kind: "failed" };
  }
}
