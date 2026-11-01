import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { BottomNavigation } from "../../../src/components/ds/BottomNavigation";
import { PreviewTabScreen as Screen } from "../backgrounds/PreviewTabScreen";
import { TabPaperBackground } from "../../../src/components/ds/TabPaperBackground";
import { PreviewFontScaleContext } from "../../../src/components/ds/Text";
import { WeekPickerSheet } from "../../../src/components/report/WeekPickerSheet";
import { background, layout } from "../../../src/design/ds";
import type { WeeklyReport, WeekOption } from "../../../src/features/report/model/weeklyReport";
import { ReportView } from "../../../src/features/report/ui/ReportView";

export const reportScenarios = [
  { id: "default", label: "이번 주 · 기본" },
  { id: "empty", label: "기록 없는 주" },
  { id: "loading", label: "불러오는 중" },
  { id: "error", label: "불러오기 오류" },
  { id: "past-week", label: "지난 주" },
  { id: "long-copy", label: "긴 요약·바람 문구" },
] as const;

const THIS_WEEK = "2026-10-11";
const PAST_WEEK = "2026-10-04";

const reportFor = (startDate: string, endDate: string): WeeklyReport => ({
  startDate,
  endDate,
  days: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-10-${String(Number(startDate.slice(-2)) + i).padStart(2, "0")}`,
    emotion: i === 1 ? 1 : i === 3 ? 3 : null,
    emotions: i === 1 ? [1] : i === 3 ? [3] : [],
  })),
  dominantEmotion: 1,
  moodMessage: "기쁜 마음을 가장 많이 느꼈어요. 그 마음을 이어가 보세요.",
  scheduleTotal: 4,
  scheduleCompleted: 2,
  actionCardCreated: 2,
  actionCardCompleted: 1,
  needs: [{ word: "휴식", count: 2 }],
  practicedWishes: [{ action: "잠깐 산책하기", needs: ["휴식"] }],
  diaryCount: 2,
});

const DEFAULT_REPORT = reportFor(THIS_WEEK, "2026-10-17");
const PAST_REPORT = reportFor(PAST_WEEK, "2026-10-10");
const EMPTY_REPORT: WeeklyReport = {
  ...DEFAULT_REPORT,
  days: DEFAULT_REPORT.days.map((day) => ({ ...day, emotion: null, emotions: [] })),
  dominantEmotion: null,
  moodMessage: "아직 기록된 마음이 없어요.",
  scheduleTotal: 0,
  scheduleCompleted: 0,
  actionCardCreated: 0,
  actionCardCompleted: 0,
  needs: [],
  practicedWishes: [],
  diaryCount: 0,
};
const LONG_REPORT: WeeklyReport = {
  ...DEFAULT_REPORT,
  moodMessage:
    "이번 주에는 기쁜 마음과 차분한 마음이 번갈아 찾아와서 하루마다 서로 다른 장면을 남겼어요. 마음에 남은 장면을 천천히 떠올리며 다음 주에도 나에게 맞는 쉼을 찾아 보세요.",
  needs: [{ word: "아무 걱정 없이 충분히 쉬는 하루", count: 2 }],
  practicedWishes: [
    {
      action: "하루 동안 바빴던 일들을 잠시 내려놓고 가까운 공원 길을 천천히 걸으며 숨 고르기",
      needs: ["아무 걱정 없이 충분히 쉬는 하루"],
    },
  ],
};

const WEEKS: readonly WeekOption[] = [
  {
    weekStart: THIS_WEEK,
    name: "2026년 10월 2주차",
    range: "10월 11일 ~ 10월 17일",
    diaryCount: 2,
    thisWeek: true,
  },
  {
    weekStart: PAST_WEEK,
    name: "2026년 10월 1주차",
    range: "10월 4일 ~ 10월 10일",
    diaryCount: 2,
    thisWeek: false,
  },
];
const TABS = [
  { name: "홈", label: "홈", icon: "home" },
  { name: "쉼터", label: "쉼터", icon: "heart" },
  { name: "보관함", label: "보관함", icon: "folder-job" },
  { name: "리포트", label: "리포트", icon: "document" },
  { name: "마이", label: "마이", icon: "nav-my-page" },
] as const;

/** 서버·일기 Store·라우터 대신 고정 데이터와 이 컴포넌트의 메모리만 사용한다. */
export function ReportPreview({
  design,
  scenarioId,
  fontScale = 1,
  onMessage,
}: {
  design?: import("../../../src/design/studioDesign").StudioDesign;
  scenarioId: string;
  fontScale?: 1 | 1.3 | 1.5;
  onMessage: (message: string) => void;
}) {
  const scenario = reportScenarios.find((item) => item.id === scenarioId)?.id ?? "default";
  const [weekStart, setWeekStart] = useState(scenario === "past-week" ? PAST_WEEK : THIS_WEEK);
  const [picking, setPicking] = useState(false);
  const thisWeek = weekStart === THIS_WEEK;
  const report =
    scenario === "loading" || scenario === "error"
      ? null
      : !thisWeek
        ? PAST_REPORT
        : scenario === "empty"
          ? EMPTY_REPORT
          : scenario === "long-copy"
            ? LONG_REPORT
            : DEFAULT_REPORT;
  const range = thisWeek ? WEEKS[0]!.range : WEEKS[1]!.range;
  const writtenDates = new Set(
    scenario === "empty" || report == null ? [] : [report.days[1]!.date, report.days[3]!.date],
  );
  const weeks = scenario === "empty" ? [{ ...WEEKS[0]!, diaryCount: 0 }, WEEKS[1]!] : WEEKS;

  return (
    <PreviewFontScaleContext.Provider value={fontScale}>
      <View style={styles.root}>
        <Screen
          proportional
          padded={false}
          edges={[]}
          grid={false}
          backdrop={<TabPaperBackground tab="리포트" />}
        >
          <View style={styles.body}>
            <ReportView
              design={design}
              range={range}
              report={report}
              status={scenario === "error" ? "failed" : report == null ? "loading" : "ready"}
              thisWeek={thisWeek}
              writtenDates={writtenDates}
              onOpenWeekPicker={() => setPicking(true)}
              onOpenArchive={() => onMessage(`${weekStart} 기록 보기는 Lab Mock입니다.`)}
            />
          </View>
          <BottomNavigation
            items={TABS}
            active="리포트"
            onPress={(tab) => onMessage(`${tab} 탭 이동은 Lab Mock입니다.`)}
          />
          <View style={styles.underTab} />
        </Screen>
        {picking ? (
          <WeekPickerSheet
            weeks={weeks}
            weekStart={weekStart}
            onSelect={(week) => {
              setWeekStart(week);
              setPicking(false);
            }}
            onDismiss={() => setPicking(false)}
          />
        ) : null}
      </View>
    </PreviewFontScaleContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0, paddingHorizontal: layout.screenPadding },
  underTab: { height: layout.minBottomInset, backgroundColor: background.tabBar },
});
