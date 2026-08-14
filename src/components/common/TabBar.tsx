import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperTabBar } from "@/design/paper";
import theme from "@/design/theme";

/**
 * 하단 탭 — 새 디자인 리스킨 (2026-08-14 · `docs/design/design-system.md` §4.1).
 *
 * **다섯 칸이다** — 홈 · 쉼터 · 보관함 · 리포트 · 마이 (`PLAN.md` D1).
 * 쉼터는 2026-08-14 에 들어왔고 **행동카드만** 있다 — 룸 3종은 구현 범위 밖이다.
 *
 * 아이콘은 프로토타입 그대로 **라운드 사각 테두리**다 — 새 디자인이 실 글리프를
 * 정의하지 않았다(자리표시가 곧 디자인). 실 아이콘이 생기면 `LineIcons` 로 교체한다.
 *
 * **선택 상태를 색만으로 표시하지 않는다**(`RULES.md` 「접근성」) — 활성 칸은
 * 아이콘 테두리색 + 배경 틴트 + 라벨 굵기(400 → 700)를 함께 바꾼다.
 *
 * ⚠ expo-router 의 `Tabs` 를 아직 쓰지 않는다 — 교체가 필요해지면
 * **이 파일과 `TabScreen` 안에서** 끝낸다. 화면 코드는 탭바를 모른다.
 */
export type TabName = "홈" | "쉼터" | "보관함" | "리포트" | "마이";

const TABS: readonly TabName[] = ["홈", "쉼터", "보관함", "리포트", "마이"];

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
            <View style={[styles.icon, on ? styles.iconOn : styles.iconOff]} />
            <AppText
              weight={on ? "700" : "400"}
              style={[
                styles.label,
                { color: on ? paperTabBar.active.label : paperTabBar.inactive.label },
              ]}
            >
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
    backgroundColor: paperTabBar.bg,
    borderTopWidth: 1,
    borderTopColor: paperTabBar.line,
    paddingTop: 9,
    paddingHorizontal: 8,
    paddingBottom: 14,
    // 면·구분선은 화면 끝까지 간다 — ScreenBackground 의 좌우 여백을 되돌린다
    marginHorizontal: -theme.layout.screenMargin,
  },
  // 칸 전체가 탭을 받는다 — 44 트랙이라 히트 영역을 따로 깔지 않는다
  // (`RULES.md` 「접근성」 — "이미 큰 부모가 탭을 받는" 자리)
  tab: {
    flex: 1,
    minHeight: theme.touch.minTarget,
    alignItems: "center",
    gap: 4,
  },
  icon: {
    width: paperTabBar.icon.size,
    height: paperTabBar.icon.size,
    borderWidth: paperTabBar.icon.borderWidth,
    borderRadius: paperTabBar.icon.radius,
  },
  iconOn: {
    borderColor: paperTabBar.active.border,
    backgroundColor: paperTabBar.active.tint,
  },
  iconOff: { borderColor: paperTabBar.inactive.border },
  label: { fontSize: paperTabBar.labelSize, lineHeight: paperTabBar.labelSize + 3 },
});
