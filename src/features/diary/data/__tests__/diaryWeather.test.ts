import * as Location from "expo-location";
import { currentUserId } from "@/features/auth/model/auth";
import { authedRequest } from "@/lib/http";
import { clock } from "@/lib/clock";
import { recordDiaryWeather } from "../diaryWeather";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock("@/features/auth/model/auth", () => ({ currentUserId: jest.fn() }));
jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(clock, "today").mockReturnValue("2026-10-07");
  jest.mocked(currentUserId).mockResolvedValue(1);
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as never);
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);
  jest
    .mocked(Location.getCurrentPositionAsync)
    .mockResolvedValue({ coords: { latitude: 37.56789, longitude: 126.97891 } } as never);
  jest.mocked(authedRequest).mockResolvedValue({ ok: true, data: { weather: "맑음 · 22℃" } });
});
afterEach(() => jest.restoreAllMocks());

it("위치를 반올림해 전송하고 저장된 날씨를 받는다", async () => {
  expect(await recordDiaryWeather("12", "2026-10-07")).toEqual({
    kind: "ready",
    weather: "맑음 · 22℃",
  });
  expect(authedRequest).toHaveBeenCalledWith(
    "PUT",
    "/api/v1/diaries/12/weather",
    { latitude: 37.57, longitude: 126.98 },
    { timeoutMs: 10_000 },
  );
});
it("과거 일기와 로컬 일기는 위치 권한을 요청하지 않는다", async () => {
  expect(await recordDiaryWeather("12", "2026-10-06")).toEqual({ kind: "skipped" });
  expect(await recordDiaryWeather("d-local-1", "2026-10-07")).toEqual({ kind: "skipped" });
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});
it("권한 거절은 위치 조회나 서버 요청 없이 끝난다", async () => {
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: false } as never);
  expect(await recordDiaryWeather("12", "2026-10-07")).toEqual({ kind: "denied" });
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(authedRequest).not.toHaveBeenCalled();
});
it("조회 중 로그아웃하면 날씨를 다른 사용자로 전송하지 않는다", async () => {
  jest.mocked(currentUserId).mockResolvedValueOnce(1).mockResolvedValue(null);
  expect(await recordDiaryWeather("12", "2026-10-07")).toEqual({ kind: "skipped" });
  expect(authedRequest).not.toHaveBeenCalled();
});
it("날짜가 바뀌거나 위치 서비스가 꺼지면 기록하지 않는다", async () => {
  jest.spyOn(clock, "today").mockReturnValueOnce("2026-10-07").mockReturnValue("2026-10-08");
  expect(await recordDiaryWeather("12", "2026-10-07")).toEqual({ kind: "skipped" });
  expect(authedRequest).not.toHaveBeenCalled();
});
it("서버 오류는 일기와 분리해 처리한다", async () => {
  jest.mocked(authedRequest).mockResolvedValue({ ok: false, error: { code: "network" } });
  expect(await recordDiaryWeather("12", "2026-10-07")).toEqual({ kind: "unavailable" });
});

it("위치 서비스가 꺼져 있으면 서버를 부르지 않는다", async () => {
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(false);
  expect(await recordDiaryWeather("12", "2026-10-07")).toEqual({ kind: "unavailable" });
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(authedRequest).not.toHaveBeenCalled();
});

it("GPS 응답이 없으면 12초에 끝내고 일기 저장을 막지 않는다", async () => {
  jest.useFakeTimers();
  try {
    jest.mocked(Location.getCurrentPositionAsync).mockReturnValue(new Promise(() => {}));
    const result = recordDiaryWeather("12", "2026-10-07");
    await jest.advanceTimersByTimeAsync(12_000);
    expect(await result).toEqual({ kind: "unavailable" });
    expect(authedRequest).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});
