import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { DayScheduleList } from "@/components/archive/DayScheduleList";
import { DiaryPreviewCard } from "@/components/archive/DiaryPreviewCard";
import { EmotionFilter } from "@/components/archive/EmotionFilter";
import {
  Calendar,
  Icon,
  IconButton,
  InfoBlock,
  SearchField,
  Text,
  ViewSwitcher,
  type CalendarMark,
  type ViewOption,
} from "@/components/ds";
import {
  background,
  emotion,
  homeV2,
  label as labelColor,
  layout,
  line,
  space,
  status,
  withAlpha,
} from "@/design/ds";
import type { Diary } from "@/features/diary/model/types";
import { approvedDesign, type StudioDesign } from "@/design/studioDesign";
import type { EmotionId } from "@/features/emotion/model/emotion";
import type { Schedule } from "@/features/home/model/types";
import { formatKoreanDateShort, formatKoreanMonth } from "@/lib/day";

export type ArchiveMode = "calendar" | "list";

const VIEWS: readonly ViewOption<ArchiveMode>[] = [
  { name: "calendar", icon: "calendar", accessibilityLabel: "달력으로 보기" },
  { name: "list", icon: "list", accessibilityLabel: "목록으로 보기" },
];

type Props = {
  design?: StudioDesign;
  month: string;
  selectedDate: string;
  selectedDiary: Diary | null;
  daySchedules: readonly Schedule[];
  monthly: readonly Diary[];
  listed: readonly Diary[];
  markOf: (date: string) => CalendarMark;
  view: ArchiveMode;
  filters: readonly EmotionId[];
  query: string;
  listMonthLabel: string;
  onViewChange: (next: ArchiveMode) => void;
  onSelectDate: (date: string) => void;
  onMonthStep: (step: -1 | 1) => void;
  onToggleFilter: (emotion: EmotionId) => void;
  onQueryChange: (query: string) => void;
  onOpenPeriod: () => void;
  onOpenDiary: (id: string) => void;
};

/** The app and Expo Lab render this same RN body; all data and side effects arrive as props. */
export function ArchiveView({
  design = approvedDesign,
  month,
  selectedDate,
  selectedDiary,
  daySchedules,
  monthly,
  listed,
  markOf,
  view,
  filters,
  query,
  listMonthLabel,
  onViewChange,
  onSelectDate,
  onMonthStep,
  onToggleFilter,
  onQueryChange,
  onOpenPeriod,
  onOpenDiary,
}: Props) {
  const emotionMarks = monthly
    .flatMap((diary) => (diary.emotions[0] == null ? [] : [diary.emotions[0]]))
    .slice(0, 3);

  return (
    <View testID="studio-archive-root" style={styles.root}>
      <View style={styles.header}>
        <View>
          <View
            testID="studio-archive-title"
            style={[
              styles.titleWrap,
              {
                backgroundColor: design["archive.titleWrap.backgroundColor"],
                paddingHorizontal: design["archive.titleWrap.paddingHorizontal"],
              },
            ]}
          >
            <Text
              testID="studio-archive-title-text"
              variant="title3Hand"
              color={labelColor.normal}
              style={[styles.title, { fontSize: design["archive.title.fontSize"] }]}
            >
              보관함
            </Text>
          </View>
          {view === "calendar" ? (
            <View style={styles.monthPaper}>
              <Text variant="label1" style={styles.monthLabel}>
                {formatKoreanMonth(month)}
              </Text>
            </View>
          ) : null}
        </View>
        {view === "calendar" ? (
          <View style={styles.monthActions}>
            <IconButton
              name="chevron-left"
              size={20}
              accessibilityLabel="이전 달"
              onPress={() => onMonthStep(-1)}
            />
            <IconButton
              name="chevron-right"
              size={20}
              accessibilityLabel="다음 달"
              onPress={() => onMonthStep(1)}
            />
          </View>
        ) : null}
      </View>

      {view === "calendar" ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View testID="studio-archive-calendar" style={styles.calendarPaper}>
            <View
              style={styles.tape}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Calendar
              month={month}
              selectedDate={selectedDate}
              onSelect={onSelectDate}
              onMonthStep={onMonthStep}
              markOf={markOf}
              dateSticker
              compactDateSticker
              showMonthControls={false}
            />
          </View>

          <View style={styles.dayScene}>
            <View style={styles.dayPaper}>
              {selectedDiary != null ? (
                <DiaryPreviewCard
                  diary={selectedDiary}
                  onOpen={onOpenDiary}
                  showOpenLink
                  embedded
                />
              ) : (
                <View style={styles.emptyDay}>
                  <Text variant="body2Reading" color={labelColor.neutral} style={styles.emptyText}>
                    {"이 날은 기록이 없어요.\n비어 있어도 괜찮은 날이에요."}
                  </Text>
                </View>
              )}
              {daySchedules.length > 0 ? (
                <View style={styles.scheduleSection}>
                  <Text variant="label1" color={status.negative} style={styles.scheduleLabel}>
                    일정
                  </Text>
                  <DayScheduleList
                    schedules={daySchedules}
                    title={`${formatKoreanDateShort(selectedDate)}의 일정`}
                    titleVariant="label1"
                    titleColor={labelColor.neutral}
                    showStatusDot
                  />
                </View>
              ) : null}
            </View>
            <Image
              source={require("../../../../assets/home/capybara-idle.png")}
              style={styles.baba}
              resizeMode="contain"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.listTop}>
            <SearchField
              value={query}
              onChangeText={onQueryChange}
              placeholder="일기 내용 검색"
              accessibilityLabel="일기 내용 검색"
            />
            <View style={styles.bleed}>
              <EmotionFilter selected={filters} onToggle={onToggleFilter} edgePadding={space.xl} />
            </View>
            <View style={styles.countRow}>
              <Text variant="body2" color={labelColor.neutral}>
                {`기록 ${listed.length}건`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`기간 선택, 지금 ${listMonthLabel}`}
                onPress={onOpenPeriod}
                hitSlop={space.sm}
                style={styles.scopeTrigger}
              >
                <Text variant="body2" color={labelColor.normal}>
                  {listMonthLabel}
                </Text>
                <Icon name="chevron-right" size={16} color={labelColor.assistive} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {listed.length === 0 ? (
              <InfoBlock style={styles.emptyDay}>
                <Text variant="body2Reading" color={labelColor.neutral} style={styles.emptyText}>
                  조건에 맞는 일기가 없어요.
                </Text>
              </InfoBlock>
            ) : (
              listed.map((diary) => (
                <DiaryPreviewCard key={diary.id} diary={diary} onOpen={onOpenDiary} />
              ))
            )}
          </ScrollView>
        </>
      )}

      <View style={styles.summaryDock}>
        <Text variant="label1" color={labelColor.normal} style={styles.summaryTitle}>
          {"이번 달\n기록"}
        </Text>
        <View style={styles.summaryCount}>
          {emotionMarks.map((emotionId, index) => (
            <View
              key={`${emotionId}-${index}`}
              style={[styles.emotionDot, { backgroundColor: emotion[emotionId] }]}
            />
          ))}
          <Text variant="label1" color={labelColor.normal}>{`${monthly.length}일`}</Text>
        </View>
        <ViewSwitcher options={VIEWS} active={view} onChange={onViewChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: -layout.screenPadding,
    paddingHorizontal: layout.screenPadding,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleWrap: {
    alignSelf: "flex-start",
    backgroundColor: background.splash,
    transform: [{ rotate: "-3deg" }],
    paddingHorizontal: 18,
    paddingVertical: 3,
  },
  title: { fontSize: 34 },
  monthPaper: {
    alignSelf: "flex-start",
    marginLeft: 14,
    marginTop: -4,
    backgroundColor: homeV2.color.weekday,
    paddingHorizontal: 14,
    paddingVertical: 2,
    transform: [{ rotate: "-1deg" }],
  },
  monthLabel: {
    fontFamily: homeV2.font.bold,
    fontSize: 18,
    lineHeight: 22,
    color: homeV2.color.ink,
  },
  monthActions: { flexDirection: "row", gap: 2 },
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: 18, paddingBottom: 24 },
  calendarPaper: {
    marginTop: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: background.elevated,
    shadowColor: labelColor.normal,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  tape: {
    position: "absolute",
    top: -9,
    alignSelf: "center",
    width: 90,
    height: 20,
    backgroundColor: withAlpha(background.splash, 0.7),
    transform: [{ rotate: "-2deg" }],
    zIndex: 1,
  },
  dayScene: { minHeight: 190 },
  dayPaper: {
    width: "72%",
    minWidth: 220,
    gap: 8,
    padding: 12,
    borderRadius: 20,
    backgroundColor: background.elevated,
    transform: [{ rotate: "-1deg" }],
    shadowColor: labelColor.normal,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  baba: { position: "absolute", width: 96, height: 140, right: -8, bottom: -8 },
  emptyDay: { padding: space.md },
  emptyText: { textAlign: "center" },
  scheduleSection: {
    borderTopWidth: 1,
    borderTopColor: line.neutral,
    borderStyle: "dashed",
    gap: 4,
    paddingTop: 8,
  },
  scheduleLabel: {
    alignSelf: "flex-start",
    backgroundColor: withAlpha(status.negative, 0.14),
    paddingHorizontal: 4,
  },
  listTop: { gap: space.md, paddingBottom: space.md },
  bleed: { marginHorizontal: -space.xl },
  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scopeTrigger: { flexDirection: "row", alignItems: "center", gap: space.xs },
  listContent: { gap: space.lg, paddingBottom: space.xl },
  summaryDock: {
    minHeight: 72,
    borderRadius: 24,
    backgroundColor: background.elevated,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    shadowColor: labelColor.normal,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryTitle: { textAlign: "center", lineHeight: 18 },
  summaryCount: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  emotionDot: { width: 13, height: 13, borderRadius: 7 },
});
