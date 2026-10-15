import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { BottomNavigation } from "../../../src/components/ds/BottomNavigation";
import { Button } from "../../../src/components/ds/Button";
import { Screen } from "../../../src/components/ds/Screen";
import { Text } from "../../../src/components/ds/Text";
import { background, label as labelColor, layout, space } from "../../../src/design/ds";
import type { Schedule } from "../../../src/features/home/model/types";
import { HomeView } from "../../../src/features/home/ui/HomeView";
import { weekDays, weekEnd } from "../../../src/features/report/model/report";
import { claudeHomeScenarios } from "../claude-home/scenarios";

const TODAY = "2026-10-14";
const WEEK = weekDays([], "2026-10-11", weekEnd("2026-10-11"));
const TABS = [
  { name: "홈", label: "홈", icon: "home" },
  { name: "쉼터", label: "쉼터", icon: "heart" },
  { name: "보관함", label: "보관함", icon: "folder-job" },
  { name: "리포트", label: "리포트", icon: "document" },
  { name: "마이", label: "마이", icon: "nav-my-page" },
] as const;

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

/** Isolated data/action adapter. Never mounts the app's provider, route or network stores. */
export function CurrentHomeMockPreview({
  scenarioId,
  onMessage,
  scale = 1,
}: {
  scenarioId: string;
  onMessage: (message: string) => void;
  scale?: number;
}) {
  const rootRef = useRef<View>(null);
  const [schedules, setSchedules] = useState<Schedule[]>(() => fixture(scenarioId));
  const [editing, setEditing] = useState<{ id: string | null; title: string } | null>(null);
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
  const save = () => {
    if (editing == null) return;
    const title = editing.title.trim();
    if (!title) return;
    if (editing.id == null) {
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
        current.map((schedule) => (schedule.id === editing.id ? { ...schedule, title } : schedule)),
      );
    }
    setEditing(null);
    onMessage("Lab Mock 일정만 변경했습니다. API 요청은 보내지 않았습니다.");
  };

  return (
    <View ref={rootRef} style={styles.root}>
      <HomeView
        model={{ today: TODAY, schedules, week: WEEK, retroReminderTime: null }}
        actions={{
          onToggleDone: (id) =>
            setSchedules((current) =>
              current.map((schedule) =>
                schedule.id === id
                  ? {
                      ...schedule,
                      done: !schedule.done,
                      doneAt: schedule.done ? null : `${TODAY}T09:00:00.000Z`,
                      emotions: [],
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
            if (schedule) setEditing({ id, title: schedule.title });
          },
          onAddSchedule: () => setEditing({ id: null, title: "" }),
          onStartReflection: () => onMessage("회고 진입은 Lab Mock 액션입니다."),
          onOpenNotificationSettings: () => onMessage("알림 설정은 Lab에 연결하지 않았습니다."),
        }}
        renderFrame={(body, overlay) => (
          <>
            <Screen padded={false} edges={[]}>
              <View style={styles.body}>{body}</View>
              <BottomNavigation
                items={TABS}
                active="홈"
                onPress={(tab) => onMessage(`${tab} 탭은 아직 실제 UI로 이전하지 않았습니다.`)}
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
      {editing != null ? (
        <View style={styles.editor}>
          <Pressable
            accessibilityLabel="일정 입력 닫기"
            accessibilityRole="button"
            onPress={() => setEditing(null)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.editorCard}>
            <Text variant="headline1" color={labelColor.strong}>
              {editing.id == null ? "일정 추가" : "일정 수정"}
            </Text>
            <TextInput
              accessibilityLabel="일정 제목"
              autoFocus
              value={editing.title}
              onChangeText={(title) => setEditing({ ...editing, title })}
              onSubmitEditing={save}
              style={styles.input}
            />
            <View style={styles.editorButtons}>
              <Button label="취소" variant="text" size="small" onPress={() => setEditing(null)} />
              <Button label="저장" variant="text" size="small" onPress={save} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0, paddingHorizontal: layout.screenPadding },
  underTab: { height: layout.minBottomInset, backgroundColor: background.elevated },
  editor: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center",
    paddingHorizontal: layout.screenPadding,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  editorCard: {
    padding: space.xl,
    gap: space.md,
    borderRadius: 16,
    backgroundColor: background.elevated,
  },
  input: {
    minHeight: layout.minTouch,
    borderBottomWidth: 1,
    borderColor: labelColor.alternative,
    fontSize: 18,
    color: labelColor.normal,
  },
  editorButtons: { flexDirection: "row", justifyContent: "flex-end", gap: space.md },
});
