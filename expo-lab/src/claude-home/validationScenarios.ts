import type { HomeWeather } from "../../../src/features/home/model/weather";

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

export const letterScenarios = [
  { id: "none", label: "새 편지 없음" },
  { id: "unread", label: "새 편지 있음" },
] as const;

export type LetterScenarioId = (typeof letterScenarios)[number]["id"];
