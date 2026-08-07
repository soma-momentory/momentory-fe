import { StyleSheet, View } from "react-native";

import { SectionLabel } from "@/components/common/SectionLabel";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import theme from "@/design/theme";
import { report as tokens } from "@/design/tokens.mvp";
import type { WeekDay } from "@/features/report/model/report";

/**
 * `W1` · 감정 변화 — **감정은 막대가 아니라 요일별 점**이다. 강도를 입력받지
 * 않으므로 높이로 말할 것이 없다. 하루 최대 3개, **이름을 함께** 적고
 * (색만으로 판단하게 하지 않는다) 기록 없는 날은 흐린 칸으로 남긴다.
 */
export function WeeklyEmotionGrid({ flow, days }: { flow: string; days: readonly WeekDay[] }) {
  return (
    <Card style={styles.card}>
      <View style={styles.rowBetween}>
        <SectionLabel>감정 변화</SectionLabel>
        <AppText variant="caption" tone="caption">
          주 초반 → 주 후반
        </AppText>
      </View>
      <AppText variant="caption" tone="caption">
        그날 기록한 감정이에요 · 하루 최대 3개까지 보여줘요
      </AppText>
      <AppText tone="strong" weight="500" style={styles.flow}>
        {flow}
      </AppText>

      {/* 막대가 아니라 점이다 — 높이로 말할 것이 없다 */}
      <View style={styles.weekRow}>
        {days.map((d) => {
          const off = d.emotions.length === 0;
          return (
            <View
              key={d.date}
              accessibilityLabel={`${d.label}요일`}
              style={[styles.weekCol, off ? styles.weekColOff : null]}
            >
              <AppText tone="caption" weight="600" style={styles.weekLabel}>
                {d.label}
              </AppText>
              <View style={styles.weekDots}>
                {d.emotions.map((e, i) => (
                  <View
                    key={`${e}-${i}`}
                    style={[styles.weekDot, { backgroundColor: theme.emotions[e - 1]?.base }]}
                  />
                ))}
              </View>
              {/* 색만으로 판단하게 하지 않는다 — 이름을 함께 적는다 */}
              {off ? (
                <AppText tone="caption" style={styles.weekName}>
                  기록 없음
                </AppText>
              ) : (
                d.emotions.map((e, i) => (
                  <AppText key={`${e}-n-${i}`} tone="body" weight="500" style={styles.weekName}>
                    {theme.emotions[e - 1]?.name}
                  </AppText>
                ))
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  card: { gap: 9 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flow: { fontSize: 13.5, lineHeight: 21.6 },

  weekRow: { flexDirection: "row", gap: tokens.weekday.gap, alignItems: "flex-start" },
  weekCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 6,
    paddingVertical: tokens.weekday.paddingVertical,
    paddingHorizontal: tokens.weekday.paddingHorizontal,
    borderRadius: tokens.weekday.radius,
    backgroundColor: `${semantic.surface}B3`,
  },
  // 기록 없는 날은 면이 없다 — 빈 칸을 강조하지 않는다
  weekColOff: { backgroundColor: "transparent" },
  weekLabel: { fontSize: tokens.weekday.labelSize, lineHeight: tokens.weekday.labelSize },
  weekDots: { flexDirection: "row", gap: 4, minHeight: tokens.weekday.dot },
  weekDot: {
    width: tokens.weekday.dot,
    height: tokens.weekday.dot,
    borderRadius: tokens.weekday.dot / 2,
  },
  // 상류 9.5px → 접근성 하한 11px (RULES 「접근성」)
  weekName: {
    fontSize: tokens.weekday.nameSize,
    lineHeight: tokens.weekday.nameSize * 1.25,
    textAlign: "center",
  },
});
