import Constants from "expo-constants";

/**
 * 런타임 설정의 단일 공급자 — **서버 주소·앱 키는 이 파일 밖에 적지 않는다.**
 *
 * `app.config.ts` 가 `.env` 를 읽어 `extra` 에 담고, 여기서 한 번 꺼낸다.
 * 화면도 repository 도 주소를 모른다 — 그래서 HTTPS 전환·서버 이전이
 * **`.env` 한 줄**로 끝난다(`docs/SETUP.md` 「API 서버」).
 *
 * `expo-constants` 가 비는 자리가 있다 — 테스트 환경, `extra` 없이 만들어진
 * 매니페스트. 그래서 Metro 가 인라인해 주는 `process.env.EXPO_PUBLIC_*` 를
 * 2차 공급자로 둔다. 둘 다 없으면 **빈 문자열**이고, 호출부는 그것을
 * 「설정되지 않음」으로 읽어 닫는다 — 기본 주소를 지어내지 않는다.
 */
type Extra = {
  apiBaseUrl?: unknown;
  kakaoAppKey?: unknown;
  googleIosClientId?: unknown;
  googleWebClientId?: unknown;
};

const readExtra = (): Extra => (Constants.expoConfig?.extra ?? {}) as Extra;

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** 끝의 `/` 를 지운다 — 경로와 이어 붙일 때 `//` 가 생기지 않게 */
const trimTrailingSlash = (url: string) => url.replace(/\/+$/, "");

/**
 * API 서버 주소. **호출 시점에 읽는다** — 모듈 로드 순서에 기대지 않고,
 * 테스트가 `extra` 를 갈아끼울 수 있게 한다.
 */
export const getApiBaseUrl = (): string =>
  trimTrailingSlash(
    asString(readExtra().apiBaseUrl) || asString(process.env.EXPO_PUBLIC_API_BASE_URL),
  );

/**
 * 카카오 네이티브 앱 키.
 *
 * ⚠ **로그인 호출에는 필요 없다** — 키는 빌드 때 네이티브(매니페스트·Info.plist)에
 * 박히고 SDK 가 거기서 읽는다. 이 값은 「설정이 됐는가」를 확인하는 용도이며,
 * **로그로 찍지 않는다**(`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 */
export const getKakaoAppKey = (): string =>
  asString(readExtra().kakaoAppKey) || asString(process.env.EXPO_PUBLIC_KAKAO_APP_KEY);

/**
 * 구글 OAuth 클라이언트 ID 둘. **카카오 키와 달리 런타임에 실제로 쓰인다** —
 * SDK 를 `configure()` 할 때 넘겨야 하는 값이라 빌드 때 네이티브에 박히지 않는다
 * (`googleSdk.ts`).
 *
 * ⚠ **웹 클라이언트 ID 가 안드로이드에서 결정적이다.** 그것이 `serverClientId`
 * 로 구글에 가고, 서버가 검증할 ID token 의 `aud` 가 된다 — 비면 Android 는
 * ID token 을 **아예 받지 못한다**(로그인 시트는 뜬다).
 *
 * 둘 다 **공개 식별자**다(앱 바이너리에 그대로 있다). 그래도 로그로 찍지 않는 것은
 * 카카오 키와 같은 습관이다(`docs/CONTRIBUTING.md` 「값을 다루는 세 등급」).
 */
export const getGoogleWebClientId = (): string =>
  asString(readExtra().googleWebClientId) || asString(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

export const getGoogleIosClientId = (): string =>
  asString(readExtra().googleIosClientId) || asString(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
