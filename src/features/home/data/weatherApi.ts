import { authedRequest } from "@/lib/http";
import { isValidCoordinate, roundCoordinate } from "@/lib/location";

import { toHomeWeather, type HomeWeather } from "../model/weather";

/**
 * 홈 「지금 있는 곳의 날씨」 조회 — BE `dev` d77d023 계약 기준.
 *
 * `CurrentWeatherController` · `CurrentWeatherRequest/Response` 및 BE OpenAPI 테스트와 대조했다.
 * FE `docs/api/openapi.json` 은 아직 이전 스냅샷이며 운영 배포는 미확인이다.
 * 운영 홈의 `useHomeWeather`가 이 어댑터를 부른다. 호출자의 사용자 ID를 토큰 조회까지 전달한다.
 *
 * - **좌표는 본문에만 싣는다(WX-2).** 쿼리스트링은 접근 로그 · 프록시에 남기 쉽다 — 경로는 상수이고
 *   쿼리를 만들지 않는다. 조회지만 `POST` 인 이유가 이것이다.
 * - 보내기 전에 한 번 더 소수 둘째 자리로 줄이고, 유한하지 않거나 범위 밖이면 **보내지 않는다.**
 * - 실패는 종류를 가리지 않고 `unavailable` 하나다 — 429 · 503 도 화면에서는 같은 결과(스티커 없음 ·
 *   문구 없음 · HW-4)라 오류 코드로 가르지 않는다.
 * - `authedRequest` 를 지난다(자기 `fetch` 금지). 좌표를 로그에 남기지 않는다.
 */
export const CURRENT_WEATHER_PATH = "/api/v1/weather/current";

/** FE → BE 10초 — 일기 날씨와 같다(§4.1) */
export const CURRENT_WEATHER_TIMEOUT_MS = 10_000;

export type CurrentWeatherResult =
  { kind: "ready"; weather: HomeWeather } | { kind: "unavailable" };

export async function fetchCurrentWeather(
  position: { latitude: number; longitude: number },
  expectedUserId?: number,
): Promise<CurrentWeatherResult> {
  if (!isValidCoordinate(position.latitude, position.longitude)) return { kind: "unavailable" };
  const latitude = roundCoordinate(position.latitude);
  const longitude = roundCoordinate(position.longitude);

  try {
    const result = await authedRequest<unknown>(
      "POST",
      CURRENT_WEATHER_PATH,
      { latitude, longitude },
      {
        timeoutMs: CURRENT_WEATHER_TIMEOUT_MS,
        ...(expectedUserId == null ? {} : { expectedUserId }),
      },
    );
    if (!result.ok) return { kind: "unavailable" };
    const weather = toHomeWeather(result.data);
    return weather == null ? { kind: "unavailable" } : { kind: "ready", weather };
  } catch {
    // `authedRequest` 는 던지지 않지만, 여기서도 닫는다 — 날씨가 홈을 멈추게 하지 않는다
    return { kind: "unavailable" };
  }
}
