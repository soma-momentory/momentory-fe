import { formatKoreanTime } from "@/lib/time";

/**
 * 홈 날씨(P4)의 도메인 — 타입 · 응답 정규화 · TTL · 갱신 시각 표기.
 *
 * BE `dev` d77d023 `CurrentWeatherResponse` · `WeatherCondition` 계약 기준이다.
 * FE OpenAPI 스냅샷 반입과 운영 배포는 미확인이다.
 *
 * `types.ts` 의 `Weather`(스키마 필드)와 **다른 타입이다** — 그것을 import 하지도 고치지도 않는다(계획 MF-5).
 * 그래서 이름에 `Home` 을 붙인다. 이 파일은 그림 · `@/design` · `ui/` 를 모른다 — 어떤 조건에 어떤 그림을
 * 붙이는지는 `ui/v2/weatherStickers.ts` 몫이다.
 */

/** 앱 조건 코드(§4.3) — `code` 는 **열린 값**이다. 모르는 값은 오류가 아니라 그림이 없을 뿐이다 */
export type HomeWeatherCondition = {
  /** `{family}[.{intensity}][.showers][.thunder][.{daylight}]` — 그림은 이 글자 그대로 고른다 */
  code: string;
  family: string;
  intensity: "light" | "heavy" | null;
  showers: boolean;
  thunder: boolean;
  daylight: "day" | "night" | null;
  /** 코드가 아니라 플래그다 — 강수가 없는 하늘 코드에서만 그림에 쓰인다 */
  windy: boolean;
};

/**
 * 화면이 쓰는 것만 — **좌표 · `symbolCode` · `sourceUrl` · `licenseUrl` 은 담지 않는다.**
 * 서버 URL 은 열지 않는다(링크 주소는 `lib/links.ts` 한 곳 · 계획 §4.1).
 */
export type HomeWeather = {
  condition: HomeWeatherCondition;
  /** 한국어 이름(「맑음」) — 홈 BE `WeatherCondition.label()` 결과 */
  label: string;
  /** 섭씨 정수 · 없을 수 있다(그때도 스티커는 보인다) */
  temperatureC: number | null;
  /** 쓴 예보 칸의 시각(ISO) */
  forecastTime: string;
  /** 예보 갱신 시각(ISO) — HW-5 가 보이는 값 */
  updatedAt: string;
  /** 출처 이름 — 화면은 이 값을 그대로 쓴다(CP-1) */
  source: string;
};

/** 성공한 값도 실패한 시도도 이 시간 동안은 다시 묻지 않는다(계획 §4.6 · 결정 D2) */
export const HOME_WEATHER_TTL_MS = 30 * 60_000;

/** `at` 에 얻은(또는 시도한) 값이 `now` 에 아직 쓸 만한가. 시계가 뒤로 갔으면 낡은 것으로 본다 */
export function isWeatherFresh(atMs: number, nowMs: number): boolean {
  const elapsed = nowMs - atMs;
  return elapsed >= 0 && elapsed < HOME_WEATHER_TTL_MS;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const nonEmpty = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

// `Date.parse` 는 「October 14」 같은 말도 읽는다 — ISO 날짜 · 시각 꼴만 받는다.
// 시간대(`Z` · `±HH:MM`)가 **반드시** 있어야 한다 — 없으면 `Date.parse` 가 기기 시간대로 읽어
// 기기마다 다른 순간이 된다(HW-5 갱신 시각이 달라진다)
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const isoTime = (v: unknown): string | null =>
  typeof v === "string" && ISO_DATE_TIME.test(v) && Number.isFinite(Date.parse(v)) ? v : null;

/** 생략은 「보통 · 모름」이다(§4.3 — 보통 강도는 코드에서 빠진다). 모르는 글자는 거절한다 */
const optionalOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null | undefined => {
  if (v === undefined || v === null) return null;
  return (allowed as readonly unknown[]).includes(v) ? (v as T) : undefined;
};

function toCondition(raw: unknown): HomeWeatherCondition | null {
  if (!isRecord(raw)) return null;
  const code = nonEmpty(raw.code);
  const family = nonEmpty(raw.family);
  const intensity = optionalOf(raw.intensity, ["light", "heavy"] as const);
  const daylight = optionalOf(raw.daylight, ["day", "night"] as const);
  const { showers, thunder, windy } = raw;
  // 불리언 셋은 BE WeatherCondition 필드다 — 빠졌거나 불리언이 아니면 거절한다(결정 D4)
  if (
    code == null ||
    family == null ||
    intensity === undefined ||
    daylight === undefined ||
    typeof showers !== "boolean" ||
    typeof thunder !== "boolean" ||
    typeof windy !== "boolean"
  ) {
    return null;
  }
  return { code, family, intensity, showers, thunder, daylight, windy };
}

/**
 * 서버 응답을 **엄격하게** 읽는다 — 하나라도 틀리면 `null`(스티커 숨김 · HW-4).
 * 결과는 허용한 필드만 새로 만든다 — 응답에 좌표가 섞여 와도 옮겨지지 않는다.
 */
export function toHomeWeather(raw: unknown): HomeWeather | null {
  if (!isRecord(raw)) return null;
  const condition = toCondition(raw.condition);
  const label = nonEmpty(raw.label);
  const source = nonEmpty(raw.source);
  const forecastTime = isoTime(raw.forecastTime);
  const updatedAt = isoTime(raw.updatedAt);
  const t = raw.temperatureC;
  // `Number.isInteger` 는 NaN · Infinity · 소수 · 문자열을 다 거른다. 빠진 것(undefined)도 거절한다
  const temperatureC =
    t === null ? null : typeof t === "number" && Number.isInteger(t) ? t : undefined;
  if (
    condition == null ||
    label == null ||
    source == null ||
    forecastTime == null ||
    updatedAt == null ||
    temperatureC === undefined
  ) {
    return null;
  }
  return { condition, label, temperatureC, forecastTime, updatedAt, source };
}

const KST_OFFSET_MS = 9 * 60 * 60_000;

/** KST 달력의 연 · 월 · 일 · 시 · 분 — 기기 시간대와 무관하다 */
const kstParts = (ms: number) => {
  const d = new Date(ms + KST_OFFSET_MS);
  return {
    ymd: `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`,
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hhmm: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
  };
};

/**
 * 「밤 9:31 갱신」 · 날이 다르면 「10월 14일 밤 11:31 갱신」.
 *
 * 시각은 `formatKoreanTime` 의 말투를 그대로 쓴다(`lib/time.ts` — 시각을 말하는 곳은 전부 이것).
 * 「같은 날」은 04:00 하루 경계가 아니라 **KST 달력 날**이다 — 갱신 시각은 「지금」의 사실이다.
 * 기기 시간대를 보지 않고 KST(+09:00)로 고정한다. 읽지 못하는 값이면 빈 문자열.
 */
export function formatWeatherUpdatedAt(updatedAtIso: string, nowMs: number): string {
  const at = Date.parse(updatedAtIso);
  if (!Number.isFinite(at)) return "";
  const then = kstParts(at);
  const time = formatKoreanTime(then.hhmm);
  if (then.ymd === kstParts(nowMs).ymd) return `${time} 갱신`;
  return `${then.month}월 ${then.day}일 ${time} 갱신`;
}
