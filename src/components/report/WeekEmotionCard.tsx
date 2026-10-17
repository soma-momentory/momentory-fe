import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { space } from "@/design/ds";
import { reportPaper } from "@/design/ds/reportPaper";
import type { WeeklyReport } from "@/features/report/model/weeklyReport";

import { WeekEmotionStack, WeekMoodReveal } from "./WeekEmotionStack";

/**
 * HTML `04-report.dc.html`의 테이프 붙인 요일 카드.
 * 날짜를 누르면 대표 감정 외에 그날 기록한 모든 감정을 글자로 확인할 수 있다.
 */
type Props = {
  report: WeeklyReport;
  thisWeek: boolean;
  /** 일기가 있는 날 — 감정 없이 끝난 일기에 빈 조약돌을 놓는 데 쓴다(`WeekEmotionStack`) */
  writtenDates: ReadonlySet<string>;
};

export function WeekEmotionCard({ report, thisWeek, writtenDates }: Props) {
  const fontScale = useEffectiveFontScale();
  const [selected, setSelected] = useState<string | null>(null);
  // 다른 주로 넘기면 고른 날이 그 주에 없다 — 찾지 못하면 아무것도 적지 않는다
  const picked = report.days.find((d) => d.date === selected) ?? null;

  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.tape} />
      <View testID="week-emotion-head" style={styles.head}>
        <View style={styles.headLine}>
          <Text
            variant="body1Reading"
            color={reportPaper.strong}
            style={[styles.title, { lineHeight: 24 * fontScale }]}
          >
            요일별
          </Text>
          <Text
            variant="label2"
            color={reportPaper.muted}
            style={[styles.caption, { lineHeight: 20 * fontScale }]}
          >
            {thisWeek ? "이번 주 감정들" : "이 주 감정들"}
          </Text>
        </View>
        {picked != null ? (
          <WeekMoodReveal day={picked} written={writtenDates.has(picked.date)} />
        ) : null}
      </View>
      <WeekEmotionStack
        days={report.days}
        writtenDates={writtenDates}
        selected={selected}
        onSelect={setSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    marginTop: 11,
    paddingHorizontal: 10,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: reportPaper.card,
    borderRadius: 16,
    boxShadow: `0px 6px 18px ${reportPaper.shadow}14`,
  },
  tape: {
    position: "absolute",
    top: -11,
    left: "38%",
    width: 84,
    height: 22,
    backgroundColor: reportPaper.tape,
    opacity: 0.85,
    transform: [{ rotate: "-2deg" }],
  },
  head: {
    gap: space.xs,
    paddingHorizontal: 8,
  },
  headLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: { fontFamily: reportPaper.font.bold, fontSize: 18, lineHeight: 24 },
  caption: { flexShrink: 1, fontFamily: reportPaper.font.regular, fontSize: 14, lineHeight: 20 },
});
