import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { NotchedTapeLabel } from "@/components/ds/NotchedTapeLabel";
import { Button, Card, Icon, Spinner, Text } from "@/components/ds";
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
  return (
    <View testID="studio-report-root" style={styles.root}>
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
                paddingHorizontal: design["report.weekTitlePaper.paddingHorizontal"],
                borderRadius: design["report.weekTitlePaper.borderRadius"],
              },
            ]}
          >
            <MaskingTape color={design["report.weekTitlePaper.backgroundColor"]} />
            <Text
              testID="studio-report-week-text"
              variant="title3Hand"
              color={design["report.weekTitle.color"]}
              style={[
                styles.weekTitle,
                {
                  fontSize: design["report.weekTitle.fontSize"],
                  lineHeight: Math.max(36, design["report.weekTitle.fontSize"] + 6),
                  fontFamily: design["report.weekTitle.fontFamily"],
                  letterSpacing: design["report.weekTitle.letterSpacing"],
                },
              ]}
            >
              {thisWeek ? "이번 주" : "이 주"}
            </Text>
          </View>
          <NotchedTapeLabel testID="report-date-tape" style={styles.rangePaper}>
            {range}
          </NotchedTapeLabel>
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
            <View
              testID="studio-report-summary"
              style={[styles.summary, { minHeight: design["report.summary.minHeight"] }]}
            >
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
                style={[styles.sectionLabel, { lineHeight: 26 }]}
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
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.sm,
    minHeight: layout.minTouch,
    marginHorizontal: layout.screenPadding,
    marginBottom: 30,
  },
  weekTitleGroup: { flex: 1, minWidth: 0, alignItems: "flex-start", paddingBottom: 19 },
  weekTitlePaper: {
    paddingHorizontal: 18,
    paddingVertical: 3,
    transform: [{ rotate: "-3deg" }],
  },
  weekTitle: { fontFamily: reportPaper.font.bold, fontSize: 34, lineHeight: 40 },
  rangePaper: {
    marginTop: -4,
    marginLeft: 14,
    transform: [{ rotate: "-1deg" }],
  },
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
