import { useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { BottomNavigation } from "../../../src/components/ds/BottomNavigation";
import { Screen } from "../../../src/components/ds/Screen";
import { PreviewFontScaleContext } from "../../../src/components/ds/Text";
import { background, layout } from "../../../src/design/ds";
import type { Schedule } from "../../../src/features/home/model/types";
import { ScheduleEditBar } from "../../../src/features/home/ui/ScheduleEditBar";
import { toHomeWeatherView } from "../../../src/features/home/ui/v2/weatherStickers";
import { weekDays, weekEnd, type WeekDay } from "../../../src/features/report/model/report";
import { HomeV2View } from "../../../src/features/home/ui/v2/HomeV2View";
import { claudeHomeScenarios } from "./scenarios";
import {
  weatherForScenario,
  type LetterScenarioId,
  type WeatherScenarioId,
} from "./validationScenarios";

/**
 * **운영판 v2** 변형 — 앱의 공유 뷰(`HomeV2View`)를 Lab Mock 으로 그린다(계획 §6 P2).
 *
 * Lab 어댑터다: 일정·날씨·편지 시나리오를 뷰의 Props 로 바꾸고, 행동은 이 컴포넌트 안의 상태만 바꾼다.
 * **앱의 store · API · 라우터 · 계측을 import 하지 않는다**(`current-home/MockPreview.tsx` 선례).
 * 운영 앱에서 이 파일을 import 하지 않는다 — 린터가 막는다(`eslint.config.js`).
 *
 * - 날씨 매핑은 운영 컴포넌트를 공유하고, 서버 없이 Mock 데이터만 주입한다
 * - 편지는 점 있음 · 없음만 고르고, 아이콘을 누르면 안내 한 줄만 띄운다
 * - 탭바는 글로벌 DS 의 것(앱의 `TabScreen` 과 같은 `BottomNavigation`) — v2 의 종이 탭바를 쓰지 않는다
 * - 이번 주 감정: 도크 시나리오(5d~5h)는 **세 가지 날**(감정 · 일기만 · 기록 없음)을 함께 보이고,
 *   나머지는 기록이 없는 주(일곱 칸 모두 빈 조약돌)를 보인다 — DN-1 의 두 빈 칸을 나란히 대조한다
 */
export type HomeV2PreviewProps = {
  design?: import("../../../src/design/studioDesign").StudioDesign;
  scenarioId: string;
  onMessage: (message: string) => void;
  scale?: number;
  weatherId?: WeatherScenarioId;
  letterId?: LetterScenarioId;
  fontScale?: 1 | 1.3 | 1.5;
};

const TODAY = "2026-10-14";
const WEEK_START = "2026-10-11";
const TABS = [
  { name: "홈", label: "홈", icon: "home" },
  { name: "쉼터", label: "쉼터", icon: "heart" },
  { name: "보관함", label: "보관함", icon: "folder-job" },
  { name: "리포트", label: "리포트", icon: "document" },
  { name: "마이", label: "마이", icon: "nav-my-page" },
] as const;

const EMPTY_WEEK = weekDays([], WEEK_START, weekEnd(WEEK_START));
/** 일 = 행복함 · 월 = 불안함 · 우울함 · 화 = 일기만(감정 없음) · 수(오늘) = 평온함 · 목~토 = 기록 없음 */
const MIXED_WEEK: WeekDay[] = EMPTY_WEEK.map((day) => {
  if (day.label === "일") return { ...day, emotions: [1], written: true };
  if (day.label === "월") return { ...day, emotions: [7, 8], written: true };
  if (day.label === "화") return { ...day, emotions: [], written: true };
  if (day.label === "수") return { ...day, emotions: [3], written: true };
  return day;
});

function fixture(scenarioId: string): Schedule[] {
  const scenario =
    claudeHomeScenarios.find((item) => item.id === scenarioId) ?? claudeHomeScenarios[0]!;
  return scenario.tasks.map((task, index) => ({
    id: task.id,
    date: TODAY,
    title: task.title,
    time: null,
    source: index === 1 ? "calendar" : "manual",
    externalId: index === 1 ? `mock-calendar-${task.id}` : null,
    done: task.done,
    doneAt: task.done ? `${TODAY}T09:00:00.000Z` : null,
    emotions: [],
    hidden: false,
  }));
}

export function HomeV2Preview({
  design,
  scenarioId,
  onMessage,
  scale = 1,
  weatherId = "none",
  letterId = "none",
  fontScale = 1,
}: HomeV2PreviewProps) {
  const rootRef = useRef<View>(null);
  const scenario =
    claudeHomeScenarios.find((item) => item.id === scenarioId) ?? claudeHomeScenarios[0]!;
  const [schedules, setSchedules] = useState<Schedule[]>(() => fixture(scenarioId));
  const [editor, setEditor] = useState<{ id: string | null; title: string } | null>(null);
  const weather = weatherForScenario(weatherId);
  const weatherView = toHomeWeatherView(weather);

  const visible = schedules.filter((schedule) => !schedule.hidden);

  const reorder = (id: string, toIndex: number) => {
    setSchedules((current) => {
      const shown = current.filter((schedule) => !schedule.hidden);
      const from = shown.findIndex((schedule) => schedule.id === id);
      if (from < 0 || toIndex < 0 || toIndex >= shown.length || from === toIndex) return current;
      const moved = [...shown];
      moved.splice(toIndex, 0, moved.splice(from, 1)[0]!);
      let index = 0;
      return current.map((schedule) => (schedule.hidden ? schedule : moved[index++]!));
    });
  };

  return (
    <PreviewFontScaleContext.Provider value={Platform.OS === "web" ? fontScale : 1}>
      <View ref={rootRef} style={styles.root}>
        <HomeV2View
          design={design}
          model={{
            today: TODAY,
            schedules,
            week: scenario.showWeekDock ? MIXED_WEEK : EMPTY_WEEK,
            retroReminderTime: "21:30",
            weather: weatherView,
            hasUnreadLetter: letterId === "unread",
          }}
          actions={{
            onToggleDone: (id) =>
              setSchedules((current) =>
                current.map((schedule) =>
                  schedule.id === id
                    ? {
                        ...schedule,
                        done: !schedule.done,
                        doneAt: schedule.done ? null : `${TODAY}T09:00:00.000Z`,
                      }
                    : schedule,
                ),
              ),
            onMove: (id, direction) => {
              const at = visible.findIndex((schedule) => schedule.id === id);
              reorder(id, at + (direction === "up" ? -1 : 1));
            },
            onReorder: reorder,
            onHideCalendarSchedule: (id) =>
              setSchedules((current) =>
                current.map((schedule) =>
                  schedule.id === id ? { ...schedule, hidden: true } : schedule,
                ),
              ),
            onDeleteManualSchedule: (id) =>
              setSchedules((current) => current.filter((schedule) => schedule.id !== id)),
            onEditManualSchedule: (id) => {
              const schedule = schedules.find((item) => item.id === id);
              if (schedule != null) setEditor({ id, title: schedule.title });
            },
            onAddSchedule: () => setEditor({ id: null, title: "" }),
            onStartReflection: () => onMessage("회고 진입은 Lab Mock 액션입니다."),
            onOpenLetter: () => onMessage("바바의 편지는 Lab에 연결하지 않았습니다."),
            onOpenNotificationSettings: () => onMessage("알림 설정은 Lab에 연결하지 않았습니다."),
            onOpenWeatherInfo: () => onMessage("날씨 출처 시트는 운영 앱에서 확인합니다."),
          }}
          renderFrame={(body, overlay) => (
            <>
              <Screen padded={false} edges={[]}>
                <View style={styles.body}>{body}</View>
                <BottomNavigation
                  items={TABS}
                  active="홈"
                  onPress={(tab) => onMessage(`${tab} 탭은 미리보기 전용입니다.`)}
                />
                <View style={styles.underTab} />
              </Screen>
              {overlay}
            </>
          )}
          menuTopFromPageY={(pageY) =>
            new Promise<number>((resolve) => {
              if (rootRef.current == null) {
                resolve(pageY / scale);
                return;
              }
              rootRef.current.measureInWindow((_, y) => {
                resolve((pageY - y) / scale);
              });
            })
          }
          menuBottomInset={layout.tabBar + layout.minBottomInset}
        />
        {editor != null ? (
          <View style={StyleSheet.absoluteFill}>
            <ScheduleEditBar
              key={editor.id ?? "new"}
              mode={editor.id == null ? "add" : "edit"}
              initialTitle={editor.title}
              caption={editor.id == null ? "Lab Mock 일정 추가" : "Lab Mock 일정 수정"}
              onDismiss={() => setEditor(null)}
              onSubmit={(title) => {
                if (editor.id == null) {
                  setSchedules((current) => [
                    ...current,
                    {
                      id: `lab-${Date.now()}`,
                      date: TODAY,
                      title,
                      time: null,
                      source: "manual",
                      externalId: null,
                      done: false,
                      doneAt: null,
                      emotions: [],
                      hidden: false,
                    },
                  ]);
                } else {
                  setSchedules((current) =>
                    current.map((item) => (item.id === editor.id ? { ...item, title } : item)),
                  );
                }
                setEditor(null);
              }}
            />
          </View>
        ) : null}
      </View>
    </PreviewFontScaleContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0, paddingHorizontal: layout.screenPadding },
  underTab: { height: layout.minBottomInset, backgroundColor: background.elevated },
});
