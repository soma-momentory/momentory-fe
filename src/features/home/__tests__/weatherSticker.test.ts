import {
  DEDICATED_STICKER_CODES,
  SHARED_STICKER_CODES,
  WEATHER_STICKERS,
  WINDY_SKY_CODES,
  pickStickerKey,
  stickerKeyForCondition,
  weatherStickerForCondition,
} from "@/features/home/ui/v2/weatherStickers";

/**
 * 조건 코드 → 그림 (계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §4.3 · §7.1 P4 · WX-1 · MF-WX1 · MF-WX1-R).
 *
 * 조건 코드 체계는 BE `dev` d77d023 `WeatherCondition`과 대조했다.
 *
 * 허용 표를 **이 파일에 글자 그대로 다시 적는다** — 구현의 표를 읽어 기대값을 만들면 표가 틀려도 통과한다.
 */
const ALLOWED: Record<string, readonly string[]> = {
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
const SKY = [
  "clear.day",
  "clear.night",
  "fair.day",
  "fair.night",
  "partly_cloudy.day",
  "partly_cloudy.night",
  "cloudy",
];

const key = (code: string, windy = false) => stickerKeyForCondition({ code, windy });

it("허용 표가 글자 그대로다 — 줄 수(1 · 1 · 9 · 9 · 9 · 하늘 7)와 내용", () => {
  expect(SHARED_STICKER_CODES).toEqual(ALLOWED);
  expect([...WINDY_SKY_CODES]).toEqual(SKY);
  expect([...DEDICATED_STICKER_CODES].sort()).toEqual(["clear.day", "cloudy"]);
});

it("허용 표의 모든 완전한 코드를 하나씩 — 각 코드가 그 줄의 공통 그림이다", () => {
  for (const [sticker, codes] of Object.entries(ALLOWED)) {
    for (const code of codes) {
      expect([code, key(code)]).toEqual([code, sticker]);
      // 바람이 붙어도 강수 · 하늘 그림이 먼저다
      expect([code, key(code, true)]).toEqual([code, sticker]);
    }
  }
});

it("뇌우가 먼저다 — rain.thunder 는 thunder", () => {
  expect(key("rain.thunder")).toBe("thunder");
});

it("§4.1 예시의 rain.heavy.showers.thunder.night 는 허용 표와 글자 그대로 맞아 thunder", () => {
  expect(key("rain.heavy.showers.thunder.night")).toBe("thunder");
  // 글자가 하나라도 다르면 숨는다 — 접두 · 계열로 떨어지지 않는다
  expect(key("rain.heavy.showers.thunder")).toBeNull();
  expect(key("rain.heavy.showers.thunder.night.extra")).toBeNull();
});

it("밤 맑음에 해 그림을 쓰지 않는다 · 표 밖 하늘 코드는 숨긴다", () => {
  for (const code of [
    "clear.night",
    "fair.day",
    "fair.night",
    "partly_cloudy.day",
    "partly_cloudy.night",
    "fog",
  ]) {
    expect([code, key(code)]).toEqual([code, null]);
  }
});

it("전용 그림이 없는 복합은 숨긴다 — rain · snow · thunder 로 내려가지 않는다", () => {
  for (const code of [
    "snow.heavy.showers.thunder.night",
    "snow.thunder",
    "sleet",
    "sleet.light.thunder",
    "sleet.showers.day",
    "rain.showers",
    "rain.moderate",
    "rain.heavy.showers.thunder.polartwilight",
  ]) {
    expect([code, key(code)]).toEqual([code, null]);
  }
});

it("모르는 계열 · unknown · 프로토타입 이름 · 그림 열쇠 이름은 숨긴다", () => {
  for (const code of [
    "unknown",
    "hail",
    "",
    "toString",
    "__proto__",
    "constructor",
    "hasOwnProperty",
    "thunder",
    "wind",
  ]) {
    expect([code, key(code)]).toEqual([code, null]);
    expect([code, key(code, true)]).toEqual([code, null]);
  }
});

it("windy 는 허용한 하늘 일곱에서만 바람 그림 — 전용 · 허용 표가 먼저(결정 D5)", () => {
  expect(key("clear.day", true)).toBe("clear.day");
  expect(key("cloudy", true)).toBe("cloudy");
  for (const code of [
    "clear.night",
    "fair.day",
    "fair.night",
    "partly_cloudy.day",
    "partly_cloudy.night",
  ]) {
    expect([code, key(code, true)]).toEqual([code, "wind"]);
  }
  expect(key("fog", true)).toBeNull();
});

it("강수 코드에 바람이 붙어도 바람 그림으로 내려가지 않는다", () => {
  expect(key("sleet", true)).toBeNull();
  expect(key("sleet.heavy", true)).toBeNull();
  expect(key("rain", true)).toBe("rain");
  expect(key("snow.heavy.showers.thunder.night", true)).toBeNull();
});

it("기존 여섯 장이 모두 어떤 조건에 닿는다", () => {
  const reached = new Set<string>();
  for (const code of [...Object.values(ALLOWED).flat(), ...SKY]) {
    for (const windy of [false, true]) {
      const k = key(code, windy);
      if (k != null) reached.add(k);
    }
  }
  expect([...reached].sort()).toEqual(Object.keys(WEATHER_STICKERS).sort());
});

it("전용 그림을 더하면 같은 코드만 바뀐다 — rain.heavy 그림이 생겨도 rain.heavy.showers.day 는 rain", () => {
  const withRainHeavy = new Set([...DEDICATED_STICKER_CODES, "rain.heavy"]);
  const pick = (code: string) => pickStickerKey({ code, windy: false }, withRainHeavy);
  expect(pick("rain.heavy")).toBe("rain.heavy");
  expect(pick("rain.heavy.showers.day")).toBe("rain");
  expect(pick("rain.heavy.showers.thunder.night")).toBe("thunder");
  expect(pick("rain")).toBe("rain");

  // clear.night 전용 그림이 들어오면 그 코드만 — clear.day 는 그대로
  const withNight = new Set([...DEDICATED_STICKER_CODES, "clear.night"]);
  expect(pickStickerKey({ code: "clear.night", windy: true }, withNight)).toBe("clear.night");
  expect(pickStickerKey({ code: "clear.day", windy: false }, withNight)).toBe("clear.day");
  expect(pickStickerKey({ code: "fair.night", windy: false }, withNight)).toBeNull();
});

it("weatherStickerForCondition 은 열쇠와 같은 그림을 준다", () => {
  expect(weatherStickerForCondition({ code: "rain.light", windy: false })).toEqual({
    key: "rain",
    source: WEATHER_STICKERS.rain,
  });
  expect(weatherStickerForCondition({ code: "clear.night", windy: false })).toBeNull();
});
