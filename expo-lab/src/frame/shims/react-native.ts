/**
 * **앱 코드에만** 끼우는 `react-native` — `Platform` 하나만 흉내 심(`platform.ts`)으로 바꾸고
 * 나머지는 진짜(react-native-web)를 그대로 내보낸다. 이유는 `platform.ts` 머리말.
 *
 * 웹 Babel 프리셋은 대개 `react-native` import 를 `react-native-web/dist/exports/<이름>` 으로
 * 쪼개 쓰므로 그 길은 `platform.ts` 가 직접 받는다. 이 파일은 쪼개지 않은 import
 * (`import * as RN` · `require("react-native")`)를 위한 것이다.
 */
import Platform from "./platform";

export * from "react-native";
export { Platform };
