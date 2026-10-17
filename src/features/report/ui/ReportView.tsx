import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

import { Button, Card, Icon, Spinner, Text } from "@/components/ds";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { WeekCountList } from "@/components/report/WeekCountList";
import { WeekEmotionCard } from "@/components/report/WeekEmotionCard";
import { WeekMoodSummary } from "@/components/report/WeekMoodSummary";
import { WeekWishCard } from "@/components/report/WeekWishCard";
import { label as labelColor, layout, space } from "@/design/ds";
import { reportPaper } from "@/design/ds/reportPaper";
import { approvedDesign, type StudioDesign } from "@/design/studioDesign";
import { Baba } from "@/features/home/ui/v2/Baba";
import type { WeeklyReport, WeeklyReportStatus } from "@/features/report/model/weeklyReport";

type Props = {
  design?: StudioDesign;
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
  design = approvedDesign,
  range,
  report,
  status,
  thisWeek,
  writtenDates,
  onOpenWeekPicker,
  onOpenArchive,
}: Props) {
  const fontScale = useEffectiveFontScale();

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="report-paper-grid" width={22} height={22} patternUnits="userSpaceOnUse">
            <Path d="M 22 0 L 0 0 0 22" fill="none" stroke={reportPaper.grid} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#report-paper-grid)" />
      </Svg>
      {/* 주 선택 동작은 기존 주 목록을 그대로 연다. 시안의 이전/다음 주 버튼은 추가하지 않는다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${range} · 주 고르기`}
        onPress={onOpenWeekPicker}
        style={styles.weekNav}
      >
        <View style={styles.weekTitleGroup}>
          <View
            testID="studio-report-week-title"
            style={[
              styles.weekTitlePaper,
              {
                backgroundColor: design["report.weekTitlePaper.backgroundColor"],
                paddingHorizontal: design["report.weekTitlePaper.paddingHorizontal"],
              },
            ]}
          >
            <Text
              variant="title3Hand"
              color={reportPaper.ink}
              style={[
                styles.weekTitle,
                {
                  fontSize: design["report.weekTitle.fontSize"],
                  lineHeight: Math.max(36, design["report.weekTitle.fontSize"] + 6) * fontScale,
                },
              ]}
            >
              {thisWeek ? "이번 주" : "이 주"}
            </Text>
          </View>
          <View style={styles.rangePaper}>
            <Text
              variant="label1"
              color={reportPaper.ink}
              style={[styles.range, { lineHeight: 22 * fontScale }]}
            >
              {range}
            </Text>
          </View>
        </View>
        <View style={styles.pickerIcon}>
          <Icon name="calendar" size={20} color={reportPaper.ink} />
        </View>
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
            <View style={styles.summary}>
              <View style={styles.babaFrame}>
                <View style={styles.babaScaled}>
                  <Baba />
                </View>
              </View>
              <WeekMoodSummary report={report} />
            </View>
            <WeekEmotionCard report={report} thisWeek={thisWeek} writtenDates={writtenDates} />

            <View style={styles.section}>
              <Text
                variant="label1"
                color={labelColor.neutral}
                style={[styles.sectionLabel, { lineHeight: 26 * fontScale }]}
              >
                {thisWeek ? "이번 주 기록" : "이 주 기록"}
              </Text>
              <WeekCountList report={report} />
            </View>

            <WeekWishCard report={report} thisWeek={thisWeek} />

            <Button
              label={thisWeek ? "이번 주 기록 보기" : "이 주의 기록 보기"}
              variant="outlined"
              fill
              onPress={onOpenArchive}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: -layout.screenPadding,
    backgroundColor: reportPaper.paper,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.sm,
    minHeight: layout.minTouch,
    marginHorizontal: layout.screenPadding,
    marginTop: space.xs,
    marginBottom: 30,
  },
  weekTitleGroup: { alignItems: "flex-start", paddingBottom: 19 },
  weekTitlePaper: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: reportPaper.date,
    transform: [{ rotate: "-3deg" }],
  },
  weekTitle: { fontFamily: reportPaper.font.bold, fontSize: 30, lineHeight: 36 },
  rangePaper: {
    marginTop: -4,
    marginLeft: 14,
    paddingHorizontal: 12,
    paddingVertical: 1,
    backgroundColor: reportPaper.weekday,
    transform: [{ rotate: "-1deg" }],
  },
  range: { fontFamily: reportPaper.font.bold, fontSize: 16, lineHeight: 22 },
  pickerIcon: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1, minHeight: 0 },
  content: {
    gap: space.xl,
    paddingHorizontal: layout.screenPadding,
    paddingTop: space.xs,
    paddingBottom: space.xl,
  },
  summary: { flexDirection: "row", alignItems: "flex-start", minHeight: 124 },
  babaFrame: { width: 100, height: 124, overflow: "visible" },
  babaScaled: {
    position: "absolute",
    left: -37,
    top: -50,
    transform: [{ scale: 0.56 }, { rotate: "-6deg" }],
  },
  section: { gap: space.md },
  sectionLabel: {
    paddingLeft: space.xs,
    fontFamily: reportPaper.font.bold,
    fontSize: 20,
    lineHeight: 26,
    color: reportPaper.strong,
  },
  notice: { gap: space.sm },
  loading: { alignItems: "center", gap: space.md, paddingVertical: space.sm },
});
