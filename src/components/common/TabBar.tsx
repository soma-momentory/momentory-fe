import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { tabBar } from "@/design/tokens.mvp";

/**
 * 하단 탭 — `momentory.css` `.tabs` · `.tb` · `.tbOn`.
 *
 * **네 칸이다** — 홈 · 보관함 · 리포트 · 마이. 원본은 다섯이었지만 쉼터가 MVP
 * 밖이라 넷이 됐고, 이것이 여러 화면의 레이아웃을 규정한다(`RULES.md` 「자른 것」).
 *
 * **선택 상태를 색만으로 표시하지 않는다**(`RULES.md` 「접근성」) — 활성 칸은
 * 색(`accentInk`)과 **굵기**(500 → 600)를 함께 바꾼다.
 *
 * ⚠ **아이콘이 아직 없다.** 상류가 이모지를 걷어내면서 탭바 아이콘 4종은 아직
 * 그리지 않았다(`RULES.md` 「아이콘」 — "아직 없는 것"). 지금은 라벨만이다.
 *
 * ⚠ **expo-router 의 `Tabs` 를 아직 쓰지 않는다.** 네 칸 중 홈만 있어서
 * `Tabs.Screen` 을 선언하면 없는 라우트를 가리키게 된다. 빈 껍데기 세 개를
 * 미리 만들지 않는다(`ARCHITECTURE.md §2`) — 보관함·리포트·마이가 생기는
 * M5 에서 `Tabs` 로 바꾸고, 그 교체는 **이 파일과 `TabScreen` 안에서** 끝난다.
 * 화면 코드는 탭바를 모른다.
 */
export type TabName = "홈" | "보관함" | "리포트" | "마이";

const TABS: readonly TabName[] = ["홈", "보관함", "리포트", "마이"];

type Props = {
  active: TabName;
  /** 아직 만들지 않은 탭은 넘기지 않는다 — 누르면 아무 일도 없다 */
  onPress?: (tab: TabName) => void;
};

export function TabBar({ active, onPress }: Props) {
  return (
    <View style={styles.tabs}>
      {TABS.map((tab) => {
        const on = tab === active;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onPress?.(tab)}
            style={styles.tab}
          >
            <AppText tone={on ? "accent" : "body"} weight={on ? "600" : "500"} style={styles.label}>
              {tab}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: tabBar.border,
    paddingTop: tabBar.paddingTop,
    paddingHorizontal: tabBar.paddingHorizontal,
    // 구분선은 화면 끝까지 간다 — ScreenBackground 의 좌우 여백을 되돌린다
    marginHorizontal: -theme.layout.screenMargin,
  },
  // 칸 전체가 탭을 받는다 — 44 트랙이라 히트 영역을 따로 깔지 않는다
  // (`RULES.md` 「접근성」 — "이미 큰 부모가 탭을 받는" 자리)
  tab: { flex: 1, minHeight: theme.touch.minTarget, alignItems: "center" },
  label: { fontSize: tabBar.fontSize, lineHeight: tabBar.fontSize },
});
