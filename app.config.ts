import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * 시크릿은 여기 적지 않는다 — env 에서 읽는다 (`.env.example` 참조).
 * 값이 필요한 곳은 `extra` 를 거쳐 `expo-constants` 로 읽는다.
 */
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
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
    kakaoAppKey: process.env.EXPO_PUBLIC_KAKAO_APP_KEY ?? "",
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  },
});
