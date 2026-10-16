import type { HomeWeather } from "../../../src/features/home/model/weather";
import type { InboxNotification } from "../../../src/features/notifications/data/inboxApi";
import type { InboxStatus } from "../../../src/features/notifications/model/inbox";

export const weatherScenarios = [
  { id: "none", label: "데이터 없음", code: null },
  { id: "sunny", label: "맑음", code: "clear.day" },
  { id: "cloudy", label: "흐림", code: "cloudy" },
  { id: "rainy", label: "비", code: "rain.heavy" },
  { id: "snowy", label: "눈", code: "snow" },
  { id: "thunder", label: "뇌우", code: "rain.showers.thunder.day" },
  { id: "windy", label: "바람", code: "fair.day" },
  { id: "night", label: "야간 맑음 · 스티커 없음", code: "clear.night" },
  { id: "unmapped", label: "미매핑 · 스티커 없음", code: "unknown.condition" },
  { id: "loading", label: "조회 중 · 스티커 없음", code: null },
  { id: "error", label: "조회 실패 · 스티커 없음", code: null },
] as const;

export type WeatherScenarioId = (typeof weatherScenarios)[number]["id"];

export function weatherForScenario(id: WeatherScenarioId): HomeWeather | null {
  const scenario = weatherScenarios.find((item) => item.id === id);
  if (scenario?.code == null) return null;
  const code = scenario.code;
  const family = code.split(".")[0] ?? code;
  return {
    condition: {
      code,
      family,
      intensity: code.includes("heavy") ? "heavy" : null,
      showers: code.includes("showers"),
      thunder: code.includes("thunder"),
      daylight: code.endsWith("night") ? "night" : code.endsWith("day") ? "day" : null,
      windy: id === "windy",
    },
    label: scenario.label.split(" · ")[0]!,
    temperatureC: id === "snowy" ? -2 : 22,
    forecastTime: "2026-10-14T09:00:00+09:00",
    updatedAt: "2026-10-14T09:00:00+09:00",
    source: "MET Norway",
  };
}

export const inboxScenarios = [
  { id: "empty", label: "알림 없음" },
  { id: "unread", label: "읽지 않은 알림" },
  { id: "read", label: "모두 읽음" },
  { id: "loading", label: "조회 중" },
  { id: "error", label: "조회 실패" },
  { id: "long", label: "긴 제목·본문" },
] as const;

export type InboxScenarioId = (typeof inboxScenarios)[number]["id"];

const item = (
  id: string,
  title: string,
  body: string,
  readAt: string | null,
): InboxNotification => ({
  id,
  type: "GENERAL_NOTICE",
  kind: "notice",
  title,
  body,
  createdAt: "2026-10-14T09:00:00+09:00",
  readAt,
  link: null,
});

export function inboxForScenario(id: InboxScenarioId): {
  status: InboxStatus;
  items: InboxNotification[];
} {
  if (id === "loading") return { status: "loading", items: [] };
  if (id === "error") return { status: "failed", items: [] };
  if (id === "empty") return { status: "ready", items: [] };
  if (id === "long")
    return {
      status: "ready",
      items: [
        item(
          "long",
          "새로운 소식을 전해 드립니다. 긴 제목이 좁은 화면과 큰 글씨에서도 읽히는지 확인하는 알림입니다.",
          "알림 본문도 여러 줄로 길어질 수 있습니다. 작은 화면에서 잘림과 스크롤을 확인하고, 항목을 눌러 펼친 뒤 다시 접을 수 있는지 살펴보세요.",
          null,
        ),
      ],
    };
  const readAt = id === "read" ? "2026-10-14T10:00:00+09:00" : null;
  return {
    status: "ready",
    items: [item("notice-1", "오늘의 소식", "모멘토리의 새 소식을 확인해 주세요.", readAt)],
  };
}
