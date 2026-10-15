import {
  WEATHER_STICKERS,
  WEATHER_STICKER_BY_STATE,
  weatherStickerFor,
  weatherStickerForKey,
  type WeatherStickerKind,
  type WeatherStickerKey,
  type WeatherTimeOfDay,
} from "@/features/home/ui/v2/weatherStickers";

it("여섯 계열의 낮·밤 대응을 정적 이미지에 연결한다", () => {
  const expected: Record<WeatherStickerKind, [WeatherStickerKey | null, WeatherStickerKey | null]> =
    {
      clear: ["clear.day", null],
      cloudy: ["cloudy", "cloudy"],
      rain: ["rain", "rain"],
      snow: ["snow", "snow"],
      thunder: ["thunder", "thunder"],
      wind: ["wind", "wind"],
    };

  for (const kind of Object.keys(expected) as WeatherStickerKind[]) {
    for (const [index, period] of (["day", "night"] as WeatherTimeOfDay[]).entries()) {
      const selection = weatherStickerFor(kind, period);
      const key = expected[kind][index];
      expect(WEATHER_STICKER_BY_STATE[kind][period]).toBe(key);
      expect(selection).toEqual(key == null ? null : { key, source: WEATHER_STICKERS[key] });
    }
  }
});

it("그림이 없는 밤 맑음과 미등록 상태는 숨긴다", () => {
  for (const [kind, period] of [
    ["clear", "night"],
    ["fog", "day"],
    ["sleet", "night"],
  ] as const) {
    expect(weatherStickerFor(kind, period)).toBeNull();
  }

  expect(weatherStickerForKey("clear.day")).toEqual({
    key: "clear.day",
    source: WEATHER_STICKERS["clear.day"],
  });
  expect(weatherStickerForKey("clear.night")).toBeNull();
  expect(weatherStickerForKey("unknown")).toBeNull();
  expect(weatherStickerForKey("toString")).toBeNull();
  expect(weatherStickerFor("toString", "day")).toBeNull();
});
