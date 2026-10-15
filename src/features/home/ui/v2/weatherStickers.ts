import type { ImageSourcePropType } from "react-native";

/** 홈 v2 에 준비된 여섯 장의 실제 그림. Metro 가 정적으로 찾도록 require 를 한곳에 둔다. */
export const WEATHER_STICKERS = {
  "clear.day": require("../../../../../assets/home/v2/weather/sunny.png"),
  cloudy: require("../../../../../assets/home/v2/weather/cloudy.png"),
  rain: require("../../../../../assets/home/v2/weather/rainy.png"),
  snow: require("../../../../../assets/home/v2/weather/snowy.png"),
  thunder: require("../../../../../assets/home/v2/weather/thunder.png"),
  wind: require("../../../../../assets/home/v2/weather/windy.png"),
} as const satisfies Record<string, ImageSourcePropType>;

export type WeatherStickerKind = "clear" | "cloudy" | "rain" | "snow" | "thunder" | "wind";
export type WeatherTimeOfDay = "day" | "night";
export type WeatherStickerKey = keyof typeof WEATHER_STICKERS;

/** 밤 맑음 전용 그림은 아직 없다. 그 외 다섯 계열은 낮과 밤에 같은 그림을 쓴다. */
export const WEATHER_STICKER_BY_STATE: Record<
  WeatherStickerKind,
  Record<WeatherTimeOfDay, WeatherStickerKey | null>
> = {
  clear: { day: "clear.day", night: null },
  cloudy: { day: "cloudy", night: "cloudy" },
  rain: { day: "rain", night: "rain" },
  snow: { day: "snow", night: "snow" },
  thunder: { day: "thunder", night: "thunder" },
  wind: { day: "wind", night: "wind" },
};

export type WeatherStickerSelection = {
  key: WeatherStickerKey;
  source: ImageSourcePropType;
};

/** P4 의 stickerKey 문자열을 이미지로 바꾼다. 없는 그림은 그리지 않는다. */
export function weatherStickerForKey(stickerKey: string): WeatherStickerSelection | null {
  if (!Object.prototype.hasOwnProperty.call(WEATHER_STICKERS, stickerKey)) return null;

  const key = stickerKey as WeatherStickerKey;
  return { key, source: WEATHER_STICKERS[key] };
}

/** 그림이 없는 상태는 숨긴다. 낮·밤을 건너거나 다른 계열 그림으로 대체하지 않는다. */
export function weatherStickerFor(
  kind: string,
  timeOfDay: WeatherTimeOfDay,
): WeatherStickerSelection | null {
  if (!Object.prototype.hasOwnProperty.call(WEATHER_STICKER_BY_STATE, kind)) return null;

  const key = WEATHER_STICKER_BY_STATE[kind as WeatherStickerKind][timeOfDay];
  return key == null ? null : weatherStickerForKey(key);
}
