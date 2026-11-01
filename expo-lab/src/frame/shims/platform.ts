/**
 * **앱 코드에만** 끼우는 `Platform` — 프레임이 흉내 내는 플랫폼(`config.platform`)을 말한다.
 *
 * ## 왜 앱 코드에만인가
 *
 * `Platform.OS` 를 전역으로 바꾸면 라이브러리가 웹 길을 버리고 네이티브 길로 간다 — 실제로
 * expo-router 는 `Platform.OS === "web"` 일 때만 주소창에서 첫 경로를 읽고,
 * `expo-apple-authentication` 은 `"ios"` 면 네이티브 뷰를 찾다가 던진다. 그래서 Metro 가
 * **루트 `app/`·`src/` 안의 파일이 부르는 `Platform`** 만 이 파일로 돌린다(`../metroShims.js`).
 * 라이브러리는 계속 웹을 본다.
 *
 * 웹 Babel 프리셋이 `import { Platform } from "react-native"` 를
 * `react-native-web/dist/exports/Platform` 의 기본 내보내기로 바꿔 쓰므로 기본 내보내기로 둔다.
 * `react-native` 를 통째로 부르는 경우는 `react-native.ts` 가 이것을 되내보낸다.
 *
 * 셸(프레임 설정 없음)에서는 진짜 웹 `Platform` 과 같다.
 */
import { Platform as WebPlatform } from "react-native";

import { getEmulatedPlatform } from "../runtime";

type OS = typeof WebPlatform.OS;

const os = (): OS => getEmulatedPlatform() ?? WebPlatform.OS;

/** 흉내 내는 OS 판 — iOS 18 · Android 15(API 35). 앱은 지금 읽지 않는다 */
const VERSION: Partial<Record<OS, string | number>> = { ios: "18.0", android: 35 };

const Platform = {
  get OS(): OS {
    return os();
  },
  get Version(): string | number {
    return VERSION[os()] ?? WebPlatform.Version;
  },
  get isPad(): boolean {
    return false;
  },
  get isTV(): boolean {
    return false;
  },
  get isVision(): boolean {
    return false;
  },
  get isTesting(): boolean {
    return WebPlatform.isTesting;
  },
  get constants() {
    return { reactNativeVersion: { major: 0, minor: 86, patch: 3 }, isTesting: false };
  },
  select<T>(spec: { ios?: T; android?: T; native?: T; web?: T; default?: T }): T | undefined {
    const current = os();
    const keyed = spec as Partial<Record<string, T>>;
    if (current in keyed) return keyed[current];
    if (current !== "web" && "native" in spec) return spec.native;
    return spec.default;
  },
};

export default Platform;
