import { currentUserId } from "@/features/auth/model/auth";
import { isServerId } from "@/features/diary/data/diaryApi";
import { clock } from "@/lib/clock";
import { authedRequest } from "@/lib/http";

export type WeatherResult =
  { kind: "ready"; weather: string } | { kind: "denied" | "unavailable" | "skipped" };

// 앱을 재빌드하기 전의 dev client에서도 일기 읽기를 막지 않는다.
async function locate() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const location: typeof import("expo-location") = require("expo-location");
    const permission = await location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { kind: "denied" } as const;
    if (!(await location.hasServicesEnabledAsync())) return { kind: "unavailable" } as const;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const position = await Promise.race([
        location.getCurrentPositionAsync({ accuracy: location.Accuracy.Balanced }),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), 12_000);
        }),
      ]);
      if (position == null) return { kind: "unavailable" } as const;
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        return { kind: "unavailable" } as const;
      return {
        kind: "located",
        latitude: Math.round(latitude * 100) / 100,
        longitude: Math.round(longitude * 100) / 100,
      } as const;
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    return { kind: "unavailable" } as const;
  }
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
