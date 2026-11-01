import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Local-only web host. The production app keeps its own app.config.ts and entry point.
 *
 * `extra` 는 프레임(iframe 안의 실제 앱)이 `src/lib/config.ts` 로 읽는 값이다 — 앱의 `.env` 를
 * 읽지 않는다. 서버 주소는 가짜 서버가 받는 주소이고, 클라이언트 ID 는 로그인 심이 「설정됨」으로
 * 지나가게 하는 자리 표시일 뿐 실제 값이 아니다(`src/frame/shims/google-signin.ts`).
 *
 * 설정 로더가 TS 파일을 한 장씩 읽어 `./src/lab-contract` 를 import 하지 못한다 — 주소를 옮겨 적고,
 * `src/frame/__tests__/appConfig.test.ts` 가 두 값이 같은지 지킨다.
 */
const LAB_API_BASE_URL = "https://lab.momentory.invalid";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Momentory Design Lab",
  slug: "momentory-expo-lab",
  // 앱과 같은 딥링크 스킴 — expo-linking 이 웹에서도 스킴이 있는지 본다
  scheme: "momentory",
  web: { bundler: "metro" },
  extra: {
    ...config.extra,
    apiBaseUrl: LAB_API_BASE_URL,
    kakaoAppKey: "lab-kakao-app-key",
    googleWebClientId: "lab-google-web-client",
    googleIosClientId: "lab-google-ios-client",
  },
});
