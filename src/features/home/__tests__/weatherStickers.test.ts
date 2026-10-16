import type { HomeWeather } from "@/features/home/model/weather";
import {
  WEATHER_STICKERS,
  toHomeWeatherView,
  weatherStickerForKey,
  type WeatherStickerKey,
} from "@/features/home/ui/v2/weatherStickers";

/**
 * 스티커 자산 표와 열쇠 → 그림 · 도메인 → 뷰 변환. 조건 코드 → 그림 매핑(§4.3)은 `weatherSticker.test.ts`.
 */

const weather = (code: string, patch: Partial<HomeWeather> = {}): HomeWeather => ({
  condition: {
    code,
    family: code.split(".")[0] ?? code,
    intensity: null,
    showers: false,
    thunder: false,
    daylight: null,
    windy: false,
  },
  label: "맑음",
  temperatureC: 22,
  forecastTime: "2026-10-15T13:00:00Z",
  updatedAt: "2026-10-15T12:31:07Z",
  source: "MET Norway",
  ...patch,
});

it("자산은 여섯 장이다 — 키가 바뀌면 P2 의 stickerKey 계약이 깨진다", () => {
  expect(Object.keys(WEATHER_STICKERS).sort()).toEqual(
    ["clear.day", "cloudy", "rain", "snow", "thunder", "wind"].sort(),
  );
});

it("있는 열쇠는 그림으로, 없는 열쇠 · 프로토타입 이름은 null", () => {
  for (const key of Object.keys(WEATHER_STICKERS) as WeatherStickerKey[]) {
    expect(weatherStickerForKey(key)).toEqual({ key, source: WEATHER_STICKERS[key] });
  }
  for (const key of ["clear.night", "unknown", "", "toString", "__proto__", "constructor"]) {
    expect(weatherStickerForKey(key)).toBeNull();
  }
});

describe("toHomeWeatherView", () => {
  it("그림이 있으면 label · temperatureC · stickerKey 만 넘긴다", () => {
    expect(toHomeWeatherView(weather("clear.day"))).toEqual({
      label: "맑음",
      temperatureC: 22,
      stickerKey: "clear.day",
    });
    expect(
      toHomeWeatherView(weather("rain.heavy", { label: "강한 비", temperatureC: null })),
    ).toEqual({ label: "강한 비", temperatureC: null, stickerKey: "rain" });
  });

  it("그림이 없는 조건 · 값 없음은 null — 화면에 오기 전에 걸러진다", () => {
    expect(toHomeWeatherView(weather("clear.night"))).toBeNull();
    expect(toHomeWeatherView(weather("unknown"))).toBeNull();
    expect(toHomeWeatherView(null)).toBeNull();
  });
});
