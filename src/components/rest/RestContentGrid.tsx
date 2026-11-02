import { StyleSheet, View } from "react-native";

import type { RestContent } from "@/features/rest/model/contents";

import { RestCardPressable } from "./RestCardPressable";
import { RestPolaroid } from "./RestPolaroid";

type Props = {
  items: readonly RestContent[];
  onOpen?: (item: RestContent) => void;
};

export function RestContentGrid({ items, onOpen }: Props) {
  const rows: RestContent[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={styles.grid}>
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
                <RestPolaroid item={item} />
              </RestCardPressable>
            ) : (
              <View key={item.id} style={styles.cell}>
                <RestPolaroid item={item} />
              </View>
            ),
          )}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 22 },
  row: { flexDirection: "row", gap: 22 },
  cell: { flex: 1 },
});
