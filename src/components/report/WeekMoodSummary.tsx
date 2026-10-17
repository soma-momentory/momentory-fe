import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { space } from "@/design/ds";
import { reportPaper } from "@/design/ds/reportPaper";
import { splitMoodMessage, type WeeklyReport } from "@/features/report/model/weeklyReport";

/**
 * HTML `04-report.dc.html`의 바바 말풍선. 요약 문장은 서버 값을 그대로 표시한다.
 * 첫 마침표에서 관찰과 권유를 나눠 굵기만 달리하며, 없는 설명이나 점수는 만들지 않는다.
 * 지난 주에 서버 문장이 「이번 주에는」이라고 시작할 수 있는 정책도 그대로 둔다.
 */
export function WeekMoodSummary({ report }: { report: WeeklyReport }) {
  const fontScale = useEffectiveFontScale();
  const { lead, follow } = splitMoodMessage(report.moodMessage);
  if (lead.length === 0) return null;

  return (
    <View style={styles.copy}>
      <Text
        variant="label1"
        color={reportPaper.muted}
        style={[styles.eyebrow, { lineHeight: 19 * fontScale }]}
      >
        바바의 한 주 정리
      </Text>
      <Text
        variant="body1ReadingHandLg"
        color={reportPaper.strong}
        style={[styles.lead, { lineHeight: 25 * fontScale }]}
      >
        {lead}
      </Text>
      {follow.length > 0 ? (
        <Text
          variant="body2Reading"
          color={reportPaper.muted}
          style={[styles.follow, { lineHeight: 22 * fontScale }]}
        >
          {follow}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    minWidth: 0,
    gap: space.xs2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: reportPaper.white,
    borderRadius: 20,
    boxShadow: `0px 4px 12px ${reportPaper.shadow}1A`,
    transform: [{ rotate: "-1deg" }],
  },
  eyebrow: { fontFamily: reportPaper.font.regular, fontSize: 15, lineHeight: 19 },

  lead: { fontFamily: reportPaper.font.bold, fontSize: 19, lineHeight: 25 },
  follow: { fontFamily: reportPaper.font.regular, fontSize: 16, lineHeight: 22 },
});
