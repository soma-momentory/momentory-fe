import { StyleSheet, View } from "react-native";

import { weeklyHappiness } from "@/design/ds";

const { art, color, size } = weeklyHappiness;

/** 쉼터 칸의 그림 — 주간 행복 기록장을 작게. 그릴 그림 파일이 없어 코드로 그린다 */
export function RestLedgerArt() {
  return (
    <View testID="rest-ledger-art" style={styles.paper}>
      {art.entryWidths.map((width) => (
        <View key={width} style={styles.row}>
          <View style={styles.label} />
          <View style={styles.divider} />
          <View style={styles.entryArea}>
            <View style={[styles.entry, { width }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    paddingHorizontal: art.paddingX,
    backgroundColor: art.paper,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: art.rowHeight,
    gap: art.gap,
    borderBottomWidth: size.line,
    borderBottomColor: color.line,
  },
  label: {
    width: art.labelWidth,
    height: art.labelHeight,
    borderRadius: art.labelHeight / 2,
    backgroundColor: color.line,
  },
  divider: { width: size.line, height: art.divider, backgroundColor: color.line },
  entryArea: { flex: 1 },
  entry: {
    height: art.entryHeight,
    borderRadius: art.entryHeight / 2,
    backgroundColor: color.entry,
  },
});
