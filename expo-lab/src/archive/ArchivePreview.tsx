import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  BottomNavigation,
  BottomSheet,
  EmotionSticker,
  Screen,
  Text,
  type CalendarMark,
} from "../../../src/components/ds";
import {
  background,
  label as labelColor,
  layout,
  scheduleDot,
  withAlpha,
} from "../../../src/design/ds";
import { byLatest, diariesInMonth } from "../../../src/features/archive/model/archive";
import { ArchiveView, type ArchiveMode } from "../../../src/features/archive/ui/ArchiveView";
import type { Diary } from "../../../src/features/diary/model/types";
import type { EmotionId } from "../../../src/features/emotion/model/emotion";
import type { Schedule } from "../../../src/features/home/model/types";
import { PreviewFontScaleContext } from "../../../src/components/ds/Text";
import { formatKoreanMonth } from "../../../src/lib/day";

export const archiveScenarios = [
  { id: "default", label: "기록·일정 있음" },
  { id: "empty-day", label: "선택 날짜 기록 없음" },
  { id: "empty-month", label: "이번 달 기록 없음" },
  { id: "list", label: "목록·검색·필터" },
] as const;

const MONTH = "2026-10";
const makeDiary = (day: number, body: string, emotion: EmotionId): Diary => ({
  id: `lab-diary-${day}`,
  date: `${MONTH}-${String(day).padStart(2, "0")}`,
  body,
  babaView: null,
  babaViewBasis: null,
  emotions: [emotion],
  authoredBy: "baba",
  editedAt: null,
  ordinal: day,
  retrospectId: null,
  storyEmotion: emotion,
  startEmotion: emotion,
  weather: null,
});

const DIARIES: Diary[] = [
  makeDiary(5, "친구랑 오랜만에 저녁을 먹었다. 웃을 일이 많았던 하루.", 1),
  makeDiary(9, "야근이 길었다. 그래도 집에 와서 차 한 잔 마신 게 좋았다.", 4),
  makeDiary(13, "잠깐 밖을 걸으며 마음이 조금 가벼워졌다.", 3),
];

const makeSchedule = (day: number, title: string, done: boolean): Schedule => ({
  id: `lab-schedule-${day}-${title}`,
  date: `${MONTH}-${String(day).padStart(2, "0")}`,
  title,
  time: null,
  source: "manual",
  externalId: null,
  done,
  doneAt: done ? `${MONTH}-${String(day).padStart(2, "0")}T10:00:00` : null,
  emotions: [],
  hidden: false,
});

const SCHEDULES: Schedule[] = [
  makeSchedule(13, "아침 산책 20분", true),
  makeSchedule(13, "도서관 책 반납하기", true),
  makeSchedule(14, "엄마한테 전화하기", false),
];

const TABS = [
  { name: "홈", label: "홈", icon: "home" },
  { name: "쉼터", label: "쉼터", icon: "heart" },
  { name: "보관함", label: "보관함", icon: "folder-job" },
  { name: "리포트", label: "리포트", icon: "document" },
  { name: "마이", label: "마이", icon: "nav-my-page" },
] as const;

function shiftedMonth(month: string, step: -1 | 1) {
  const next = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + step, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

export function ArchivePreview({
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
  const scenario = archiveScenarios.find((item) => item.id === scenarioId)?.id ?? "default";
  const [month, setMonth] = useState(MONTH);
  const [selectedDate, setSelectedDate] = useState(
    `${MONTH}-${scenario === "empty-day" ? "14" : "13"}`,
  );
  const [view, setView] = useState<ArchiveMode>(scenario === "list" ? "list" : "calendar");
  const [filters, setFilters] = useState<EmotionId[]>([]);
  const [query, setQuery] = useState("");
  const [listMonth, setListMonth] = useState<string | null>(MONTH);
  const [pickerOpen, setPickerOpen] = useState(false);
  const diaries = scenario === "empty-month" ? [] : DIARIES;
  const monthly = diariesInMonth(diaries, month);
  const selectedDiary = monthly.find((diary) => diary.date === selectedDate) ?? null;
  const daySchedules = SCHEDULES.filter((schedule) => schedule.date === selectedDate);
  const listSource = listMonth == null ? diaries : diariesInMonth(diaries, listMonth);
  const listed = byLatest(
    listSource.filter(
      (diary) =>
        (filters.length === 0 || filters.some((emotion) => diary.emotions.includes(emotion))) &&
        diary.body.includes(query.trim()),
    ),
  );
  const markOf = (date: string): CalendarMark => {
    const diary = monthly.find((item) => item.date === date);
    const schedule = SCHEDULES.some((item) => item.date === date);
    return {
      sticker: diary ? <EmotionSticker id={diary.emotions[0] ?? null} /> : undefined,
      label: diary ? "기록 있음" : schedule ? "일정 있음" : undefined,
      dotColor: schedule ? withAlpha(scheduleDot, 0.8) : undefined,
    };
  };

  return (
    <PreviewFontScaleContext.Provider value={fontScale}>
      <View style={styles.root}>
        <Screen padded={false} edges={[]}>
          <View style={styles.body}>
            <ArchiveView
              design={design}
              month={month}
              selectedDate={selectedDate}
              selectedDiary={selectedDiary}
              daySchedules={daySchedules}
              monthly={monthly}
              listed={listed}
              markOf={markOf}
              view={view}
              filters={filters}
              query={query}
              listMonthLabel={listMonth == null ? "전체 보기" : formatKoreanMonth(listMonth)}
              onViewChange={setView}
              onSelectDate={setSelectedDate}
              onMonthStep={(step) => {
                const next = shiftedMonth(month, step);
                setMonth(next);
                setSelectedDate(`${next}-01`);
              }}
              onToggleFilter={(emotion) =>
                setFilters((current) =>
                  current.includes(emotion)
                    ? current.filter((item) => item !== emotion)
                    : [...current, emotion],
                )
              }
              onQueryChange={setQuery}
              onOpenPeriod={() => setPickerOpen(true)}
              onOpenDiary={(id) => onMessage(`${id} 기록 이동은 Lab Mock입니다.`)}
            />
          </View>
          <BottomNavigation
            items={TABS}
            active="보관함"
            onPress={(tab) => onMessage(`${tab} 탭 이동은 Lab Mock입니다.`)}
          />
          <View style={styles.underTab} />
        </Screen>
        {pickerOpen ? (
          <BottomSheet onDismiss={() => setPickerOpen(false)}>
            <ScrollView style={{ maxHeight: 260 }}>
              {[null, MONTH].map((option) => (
                <Pressable
                  key={option ?? "all"}
                  onPress={() => {
                    setListMonth(option);
                    setPickerOpen(false);
                  }}
                  style={styles.option}
                >
                  <Text variant="body2" color={labelColor.strong}>
                    {option ? formatKoreanMonth(option) : "전체 보기"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </BottomSheet>
        ) : null}
      </View>
    </PreviewFontScaleContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0, paddingHorizontal: layout.screenPadding },
  underTab: { height: layout.minBottomInset, backgroundColor: background.alternative },
  option: { padding: 16 },
});
