import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout } from "@/design/ds";

import { BottomNavigation, type TabItem } from "./BottomNavigation";
import { Screen } from "./Screen";

/**
 * 탭 다섯 칸이 공유하는 껍데기 — 배경·격자 + 본문 + 하단 탭.
 *
 * 화면마다 `Screen` 과 `BottomNavigation` 을 각각 얹으면 탭바 아래 여백과
 * 좌우 20 이 화면 수만큼 갈린다. 껍데기를 하나로 두면 **화면은 자기 내용만** 그린다.
 * 실제로 병렬 이관이 껍데기를 셋 만들었고, 여기로 합쳤다(`PLAN.md` A-12).
 *
 * ## 좌우 20 은 본문만이다
 *
 * 탭바는 **화면 폭을 다 쓴다** — 그래서 `Screen` 을 `padded={false}` 로 받고
 * 본문 칸이 스스로 20 을 잡는다. 음수 마진으로 되돌리지 않는다.
 *
 * ## 탭바 아래는 같은 면으로 이어진다
 *
 * `Screen` 의 기본 `bottom` edge 를 그대로 쓰면 Safe Area 가 탭바를 위로 밀어
 * **탭바가 떠 있는 것처럼** 보인다. 그래서 `edges` 에서 `bottom` 을 빼고, 홈
 * 인디케이터 자리를 **탭바와 같은 면**으로 직접 채운다.
 *
 * ⚠ 그 자리에도 **하한이 있다**(`layout.minBottomInset`) — 안드로이드 3버튼
 * 내비게이션 기기는 `insets.bottom` 이 0 이라 탭 라벨이 시스템 버튼에 붙는다.
 *
 * ## 오버레이는 `Screen` 밖이다
 *
 * 시트·모달·메뉴는 절대 배치로 부모를 덮는데, `Screen` 안에 두면 Safe Area
 * 안쪽만 덮어 **딤이 상태바·홈 인디케이터 자리에서 끊긴다.** 그래서 `overlay` 로
 * 따로 받아 바깥에 그린다.
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

/** 아이콘은 Wanted 세트만 쓴다 — **`person` 은 없고 `nav-my-page`** 다(`DESIGN.md` §10) */
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
  /** 시트·모달·메뉴·토스트 — 화면 전체를 덮어야 하는 것 */
  overlay?: ReactNode;
};

export function TabScreen({ active, children, overlay }: Props) {
  const insets = useSafeAreaInsets();

  const go = (tab: TabName) => {
    // 자기 탭을 누르면 아무 일도 없다 — 같은 화면을 다시 열지 않는다
    if (tab === active) return;
    router.replace(ROUTES[tab]);
  };

  return (
    <>
      <Screen padded={false} edges={["top"]} paperV2>
        <View style={styles.body}>{children}</View>
        <BottomNavigation items={TABS} active={active} onPress={go} />
        {/* 홈 인디케이터·시스템 버튼 자리에도 모눈 배경을 이어 둔다. */}
        <View
          style={[styles.underTab, { height: Math.max(insets.bottom, layout.minBottomInset) }]}
        />
      </Screen>
      {overlay}
    </>
  );
}

const styles = StyleSheet.create({
  // 본문이 남은 높이를 다 쓰고, 탭바는 아래에 고정된다
  body: { flex: 1, minHeight: 0, paddingHorizontal: layout.screenPadding },
  underTab: { backgroundColor: "transparent" },
});
