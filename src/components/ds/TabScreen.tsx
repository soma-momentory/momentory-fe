import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { layout } from "@/design/ds";

import { BottomNavigation, type TabItem } from "./BottomNavigation";
import { Screen } from "./Screen";

/**
 * 탭 다섯 칸이 공유하는 껍데기 — 배경·격자 + 본문 + 하단 탭.
 *
 * 화면마다 `Screen` 과 `BottomNavigation` 을 각각 얹으면 탭바 아래 여백과
 * 좌우 20 이 화면 수만큼 갈린다. 껍데기를 하나로 두면 **화면은 자기 내용만** 그린다.
 *
 * ⚠ **`components/common/TabScreen` 의 3세대 자리다.** 옛 껍데기는 옛 배경
 * (`ScreenBackground`)과 옛 탭바(`TabBar`)를 들고 있어 한 화면에 두 체계가 섞인다 —
 * 화면을 옮길 때 이쪽으로 갈아탄다. 다섯 탭이 다 넘어오면 옛 것을 지운다
 * (`PLAN.md` A-0 Phase 5).
 *
 * ## 좌우 20 은 본문만이다
 *
 * 탭바는 **화면 폭을 다 쓴다** — 그래서 `Screen` 을 `padded={false}` 로 받고
 * 본문 칸이 스스로 20 을 잡는다. 음수 마진으로 되돌리지 않는다.
 *
 * ## `replace` 인 이유
 *
 * 탭은 쌓이는 화면이 아니다. `push` 로 오가면 뒤로가기가 탭 이동 이력을 되짚어
 * 홈에서 나가기까지 여러 번 눌러야 한다.
 */
export type TabName = "홈" | "쉼터" | "보관함" | "리포트" | "마이";

const ROUTES: Record<TabName, "/home" | "/rest" | "/archive" | "/report" | "/my"> = {
  홈: "/home",
  쉼터: "/rest",
  보관함: "/archive",
  리포트: "/report",
  마이: "/my",
};

/** 아이콘은 Wanted 세트만 쓴다 — **`person` 은 없고 `nav-my-page`** 다(`design.md` §10) */
const TABS: readonly TabItem<TabName>[] = [
  { name: "홈", icon: "home", label: "홈" },
  { name: "쉼터", icon: "heart", label: "쉼터" },
  { name: "보관함", icon: "folder-job", label: "보관함" },
  { name: "리포트", icon: "document", label: "리포트" },
  { name: "마이", icon: "nav-my-page", label: "마이" },
];

type Props = {
  active: TabName;
  children: ReactNode;
};

export function TabScreen({ active, children }: Props) {
  const go = (tab: TabName) => {
    // 자기 탭을 누르면 아무 일도 없다 — 같은 화면을 다시 열지 않는다
    if (tab === active) return;
    router.replace(ROUTES[tab]);
  };

  return (
    <Screen padded={false}>
      <View style={styles.body}>{children}</View>
      <BottomNavigation items={TABS} active={active} onPress={go} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 본문이 남은 높이를 다 쓰고, 탭바는 아래에 고정된다
  body: { flex: 1, minHeight: 0, paddingHorizontal: layout.screenPadding },
});
