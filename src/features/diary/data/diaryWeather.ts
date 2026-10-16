import { currentUserId } from "@/features/auth/model/auth";
import { isServerId } from "@/features/diary/data/diaryApi";
import { clock } from "@/lib/clock";
import { authedRequest } from "@/lib/http";
import { locateRounded, requestLocationPermission, type RoundedPosition } from "@/lib/location";

export type WeatherResult =
  { kind: "ready"; weather: string } | { kind: "denied" | "unavailable" | "skipped" };

// 일기는 「묻고 → 위치」다(1.3.0 부터). 위치는 홈 날씨와 같은 `lib/location.ts` 를 지난다 —
// 모듈이 없는 옛 dev client 에서도 던지지 않아 일기 읽기를 막지 않는다.
async function locate(): Promise<RoundedPosition | { kind: "denied" }> {
  const permission = await requestLocationPermission();
  if (permission !== "granted") return { kind: permission };
  return locateRounded();
}

export async function recordDiaryWeather(id: string, date: string): Promise<WeatherResult> {
  if (!isServerId(id) || date !== clock.today()) return { kind: "skipped" };
  const userId = await currentUserId();
  if (userId == null) return { kind: "skipped" };
  const position = await locate();
  if (position.kind !== "located") return position;
  // 권한 창/위치 조회를 기다리는 동안 날짜나 로그인 사용자가 바뀔 수 있다.
  if (date !== clock.today() || (await currentUserId()) !== userId) return { kind: "skipped" };
  const result = await authedRequest<{ weather?: unknown }>(
    "PUT",
    `/api/v1/diaries/${id}/weather`,
    { latitude: position.latitude, longitude: position.longitude },
    { timeoutMs: 10_000 },
  );
  if ((await currentUserId()) !== userId) return { kind: "skipped" };
  if (!result.ok || typeof result.data?.weather !== "string" || result.data.weather.trim() === "") {
    return { kind: "unavailable" };
  }
  return { kind: "ready", weather: result.data.weather };
}
