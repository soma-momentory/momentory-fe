import { fetchCurrentWeather } from "@/features/home/data/weatherApi";
import {
  formatWeatherUpdatedAt,
  isWeatherFresh,
  HOME_WEATHER_TTL_MS,
} from "@/features/home/model/weather";
import { authedRequest } from "@/lib/http";

/**
 * 홈 날씨 어댑터 — BE `dev` d77d023의 Controller · DTO와 대조한 계약이다.
 * FE OpenAPI 스냅샷 반입과 운영 배포는 아직 미확인이다.
 */
jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

/** BE `CurrentWeatherResponse`의 200 응답 필드와 `WeatherConditionTest`의 복합 코드 */
const EXAMPLE = {
  condition: {
    code: "rain.heavy.showers.thunder.night",
    family: "rain",
    intensity: "heavy",
    showers: true,
    thunder: true,
    daylight: "night",
    windy: false,
  },
  symbolCode: "heavyrainshowersandthunder_night",
  label: "강한 소나기 · 뇌우",
  temperatureC: 21,
  forecastTime: "2026-10-15T13:00:00Z",
  updatedAt: "2026-10-15T12:31:07Z",
  source: "MET Norway",
  sourceUrl: "https://api.met.no/",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
};

const respond = (data: unknown) =>
  jest.mocked(authedRequest).mockResolvedValue({ ok: true, data } as never);
const SEOUL = { latitude: 37.56789, longitude: 126.97891 };

beforeEach(() => {
  jest.clearAllMocks();
  respond(EXAMPLE);
});

describe("요청", () => {
  it("POST /api/v1/weather/current 이고 좌표는 본문에만 있다 — URL 에 latitude · longitude · ? 가 없다(WX-2)", async () => {
    await fetchCurrentWeather(SEOUL);
    expect(authedRequest).toHaveBeenCalledTimes(1);
    const [method, path, body, options] = jest.mocked(authedRequest).mock.calls[0]!;
    expect(method).toBe("POST");
    expect(path).toBe("/api/v1/weather/current");
    expect(path).not.toMatch(/latitude|longitude|\?|37|126/);
    expect(body).toEqual({ latitude: 37.57, longitude: 126.98 });
    expect(Object.keys(body as object).sort()).toEqual(["latitude", "longitude"]);
    expect(options).toEqual({ timeoutMs: 10_000 });
  });

  it("요청 좌표는 소수 둘째 자리 — 이미 줄인 값도 한 번 더 줄인다", async () => {
    await fetchCurrentWeather({ latitude: -33.86882, longitude: 151.20929 });
    expect(jest.mocked(authedRequest).mock.calls[0]![2]).toEqual({
      latitude: -33.87,
      longitude: 151.21,
    });
  });

  it.each([
    ["NaN", { latitude: NaN, longitude: 126.9 }],
    ["Infinity", { latitude: 37.5, longitude: Infinity }],
    ["위도 범위 밖", { latitude: 91, longitude: 126.9 }],
    ["경도 범위 밖", { latitude: 37.5, longitude: 181 }],
  ])("좌표가 이상하면(%s) 부르지 않고 unavailable", async (_name, position) => {
    await expect(fetchCurrentWeather(position)).resolves.toEqual({ kind: "unavailable" });
    expect(authedRequest).not.toHaveBeenCalled();
  });
});

describe("응답", () => {
  it("§4.1 예시 응답 → ready · 화면이 쓰는 필드만 남는다", async () => {
    await expect(fetchCurrentWeather(SEOUL)).resolves.toEqual({
      kind: "ready",
      weather: {
        condition: EXAMPLE.condition,
        label: "강한 소나기 · 뇌우",
        temperatureC: 21,
        forecastTime: "2026-10-15T13:00:00Z",
        updatedAt: "2026-10-15T12:31:07Z",
        source: "MET Norway",
      },
    });
  });

  it("응답의 좌표를 저장하지 않는다 — 섞여 와도 결과에 없다", async () => {
    respond({
      ...EXAMPLE,
      latitude: 37.57,
      longitude: 126.98,
      condition: { ...EXAMPLE.condition, latitude: 1 },
    });
    const result = await fetchCurrentWeather(SEOUL);
    expect(result.kind).toBe("ready");
    const text = JSON.stringify(result);
    expect(text).not.toMatch(/latitude|longitude|symbolCode|sourceUrl|licenseUrl/);
  });

  it("기온 null 은 받는다 · 보통 강도(생략)와 낮밤 없음도 받는다", async () => {
    const { intensity: _i, daylight: _d, ...rest } = EXAMPLE.condition;
    respond({
      ...EXAMPLE,
      temperatureC: null,
      condition: { ...rest, code: "cloudy", family: "cloudy" },
    });
    const result = await fetchCurrentWeather(SEOUL);
    expect(result).toMatchObject({
      kind: "ready",
      weather: { temperatureC: null, condition: { intensity: null, daylight: null } },
    });
  });

  const broken: [string, Record<string, unknown>][] = [
    ["condition 없음", { condition: undefined }],
    ["condition 이 배열", { condition: [] }],
    ["code 빈 문자열", { condition: { ...EXAMPLE.condition, code: " " } }],
    ["family 숫자", { condition: { ...EXAMPLE.condition, family: 3 } }],
    ["showers 없음", { condition: { ...EXAMPLE.condition, showers: undefined } }],
    ["thunder 문자열", { condition: { ...EXAMPLE.condition, thunder: "true" } }],
    ["windy 없음", { condition: { ...EXAMPLE.condition, windy: undefined } }],
    ["intensity 모르는 값", { condition: { ...EXAMPLE.condition, intensity: "moderate" } }],
    ["daylight 모르는 값", { condition: { ...EXAMPLE.condition, daylight: "polartwilight" } }],
    ["label 공백", { label: "  " }],
    ["label 없음", { label: undefined }],
    ["source 없음", { source: undefined }],
    ["updatedAt 파싱 불가", { updatedAt: "어제" }],
    ["updatedAt ISO 아님", { updatedAt: "October 15, 2026" }],
    ["updatedAt 시간대 없음", { updatedAt: "2026-10-15T12:31:07" }],
    ["updatedAt 뒤에 군글자", { updatedAt: "2026-10-15T12:31:07Z 어제" }],
    ["forecastTime 시간대 없음", { forecastTime: "2026-10-15T13:00:00" }],
    ["forecastTime 숫자", { forecastTime: 1760533200000 }],
    ["temperatureC 소수", { temperatureC: 21.5 }],
    ["temperatureC NaN", { temperatureC: NaN }],
    ["temperatureC 문자열", { temperatureC: "21" }],
    ["temperatureC 없음", { temperatureC: undefined }],
  ];
  it.each(broken)("형태가 틀리면 unavailable — %s", async (_name, patch) => {
    respond({ ...EXAMPLE, ...patch });
    await expect(fetchCurrentWeather(SEOUL)).resolves.toEqual({ kind: "unavailable" });
  });

  it.each([
    ["Z", "2026-10-15T12:31:07Z"],
    ["밀리초 + Z", "2026-10-15T12:31:07.123Z"],
    ["UTC 오프셋", "2026-10-15T21:31:07+09:00"],
    ["음수 오프셋", "2026-10-15T07:31:07-05:00"],
  ])("시간대가 명시된 시각은 받는다 — %s", async (_name, updatedAt) => {
    respond({ ...EXAMPLE, updatedAt });
    const result = await fetchCurrentWeather(SEOUL);
    expect(result.kind).toBe("ready");
  });

  it.each([null, "ok", [], 42])("본문이 객체가 아니면 unavailable — %p", async (data) => {
    respond(data);
    await expect(fetchCurrentWeather(SEOUL)).resolves.toEqual({ kind: "unavailable" });
  });

  it.each([
    ["400", { code: "http", status: 400, body: { code: "INVALID_COORDINATE" } }],
    ["401 갱신 실패", { code: "unauthenticated" }],
    ["429", { code: "http", status: 429, body: { code: "TOO_MANY_REQUESTS" } }],
    ["502", { code: "http", status: 502, body: null }],
    ["503", { code: "http", status: 503, body: { code: "WEATHER_UNAVAILABLE" } }],
    ["504", { code: "http", status: 504, body: null }],
    ["시간 초과 · 네트워크", { code: "network" }],
    ["파싱 실패", { code: "malformed" }],
    ["설정 없음", { code: "unconfigured" }],
  ])("4xx/5xx · 시간 초과도 같은 결과 — %s → unavailable", async (_name, error) => {
    jest.mocked(authedRequest).mockResolvedValue({ ok: false, error } as never);
    await expect(fetchCurrentWeather(SEOUL)).resolves.toEqual({ kind: "unavailable" });
  });

  it("어댑터가 던져도 던지지 않는다", async () => {
    jest.mocked(authedRequest).mockRejectedValue(new Error("boom"));
    await expect(fetchCurrentWeather(SEOUL)).resolves.toEqual({ kind: "unavailable" });
  });
});

describe("TTL · 갱신 시각", () => {
  it("30분 안만 신선하다 · 시계가 뒤로 가면 낡은 것으로 본다", () => {
    expect(HOME_WEATHER_TTL_MS).toBe(30 * 60_000);
    expect(isWeatherFresh(0, HOME_WEATHER_TTL_MS - 1)).toBe(true);
    expect(isWeatherFresh(0, HOME_WEATHER_TTL_MS)).toBe(false);
    expect(isWeatherFresh(1_000, 0)).toBe(false);
  });

  it("KST 같은 달력 날이면 시각만, 다르면 날짜도 — 기기 시간대와 무관하다", () => {
    const now = Date.parse("2026-10-15T13:00:00Z"); // KST 10월 15일 22:00
    expect(formatWeatherUpdatedAt("2026-10-15T12:31:07Z", now)).toBe("밤 9:31 갱신");
    expect(formatWeatherUpdatedAt("2026-10-14T14:31:00Z", now)).toBe("10월 14일 밤 11:31 갱신");
    // KST 자정(UTC 15:00) 직후 — 04:00 하루 경계가 아니라 달력 날이다
    const afterMidnight = Date.parse("2026-10-15T15:10:00Z"); // KST 10월 16일 00:10
    expect(formatWeatherUpdatedAt("2026-10-15T14:50:00Z", afterMidnight)).toBe(
      "10월 15일 밤 11:50 갱신",
    );
    expect(formatWeatherUpdatedAt("2026-10-15T15:05:00+00:00", afterMidnight)).toBe(
      "새벽 12:05 갱신",
    );
    expect(formatWeatherUpdatedAt("엉망", now)).toBe("");
  });
});
