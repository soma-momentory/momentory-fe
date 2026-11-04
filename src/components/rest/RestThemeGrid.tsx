import { StyleSheet, View } from "react-native";

import { restThemeCard } from "@/design/ds";
import type { RestContent } from "@/features/rest/model/contents";

import { RestCardPressable } from "./RestCardPressable";
import { RestThemeCard } from "./RestThemeCard";

type Props = {
  items: readonly RestContent[];
  onOpen?: (item: RestContent) => void;
};

/**
 * 쉼터 탭의 칸 — 두 칸씩 놓고, 개수가 홀수면 마지막 카드가 한 줄을 다 쓴다(빈 칸을 남기지 않는다).
 * 콘텐츠 개수를 알지 못한다 — 늘어나면 줄이 늘어날 뿐이다.
 */
export function RestThemeGrid({ items, onOpen }: Props) {
  const rows: RestContent[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View testID="rest-theme-grid" style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((item) =>
            item.route != null ? (
              <RestCardPressable
                key={item.id}
                accessibilityLabel={`${item.title} 열기`}
                onPress={() => onOpen?.(item)}
                style={styles.cell}
              >
                <RestThemeCard item={item} />
              </RestCardPressable>
            ) : (
              <View key={item.id} style={styles.cell}>
                <RestThemeCard item={item} />
              </View>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: restThemeCard.size.gap },
  row: { flexDirection: "row", gap: restThemeCard.size.gap },
  cell: { flex: 1 },
});
