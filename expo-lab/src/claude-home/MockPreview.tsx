import { useState } from "react";

import type { ClaudeHomeTask, ClaudeWeather } from "./HomeView";
import { claudeHomeScenarios } from "./scenarios";
import type { HomeVariant } from "./variants";

const weathers: ClaudeWeather[] = ["sunny", "cloudy", "rainy", "snowy", "thunder", "windy"];

/** Lab adapter only: never import this from the production app. */
export function ClaudeHomeMockPreview({
  scenarioId,
  variant,
  onMessage,
}: {
  scenarioId: string;
  variant: Extract<HomeVariant, { kind: "design" }>;
  onMessage: (message: string) => void;
}) {
  const scenario =
    claudeHomeScenarios.find((item) => item.id === scenarioId) ?? claudeHomeScenarios[0]!;
  const [tasks, setTasks] = useState<ClaudeHomeTask[]>(() =>
    scenario.tasks.map((task) => ({ ...task })),
  );
  const [weather, setWeather] = useState<ClaudeWeather>("sunny");
  const Screen = variant.Screen;

  return (
    <Screen
      gridPhaseY={4}
      model={{
        date: "10월 14일",
        weekday: "수요일",
        tasks,
        weather,
        showWeekDock: scenario.showWeekDock,
        unreadNotifications: true,
      }}
      actions={{
        onToggleTask: (id) =>
          setTasks((current) =>
            current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
          ),
        onAddTask: () => {
          setTasks((current) => [
            ...current,
            { id: `mock-${current.length}`, title: "새 일정", time: "21:00", done: false },
          ]);
          onMessage("Lab Mock 일정만 추가했습니다.");
        },
        onCycleWeather: () =>
          setWeather(
            (current) => weathers[(weathers.indexOf(current) + 1) % weathers.length] ?? "sunny",
          ),
        onStartReflection: () => onMessage("회고 진입은 Lab Mock 액션입니다."),
        onOpenNotifications: () => onMessage("알림은 연결하지 않았습니다."),
        onSelectTab: (tab) => onMessage(`${tab} 탭은 미리보기 전용입니다.`),
      }}
    />
  );
}
