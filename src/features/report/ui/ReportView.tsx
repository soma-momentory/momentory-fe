import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Icon, Spinner, Text } from "@/components/ds";
import { WeekCountList } from "@/components/report/WeekCountList";
import { WeekEmotionCard } from "@/components/report/WeekEmotionCard";
import { WeekMoodSummary } from "@/components/report/WeekMoodSummary";
import { WeekWishCard } from "@/components/report/WeekWishCard";
import { label as labelColor, layout, space } from "@/design/ds";
import type { WeeklyReport, WeeklyReportStatus } from "@/features/report/model/weeklyReport";

type Props = {
  range: string;
  report: WeeklyReport | null;
  status: WeeklyReportStatus;
  thisWeek: boolean;
  writtenDates: ReadonlySet<string>;
  onOpenWeekPicker: () => void;
  onOpenArchive: () => void;
};

/** 주간 리포트의 표시 영역. 조회, 주차 선택, 이동, 계측은 호출자가 맡는다. */
export function ReportView({
  range,
  report,
  status,
  thisWeek,
  writtenDates,
  onOpenWeekPicker,
  onOpenArchive,
}: Props) {
  return (
    <>
      {/* 날짜 줄 전체가 주를 고르는 버튼이고 달력 아이콘은 오른쪽 끝에 선다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${range} · 주 고르기`}
        onPress={onOpenWeekPicker}
        style={styles.weekNav}
      >
        <Text variant="title3Hand" color={labelColor.strong} numberOfLines={1} style={styles.range}>
          {range}
        </Text>
        <Icon name="calendar" size={20} color={labelColor.neutral} />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {report == null ? (
          <Card padding="loose" style={styles.notice}>
            {status === "failed" ? (
              <Text variant="body2Reading" color={labelColor.alternative}>
                리포트를 불러오지 못했어요 · 잠시 뒤에 다시 열어 주세요
              </Text>
            ) : (
              <View style={styles.loading}>
                <Spinner />
                <Text variant="body2Reading" color={labelColor.alternative}>
                  한 주를 모으고 있어요
                </Text>
              </View>
            )}
          </Card>
        ) : (
          <>
            <WeekMoodSummary report={report} />
            <WeekEmotionCard report={report} thisWeek={thisWeek} writtenDates={writtenDates} />
            <WeekWishCard report={report} thisWeek={thisWeek} />

            <View style={styles.section}>
              <Text variant="label1" color={labelColor.neutral} style={styles.sectionLabel}>
                {thisWeek ? "이번 주 기록" : "이 주 기록"}
              </Text>
              <WeekCountList report={report} />
            </View>

            <Button
              label={thisWeek ? "이번 주 기록 보기" : "이 주의 기록 보기"}
              variant="outlined"
              fill
              onPress={onOpenArchive}
            />
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    minHeight: layout.minTouch,
    marginTop: space.sm,
    marginBottom: space.md,
  },
  range: { flexShrink: 1 },
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: space.lg, paddingBottom: space.xl },
  section: { gap: space.md },
  sectionLabel: { paddingLeft: space.xs },
  notice: { gap: space.sm },
  loading: { alignItems: "center", gap: space.md, paddingVertical: space.sm },
});
