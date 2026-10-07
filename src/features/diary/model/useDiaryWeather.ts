import { useEffect, useState } from "react";

import { isServerId } from "@/features/diary/data/diaryApi";
import { recordDiaryWeather, type WeatherResult } from "@/features/diary/data/diaryWeather";
import { useDiary } from "@/features/diary/model/diary";
import { clock } from "@/lib/clock";

export function useDiaryWeather(
  id: string | null | undefined,
  date: string | undefined,
  saved: string | null = null,
) {
  const key = `${id}:${date}`;
  const eligible = !!id && isServerId(id) && !!date && !saved && date === clock.today();
  const [settled, setSettled] = useState<{ key: string; result: WeatherResult } | null>(null);
  useEffect(() => {
    if (!eligible || !id || !date) return;
    let active = true;
    void recordDiaryWeather(id, date)
      .then((result) => {
        if (!active) return;
        setSettled({ key, result });
        if (result.kind === "ready") {
          useDiary.setState((state) => ({
            diaries: state.diaries.map((diary) =>
              diary.id === id && !diary.weather ? { ...diary, weather: result.weather } : diary,
            ),
          }));
        }
      })
      .catch(() => {
        if (active) setSettled({ key, result: { kind: "unavailable" } });
      });
    return () => {
      active = false;
    };
  }, [id, date, key, eligible]);
  const result = settled?.key === key ? settled.result : null;
  const weather = saved ?? (result?.kind === "ready" ? result.weather : null);
  const status =
    weather || !eligible
      ? null
      : !result
        ? "날씨 확인 중"
        : result.kind === "denied"
          ? "위치 권한 꺼짐"
          : result.kind === "unavailable"
            ? "날씨 확인 못함"
            : null;
  return { weather, status };
}
