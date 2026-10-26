import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { background, homeV2, interaction, label as labelColor, layout, space } from "@/design/ds";

import { Icon, type IconName } from "./icons/Icon";
import { Text } from "./Text";

/**
 * 하단 탭 — `DESIGN.md` §10. **다섯 칸이다.**
 *
 * 높이 56 · `paddingTop: 8` · `paddingBottom: 9`. 아이콘은 Wanted 세트만 쓴다 —
 * **`person` 은 없고 `nav-my-page` 를 쓴다**(§10, 없는 글리프를 추측하지 않는다).
 *
 * ## 활성 표시가 색만이 아니다 — 이제 **크기**다 (2026-09-06)
 *
 * `DESIGN.md` 는 활성 = `label.normal` + 「아이콘 진하게」, 비활성 =
 * `interaction.inactive` 로 둔다. 색만으로 상태를 말하지 않기 위해(`RULES.md`)
 * 라벨을 함께 바꾸는데, **무엇을 바꾸는지가 달라졌다.**
 *
 * 앱 서체가 교보손글씨 하나로 가면서(`ds/typography.ts`) 굵기가 사라졌다 —
 * `label2`(600) → `caption1`(500) 은 이제 **같은 글자로 그려져** 색 차이만 남는다.
 * 그래서 신호를 **크기 단차**로 옮겼다: 활성 `label1`(14) · 비활성 `caption1`(12).
 * 옛 짝(13 vs 12)은 1pt 라 굵기가 없으면 눈에 잡히지 않아 2pt 로 벌렸다.
 *
 * ⚠ **이 자리를 색만 남기고 되돌리지 않는다.** 되돌리려면 밑줄·점 같은 **다른
 * 채널**을 대신 두어야 한다.
 *
 * ⚠ `interaction.inactive` 는 시안 `#C2BAAA`(1.72) 를 **AA 로 보정한 값**이다.
 * 비활성 탭은 비활성 컨트롤이 아니라 **갈 수 있는 곳**이라 읽혀야 한다.
 */
export type TabItem<T extends string> = { name: T; icon: IconName; label: string };

type Props<T extends string> = {
  items: readonly TabItem<T>[];
  active: T;
  onPress: (name: T) => void;
};

export function BottomNavigation<T extends string>({ items, active, onPress }: Props<T>) {
  const { fontScale } = useWindowDimensions();
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {items.map((item) => {
        const on = item.name === active;
        return (
          <Pressable
            key={item.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={item.label}
            onPress={() => onPress(item.name)}
            style={styles.tab}
          >
            <Icon
              name={item.icon}
              size={24}
              color={on ? labelColor.normal : interaction.inactive}
            />
            {/* 크기가 함께 바뀐다 — caption1(12) → label1(14). 위 머리말 참고 */}
            <Text
              key={`${item.name}-${fontScale}`}
              variant={on ? "label1" : "caption1"}
              color={on ? labelColor.normal : interaction.inactive}
              style={styles.tabLabel}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    // `height` 가 아니라 `minHeight` 다 — 위아래 여백을 준 뒤에도 아이콘·라벨이
    // 56 안에서 눌리지 않는다
    minHeight: layout.tabBar,
    paddingTop: layout.tabBarPaddingTop,
    paddingBottom: layout.tabBarPaddingBottom,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: background.elevated,
    marginHorizontal: layout.screenPadding,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: homeV2.color.emptyBorder,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs2,
  },
  tabLabel: { maxWidth: "100%", textAlign: "center" },
});
