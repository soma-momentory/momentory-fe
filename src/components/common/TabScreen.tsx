import { router } from "expo-router";
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
 * 탭 이동도 여기가 쥔다 — **만든 탭만** 적혀 있고, 없는 탭을 누르면 아무 일도
 * 일어나지 않는다(빈 껍데기 라우트를 미리 만들지 않는다 · `ARCHITECTURE §2`).
 * 리포트·마이가 생기면 이 표에 한 줄씩 는다.
 *
 * `replace` 인 이유 — 탭은 쌓이는 화면이 아니다. `push` 로 오가면 뒤로가기가
 * 탭 이동 이력을 되짚어 홈에서 나가기까지 여러 번 눌러야 한다.
 */
const ROUTES: Partial<Record<TabName, "/home" | "/archive">> = {
  홈: "/home",
  보관함: "/archive",
};

type Props = {
  active: TabName;
  children: ReactNode;
  /** 기본 동작(탭 이동)을 바꿔야 할 때만 */
  onTabPress?: (tab: TabName) => void;
};

export function TabScreen({ active, children, onTabPress }: Props) {
  const go = (tab: TabName) => {
    if (onTabPress != null) {
      onTabPress(tab);
      return;
    }
    if (tab === active) return;
    const route = ROUTES[tab];
    if (route != null) router.replace(route);
  };

  return (
    <ScreenBackground>
      <View style={styles.body}>{children}</View>
      <TabBar active={active} onPress={go} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // 본문이 남은 높이를 다 쓰고, 탭바는 아래에 고정된다
  body: { flex: 1, minHeight: 0 },
});
