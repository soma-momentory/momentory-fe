import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { ScreenBackground } from "@/components/primitives/ScreenBackground";

import { TabBar, type TabName } from "./TabBar";

/**
 * 탭 네 칸이 공유하는 껍데기 — 배경 + 본문 + 하단 탭.
 *
 * 화면마다 `ScreenBackground` 와 `TabBar` 를 각각 얹으면 탭바의 위치·여백이
 * 화면 수만큼 갈린다. 껍데기를 하나로 두면 **화면은 자기 내용만** 그린다.
 *
 * 탭 이동을 `onTabPress` 로 위임받는 이유 — 지금은 홈만 있어서 나머지 셋이
 * 갈 곳이 없다. 라우팅을 이 컴포넌트가 쥐면 없는 라우트를 여기 적게 된다
 * (`TabBar` 주석 참조).
 */
type Props = {
  active: TabName;
  children: ReactNode;
  onTabPress?: (tab: TabName) => void;
};

export function TabScreen({ active, children, onTabPress }: Props) {
  return (
    <ScreenBackground>
      <View style={styles.body}>{children}</View>
      <TabBar active={active} onPress={onTabPress} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // 본문이 남은 높이를 다 쓰고, 탭바는 아래에 고정된다
  body: { flex: 1, minHeight: 0 },
});
