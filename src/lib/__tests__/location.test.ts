import * as Location from "expo-location";

import {
  LOCATE_TIMEOUT_MS,
  getLocationPermission,
  isLocationServiceEnabled,
  locateRounded,
  requestLocationPermission,
  roundCoordinate,
} from "../location";

/**
 * 위치의 단일 통로 — 계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §4.5 · §7.1 P4.
 * 일기 쪽 동작 불변은 `features/diary/data/__tests__/diaryWeather.test.ts` 가 고친 데 없이 지킨다.
 */
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const at = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue(at(37.56789, 126.97891));
});

describe("권한", () => {
  it("권한 읽기는 묻지 않는다 — 상태를 그대로 옮긴다", async () => {
    for (const status of ["granted", "denied", "undetermined"] as const) {
      jest
        .mocked(Location.getForegroundPermissionsAsync)
        .mockResolvedValueOnce({ status, granted: status === "granted" } as never);
      await expect(getLocationPermission()).resolves.toBe(status);
    }
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("다시 물을 수 없는 거부도 그냥 denied 다", async () => {
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValue({ status: "denied", granted: false, canAskAgain: false } as never);
    await expect(getLocationPermission()).resolves.toBe("denied");
  });

  it("권한 읽기가 실패하면 denied 로 닫는다(던지지 않는다)", async () => {
    jest.mocked(Location.getForegroundPermissionsAsync).mockRejectedValue(new Error("native"));
    await expect(getLocationPermission()).resolves.toBe("denied");
  });

  it("요청은 granted · denied 를 가르고, 실패하면 unavailable 이다", async () => {
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValueOnce({ granted: true } as never)
      .mockResolvedValueOnce({ granted: false } as never)
      .mockRejectedValueOnce(new Error("native"));
    await expect(requestLocationPermission()).resolves.toBe("granted");
    await expect(requestLocationPermission()).resolves.toBe("denied");
    await expect(requestLocationPermission()).resolves.toBe("unavailable");
  });
});

describe("위치 서비스", () => {
  it("isLocationServiceEnabled 는 묻지 않는다 · 실패하면 false", async () => {
    await expect(isLocationServiceEnabled()).resolves.toBe(true);
    jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValueOnce(false);
    await expect(isLocationServiceEnabled()).resolves.toBe(false);
    jest.mocked(Location.hasServicesEnabledAsync).mockRejectedValueOnce(new Error("native"));
    await expect(isLocationServiceEnabled()).resolves.toBe(false);
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("서비스 꺼짐 → locateRounded 는 위치를 읽지 않고 unavailable", async () => {
    jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(false);
    await expect(locateRounded()).resolves.toEqual({ kind: "unavailable" });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });
});

describe("locateRounded", () => {
  it("소수 둘째 자리로 줄이고, 권한을 묻지 않는다", async () => {
    await expect(locateRounded()).resolves.toEqual({
      kind: "located",
      latitude: 37.57,
      longitude: 126.98,
    });
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("12초가 지나면 unavailable · 타이머를 치운다", async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(Location.getCurrentPositionAsync).mockReturnValue(new Promise(() => {}));
      const result = locateRounded();
      await jest.advanceTimersByTimeAsync(LOCATE_TIMEOUT_MS - 1);
      expect(jest.getTimerCount()).toBe(1);
      await jest.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toEqual({ kind: "unavailable" });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it("제때 답하면 타이머가 남지 않는다", async () => {
    jest.useFakeTimers();
    try {
      await expect(locateRounded()).resolves.toMatchObject({ kind: "located" });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    ["NaN", NaN, 126.9],
    ["Infinity", 37.5, Infinity],
    ["위도 범위 밖", 90.5, 126.9],
    ["경도 범위 밖", 37.5, -180.01],
  ])("좌표가 이상하면(%s) unavailable", async (_name, latitude, longitude) => {
    jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue(at(latitude, longitude));
    await expect(locateRounded()).resolves.toEqual({ kind: "unavailable" });
  });

  it("위치 조회가 던져도 던지지 않는다", async () => {
    jest.mocked(Location.getCurrentPositionAsync).mockRejectedValue(new Error("native"));
    await expect(locateRounded()).resolves.toEqual({ kind: "unavailable" });
  });
});

describe("roundCoordinate", () => {
  it("소수 둘째 자리로 줄인다", () => {
    expect(roundCoordinate(37.56789)).toBe(37.57);
    expect(roundCoordinate(126.97891)).toBe(126.98);
    expect(roundCoordinate(-33.86882)).toBe(-33.87);
    expect(roundCoordinate(-122.41941)).toBe(-122.42);
    expect(roundCoordinate(37.5)).toBe(37.5);
  });

  it(".005 경계는 일기 1.3.0 과 같은 식(Math.round)을 따른다", () => {
    // 부동소수 표현 때문에 1.005 * 100 은 100.49999… 다 — 식을 바꾸면 일기와 홈이 다른 격자를 보낸다
    expect(roundCoordinate(1.005)).toBe(Math.round(1.005 * 100) / 100);
    expect(roundCoordinate(0.125)).toBe(0.13);
    expect(roundCoordinate(-0.125)).toBe(-0.12);
  });
});

describe("모듈이 없는 옛 dev client", () => {
  it("모듈이 없으면 던지지 않는다 — 권한 denied · 요청 unavailable · 서비스 false · 위치 unavailable", async () => {
    jest.resetModules();
    jest.doMock("expo-location", () => {
      throw new Error("Cannot find native module 'ExpoLocation'");
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fresh = require("../location") as typeof import("../location");

    await expect(fresh.getLocationPermission()).resolves.toBe("denied");
    await expect(fresh.requestLocationPermission()).resolves.toBe("unavailable");
    await expect(fresh.isLocationServiceEnabled()).resolves.toBe(false);
    await expect(fresh.locateRounded()).resolves.toEqual({ kind: "unavailable" });
    jest.dontMock("expo-location");
  });
});
