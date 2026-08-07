import { StyleSheet } from "react-native";

import { SectionLabel } from "@/components/common/SectionLabel";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import theme from "@/design/theme";

/**
 * `W1` · 한 주 요약 — **문구를 기간에 매지 않는다**("이번 주 …"가 아니다).
 * 요약 문장은 서버가 그 주 대화를 읽고 쓰는 값이고, 근거 수치(회고·감정 수)는
 * 데이터에서 센 값이다 — 문장이 수치와 함께 있어야 지어낸 말이 아니게 된다.
 */
export function WeeklySummaryCard({
  summary,
  retroCount,
  emotionCount,
}: {
  summary: string;
  retroCount: number;
  emotionCount: number;
}) {
  return (
    <Card style={styles.card}>
      <SectionLabel>한 주 요약</SectionLabel>
      <AppText tone="strong" weight="700" style={styles.summary}>
        {summary}
      </AppText>
      <AppText variant="caption" tone="caption">
        {`회고 ${retroCount}회 · 감정 기록 ${emotionCount}개를 바탕으로 바바가 정리했어요`}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 9,
    backgroundColor: theme.colors.semantic.surfaceTone,
    borderColor: "transparent",
  },
  summary: { fontSize: 18, lineHeight: 28.8 },
});
