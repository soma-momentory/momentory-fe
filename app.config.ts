import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * 시크릿은 여기 적지 않는다 — env 에서 읽는다 (`.env.example` 참조).
 * 값이 필요한 곳은 `extra` 를 거쳐 `expo-constants` 로 읽는다.
 */
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const kakaoAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY ?? "";

/**
 * API 서버가 **평문 HTTP** 일 때의 호스트. HTTPS·미설정이면 빈 문자열이다.
 *
 * 주소는 여기 한 곳에서만 읽는다 — 화면·repository 어디에도 IP 를 적지 않는다.
 * 평문 예외를 여는 유일한 조건이 이 값이므로, `.env` 가 `https://` 로 바뀌면
 * `withInsecureDevApi` 는 매니페스트·Info.plist 를 건드리지 않는다.
 */
const cleartextHostOf = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" ? parsed.hostname : "";
  } catch {
    return ""; // 비어 있거나 형식이 아니면 예외를 열 이유가 없다
  }
};

const insecureApiHost = cleartextHostOf(apiBaseUrl);

/** `plugins` 배열의 한 칸 — 조건부로 넣고 뺄 때 타입을 잃지 않게 이름을 준다 */
type PluginEntry = NonNullable<ExpoConfig["plugins"]>[number];

/**
 * 카카오 로그인 (M2-1). 네이티브 앱 키가 매니페스트·Info.plist 의 URL 스킴
 * (`kakao<앱키>`)까지 들어가므로 **키 없이 붙이면 스킴이 깨진다** — 그래서
 * `.env` 가 비면 플러그인을 통째로 뺀다(빌드는 되고 로그인만 안 된다).
 */
const kakaoPlugin: PluginEntry[] = kakaoAppKey
  ? [["@react-native-seoul/kakao-login", { kakaoAppKey }]]
  : [];

/**
 * 개발 서버가 평문 HTTP 인 동안만 그 호스트 하나에 예외를 연다.
 * HTTPS 로 바뀌면 `insecureApiHost` 가 비어 이 칸이 사라진다.
 */
const insecureApiPlugin: PluginEntry[] = insecureApiHost
  ? [["./plugins/withInsecureDevApi", { host: insecureApiHost }]]
  : [];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "모멘토리",
  slug: "momentory",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "momentory", // 회고 알림 → 딥링크
  icon: "./assets/icon.png",

  // 다크모드에서도 크림 배경을 유지한다 — 쉼터 톤이 앱의 정체성이라 반전하지 않는다.
  // (09_MVP/docs/S0.md · 01_화면설계/1. SPLASH/docs/RULES.md)
  userInterfaceStyle: "light",

  // 앱 식별자 — 2026-08-05 확정. 카카오·구글·애플과 스토어에 이 값으로 등록한다.
  // 등록 뒤에는 바꿀 수 없다(스토어는 같은 ID 를 재사용할 수 없다).
  // 등록 절차와 키 해시·SHA-1 은 docs/SETUP.md 「앱 식별자와 외부 등록」 참조.
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.momentory.app",
  },
  android: {
    package: "com.momentory.app",
    adaptiveIcon: {
      backgroundColor: "#F2E9DA",
      foregroundImage: "./assets/android-icon-foreground.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },

  // ⚠ 플러그인의 유일한 출처. `npx expo install` 이 app.json 을 만들어 여기 목록을
  // 덮이게 두지 않는다 — app.json 은 지웠고, 새 플러그인은 이 배열에 직접 추가한다.
  plugins: [
    "expo-router",
    "expo-status-bar",
    // 08 회고 시간 — OS 시간 피커. 커스텀 휠을 만들지 않는다 (08.md)
    "@react-native-community/datetimepicker",
    // M2-0 인증 부트스트랩 — 세션 토큰 저장 (ARCHITECTURE §3)
    "expo-secure-store",
    // 회고 시간 알림(08 · M3) — 전부 로컬 알림이다. 푸시 토큰도 서버도 없다.
    // Android 상태바 아이콘은 **알파만 쓴다**(모양만 남고 색은 tint 로 칠해진다) —
    // 단색 실루엣인 모노크롬 아이콘이 그대로 맞는다. 색은 primary.
    [
      "expo-notifications",
      {
        icon: "./assets/android-icon-monochrome.png",
        color: "#C2703D",
      },
    ],
    // 카카오 SDK 는 Maven Central 에 없다 — 카카오 저장소를 Gradle 에 알린다.
    // (`@react-native-seoul/kakao-login` README 「EXPO」)
    [
      "expo-build-properties",
      {
        android: {
          extraMavenRepos: ["https://devrepo.kakao.com/nexus/content/groups/public/"],
        },
      },
    ],
    ...kakaoPlugin,
    ...insecureApiPlugin,
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#F2E9DA", // palette.bgMid — 시안 배경의 단색 폴백
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./assets/fonts/Pretendard-Regular.otf",
          "./assets/fonts/Pretendard-Medium.otf",
          "./assets/fonts/Pretendard-SemiBold.otf",
          "./assets/fonts/Pretendard-Bold.otf",
        ],
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    apiBaseUrl,
    kakaoAppKey,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  },
});
