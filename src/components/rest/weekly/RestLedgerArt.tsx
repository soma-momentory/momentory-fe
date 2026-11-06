import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { TabPaperBackground } from "@/components/ds/TabPaperBackground";
import { homeV2, weeklyHappiness } from "@/design/ds";
import { weekStartOf } from "@/features/home/model/day";
import { WEEKLY_HAPPINESS_CATEGORIES, weekRangeLabel } from "@/features/rest/model/weeklyHappiness";
import { clock } from "@/lib/clock";

const { art, color, size } = weeklyHappiness;
const ROWS = WEEKLY_HAPPINESS_CATEGORIES.slice(0, art.rows);

/**
 * 쉼터 칸의 그림 — 주간 행복 화면의 윗부분을 그대로 줄인 것. 그릴 그림 파일이 없어 코드로 그린다.
 * 화면과 같은 종이 · 이번 주 날짜 · 칸 이름에, 적는 자리는 화면처럼 비어 있다.
 * 글자도 **그림의 일부**라 낭독기에서 숨기고 글꼴 배율을 따르지 않는다 — 이름은 카드 아래 종이가 말한다.
 */
export function RestLedgerArt() {
  const [{ from, to }] = useState(() => weekRangeLabel(weekStartOf(clock.today())));

  return (
    <View testID="rest-ledger-art" aria-hidden style={styles.window}>
      <TabPaperBackground tab="쉼터" />
      <View style={styles.weekBar}>
        <Text allowFontScaling={false} color={color.text} style={styles.week}>
          〈
        </Text>
        <Text allowFontScaling={false} color={color.entry} style={styles.week}>
          {from}
        </Text>
        <Text allowFontScaling={false} color={color.entry} style={styles.week}>
          ~
        </Text>
        <Text allowFontScaling={false} color={color.entry} style={styles.week}>
          {to}
        </Text>
        <Text
          allowFontScaling={false}
          color={color.text}
          style={[styles.week, styles.arrowDisabled]}
        >
          〉
        </Text>
      </View>
      {ROWS.map((category) => (
        <View key={category.key} style={styles.row}>
          <View style={styles.labelSeat}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              color={color.text}
              style={styles.label}
            >
              {category.label}
            </Text>
          </View>
          <View style={styles.divider} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: art.paddingX,
    paddingTop: art.paddingTop,
  },
  weekBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: art.weekBarHeight,
    paddingHorizontal: art.weekPaddingX,
    borderTopWidth: art.weekBarTopLine,
    borderBottomWidth: art.line,
    borderColor: color.line,
  },
  week: { fontFamily: homeV2.font.bold, ...art.week },
  arrowDisabled: { opacity: size.arrowDisabledOpacity },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    height: art.rowHeight,
    borderBottomWidth: art.line,
    borderBottomColor: color.line,
  },
  labelSeat: { width: art.labelWidth, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: homeV2.font.regular, ...art.label },
  divider: { width: art.line, marginVertical: art.dividerMarginY, backgroundColor: color.line },
});
