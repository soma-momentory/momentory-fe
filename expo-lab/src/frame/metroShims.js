// @ts-check
/* global __dirname */
/**
 * 프레임 심의 **이름표** — 어느 모듈 이름을 어느 심 파일로 돌리는가. `expo-lab/metro.config.js` 가
 * 쓰고, 테스트가 같은 판정을 확인한다. Metro 가 Node 로 읽는 파일이라 CommonJS 다.
 *
 * 규칙 둘:
 * - **심 안에서 부르는 같은 이름은 진짜 모듈로 간다** — 심이 진짜를 감싸 되내보낼 수 있게.
 * - `react-native` 는 **루트 `app/`·`src/` 의 파일이 부를 때만** `Platform` 흉내 심으로 간다.
 *   라이브러리는 웹 `Platform` 을 계속 본다(`shims/react-native.ts`).
 */
const path = require("path");

const shimDir = path.join(__dirname, "shims");
const repoRoot = path.resolve(__dirname, "..", "..", "..");

/** 모듈 이름 → 심 파일. 웹 번들에서 어디서 부르든(심 자신 제외) 바뀐다 */
const WEB_SHIMS = {
  "expo-secure-store": "secure-store.ts",
  "expo-location": "location.ts",
  "expo-notifications": "notifications.ts",
  "expo-calendar": "calendar.ts",
  "expo-store-review": "store-review.ts",
  "expo-status-bar": "status-bar.tsx",
  "expo-apple-authentication": "apple-authentication.tsx",
  "expo-speech-recognition": "speech-recognition.ts",
  "@react-native-seoul/kakao-login": "kakao-login.ts",
  "@react-native-google-signin/google-signin": "google-signin.ts",
  "@react-native-async-storage/async-storage": "async-storage.ts",
  "@amplitude/analytics-react-native": "amplitude.ts",
  "react-native-safe-area-context": "safe-area-context.tsx",
};

/** @param {string} file */
const normalize = (file) => path.normalize(file).toLowerCase();

const shimDirKey = normalize(shimDir + path.sep);
const appDirKeys = ["app", "src"].map((dir) => normalize(path.join(repoRoot, dir) + path.sep));

/**
 * @param {string} origin 부르는 파일의 절대 경로
 * @param {string} moduleName 부르는 모듈 이름
 * @returns {string | null} 심 파일의 절대 경로. 돌리지 않으면 `null`
 */
function labShimFor(origin, moduleName) {
  const from = normalize(origin);
  if (from.startsWith(shimDirKey)) return null;
  const shim = /** @type {Record<string, string>} */ (WEB_SHIMS)[moduleName];
  if (shim) return path.join(shimDir, shim);
  if (!appDirKeys.some((dir) => from.startsWith(dir))) return null;
  // 웹 Babel 프리셋(babel-plugin-react-native-web)이 `import { Platform } from "react-native"` 를
  // 이 경로의 기본 내보내기로 바꿔 쓴다 — 앱 코드의 거의 모든 `Platform` 이 이 길로 온다
  if (/^react-native-web\/dist\/(cjs\/)?exports\/Platform(\/index(\.js)?)?$/.test(moduleName)) {
    return path.join(shimDir, "platform.ts");
  }
  if (moduleName === "react-native" || moduleName === "react-native-web") {
    return path.join(shimDir, "react-native.ts");
  }
  return null;
}

module.exports = { WEB_SHIMS, labShimFor, shimDir, repoRoot };
