import { Pressable, StyleSheet, View } from "react-native";

import { background, hairline, interaction, label as labelColor, layout, space } from "@/design/ds";

import { Icon, type IconName } from "./icons/Icon";
import { Text } from "./Text";

/**
 * 하단 탭 — `DESIGN.md` §10. **다섯 칸이다.**
 *
 * 높이 56 · `paddingTop: 8` · `paddingBottom: 9`. 아이콘은 Wanted 세트만 쓴다 —
 * **`person` 은 없고 `nav-my-page` 를 쓴다**(§10, 없는 글리프를 추측하지 않는다).
 *
 * ## 활성 표시가 색만이 아니다
 *
 * `DESIGN.md` 는 활성 = `label.normal` + 「아이콘 진하게」, 비활성 =
 * `interaction.inactive` 로 둔다. 색만으로 상태를 말하지 않기 위해(`RULES.md`)
 * **라벨 굵기도 함께 바꾼다** — `caption1`(500) → `label2`(600).
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
            {/* 굵기가 함께 바뀐다 — caption1(500) → label2(600) */}
            <Text
              variant={on ? "label2" : "caption1"}
              color={on ? labelColor.normal : interaction.inactive}
              numberOfLines={1}
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
    ...hairline.alternative,
    // 위쪽 선만 남긴다 — 사방 테두리는 탭바를 카드처럼 보이게 한다
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs2,
  },
});
