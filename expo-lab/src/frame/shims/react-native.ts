/**
 * **앱 코드에만** 끼우는 `react-native` — `Platform` · `Keyboard` · `KeyboardAvoidingView` 만 흉내 심
 * (`platform.ts` · `keyboard.ts` · `keyboard-avoiding-view.tsx`)으로 바꾸고 나머지는 진짜
 * (react-native-web)를 그대로 내보낸다. 이유는 각 파일 머리말.
 *
 * 웹 Babel 프리셋은 대개 `react-native` import 를 `react-native-web/dist/exports/<이름>` 으로
 * 쪼개 쓰므로 그 길은 각 심이 직접 받는다. 이 파일은 쪼개지 않은 import
 * (`import * as RN` · `require("react-native")`)를 위한 것이다.
 */
import Keyboard from "./keyboard";
import KeyboardAvoidingView from "./keyboard-avoiding-view";
import Platform from "./platform";

export * from "react-native";
export { Keyboard, KeyboardAvoidingView, Platform };
