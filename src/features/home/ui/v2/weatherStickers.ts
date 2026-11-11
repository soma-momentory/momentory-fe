import type { ImageSourcePropType } from "react-native";

import type { HomeWeather, HomeWeatherCondition } from "../../model/weather";
import type { HomeWeatherView } from "./types";

/**
 * 홈 날씨 조건 → 스티커 그림 (계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §4.3 · WX-1 · MF-WX1).
 *
 * 조건 코드 체계는 BE `dev` d77d023 `WeatherCondition`과 대조했다.
 * 새 코드가 생겨도 그림 검수 전에는 아래 허용 표를 늘리지 않는다.
 *
 * 그림은 **명시적인 표 두 장만** 보고 고른다 — 코드를 잘라 가며 상위 계열로 떨어지는 연쇄 규칙을 두지 않는다.
 * 그런 규칙이 있으면 「그림이 없는 조건은 날씨를 말하지 않는다」가 강도 · 소나기 · 복합에서 조용히 깨진다.
 *
 * 1. **전용 그림** — `condition.code` 와 똑같은 키의 그림이 `WEATHER_STICKERS` 에 있으면 그것
 * 2. **공통 그림 허용 표**(`SHARED_STICKER_CODES`) — 그 코드가 표의 한 줄에 글자 그대로 있으면 그 줄의 그림
 * 3. **바람** — `windy` 이고 코드가 하늘 일곱(`WINDY_SKY_CODES`) 중 하나면 `wind` (1 · 2 가 먼저 — 결정 D5)
 * 4. 그 밖은 `null` — 낮/밤을 건너 대신 쓰지 않는다(`clear.night` 에 해 그림을 쓰면 틀린 날씨다).
 *    홈의 사진 틀은 그때 날씨를 말하지 않는 기본 사진(`WEATHER_FALLBACK_PHOTO`)을 넣는다
 *
 * 표에 줄을 더하는 것은 그림 검수를 거친 결정이다 — 생성 규칙으로 늘리지 않는다.
 */

/** 홈 v2 에 준비된 여섯 장의 실제 그림. Metro 가 정적으로 찾도록 require 를 한곳에 둔다. */
export const WEATHER_STICKERS = {
  "clear.day": require("../../../../../assets/home/v2/weather/sunny.png"),
  cloudy: require("../../../../../assets/home/v2/weather/cloudy.png"),
  rain: require("../../../../../assets/home/v2/weather/rainy.png"),
  snow: require("../../../../../assets/home/v2/weather/snowy.png"),
  thunder: require("../../../../../assets/home/v2/weather/thunder.png"),
  wind: require("../../../../../assets/home/v2/weather/windy.png"),
} as const satisfies Record<string, ImageSourcePropType>;

export type WeatherStickerKey = keyof typeof WEATHER_STICKERS;

/**
 * 날씨를 못 받았을 때 사진 틀 안에 넣는 사진(2026-11-11 사용자 요청) — 바바의 손이 든 꽃다발.
 * 권한 없음 · 조회 실패 · 그림이 없는 조건 · 받는 중이 전부 이 사진이다. 바꾸려면 파일만 갈아 끼운다.
 */
export const WEATHER_FALLBACK_PHOTO: ImageSourcePropType = require("../../../../../assets/home/v2/weather/default.webp");

/** §4.3 공통 그림 허용 표 — **글자 그대로 · 이것만.** 바람은 코드가 아니라 플래그라 따로 둔다 */
export const SHARED_STICKER_CODES: Readonly<
  Record<Exclude<WeatherStickerKey, "wind">, readonly string[]>
> = {
  "clear.day": ["clear.day"],
  cloudy: ["cloudy"],
  rain: [
    "rain",
    "rain.light",
    "rain.heavy",
    "rain.showers.day",
    "rain.showers.night",
    "rain.light.showers.day",
    "rain.light.showers.night",
    "rain.heavy.showers.day",
    "rain.heavy.showers.night",
  ],
  snow: [
    "snow",
    "snow.light",
    "snow.heavy",
    "snow.showers.day",
    "snow.showers.night",
    "snow.light.showers.day",
    "snow.light.showers.night",
    "snow.heavy.showers.day",
    "snow.heavy.showers.night",
  ],
  // 비 + 뇌우만 — 눈 · 진눈깨비 뇌우는 그림이 말하지 않는다
  thunder: [
    "rain.thunder",
    "rain.light.thunder",
    "rain.heavy.thunder",
    "rain.showers.thunder.day",
    "rain.showers.thunder.night",
    "rain.light.showers.thunder.day",
    "rain.light.showers.thunder.night",
    "rain.heavy.showers.thunder.day",
    "rain.heavy.showers.thunder.night",
  ],
};

/** `windy` 가 바람 그림이 되는 하늘 코드 일곱 — 강수 · 안개 코드에는 바람 그림을 쓰지 않는다 */
export const WINDY_SKY_CODES: readonly string[] = [
  "clear.day",
  "clear.night",
  "fair.day",
  "fair.night",
  "partly_cloudy.day",
  "partly_cloudy.night",
  "cloudy",
];

/**
 * **전용 그림** — 그림의 키가 곧 조건 코드인 것. 지금은 둘뿐이다. `rain` · `snow` 는 코드이기도 하지만
 * 공통 그림(허용 표)이고, `thunder` · `wind` 는 조건 코드가 아니다 — 서버가 `thunder` 같은 모르는 코드를
 * 보내도 그림이 붙지 않게 여기 넣지 않는다. 전용 그림이 들어오면 파일 + 이 목록에 키를 더한다.
 */
export const DEDICATED_STICKER_CODES: ReadonlySet<string> = new Set<WeatherStickerKey>([
  "clear.day",
  "cloudy",
]);

const has = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key);

/**
 * 표 두 장으로 그림 열쇠를 고른다. `dedicated` 는 전용 그림이 있는 코드 — 그림이 더해졌을 때
 * 「같은 코드만 바뀐다」를 테스트가 확인할 수 있게 받는다(기본은 지금 있는 전용 그림).
 */
export function pickStickerKey(
  condition: Pick<HomeWeatherCondition, "code" | "windy">,
  dedicated: ReadonlySet<string> = DEDICATED_STICKER_CODES,
): string | null {
  const { code, windy } = condition;
  if (dedicated.has(code)) return code;
  for (const key of Object.keys(SHARED_STICKER_CODES) as (keyof typeof SHARED_STICKER_CODES)[]) {
    if (SHARED_STICKER_CODES[key].includes(code)) return key;
  }
  if (windy === true && WINDY_SKY_CODES.includes(code)) return "wind";
  return null;
}

/** 지금 있는 그림 가운데 하나 — 없으면 `null`(날씨 대신 기본 사진) */
export function stickerKeyForCondition(
  condition: Pick<HomeWeatherCondition, "code" | "windy">,
): WeatherStickerKey | null {
  const key = pickStickerKey(condition);
  return key != null && has(WEATHER_STICKERS, key) ? (key as WeatherStickerKey) : null;
}

export type WeatherStickerSelection = {
  key: WeatherStickerKey;
  source: ImageSourcePropType;
};

/** P4 의 stickerKey 문자열을 이미지로 바꾼다. 없는 그림이면 `null` — 틀은 기본 사진을 넣는다. */
export function weatherStickerForKey(stickerKey: string): WeatherStickerSelection | null {
  if (!has(WEATHER_STICKERS, stickerKey)) return null;

  const key = stickerKey as WeatherStickerKey;
  return { key, source: WEATHER_STICKERS[key] };
}

export function weatherStickerForCondition(
  condition: Pick<HomeWeatherCondition, "code" | "windy">,
): WeatherStickerSelection | null {
  const key = stickerKeyForCondition(condition);
  return key == null ? null : weatherStickerForKey(key);
}

/** 도메인 값 → 홈 v2 뷰의 날씨 자리. 그림이 없는 조건은 화면에 오기 전에 `null` 이 된다 */
export function toHomeWeatherView(weather: HomeWeather | null): HomeWeatherView | null {
  if (weather == null) return null;
  const stickerKey = stickerKeyForCondition(weather.condition);
  if (stickerKey == null) return null;
  return { label: weather.label, temperatureC: weather.temperatureC, stickerKey };
}
