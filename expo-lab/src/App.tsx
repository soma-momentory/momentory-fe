/**
 * Expo Lab 진입 — 「전 화면」 셸(`shell/ShellApp`) 하나다. 옛 캡처 Atlas · 상태 비교 · Studio
 * 모드는 이 진입에서 빠졌다(실제 앱 프레임이 대신한다 · 2026-11-02).
 *
 * ⚠ 셸은 **최상위 창에서만** 그린다. 프레임(iframe) 안은 앱 부트스트랩(갈래 A · `index.ts`)이
 * 맡는다 — 그 전에 이 컴포넌트가 iframe 안에서 불리면 셸이 셸을 띄우는 무한 중첩이 되므로
 * 안내 한 줄만 그린다.
 */
import { Platform, Text, View } from "react-native";

import { ShellApp } from "./shell/ShellApp";

const insideFrame = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export function App() {
  if (Platform.OS !== "web") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text>Expo Lab 은 웹 전용이다 — npm run lab:web</Text>
      </View>
    );
  }
  if (insideFrame()) {
    return (
      <View
        testID="lab-frame-pending"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <Text style={{ textAlign: "center" }}>
          앱 프레임 준비 중 — 프레임 부트스트랩(갈래 A)이 이 자리에 실제 앱을 띄운다.
        </Text>
      </View>
    );
  }
  return <ShellApp />;
}
