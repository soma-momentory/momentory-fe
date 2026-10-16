import { act, renderHook } from "@testing-library/react-native";
import { useEffect as mockUseEffect } from "react";

import { currentUserId, useAuth } from "@/features/auth/model/auth";
import { fetchCurrentWeather, type CurrentWeatherResult } from "@/features/home/data/weatherApi";
import {
  markWeatherIntroSeen,
  readWeatherIntroSeen,
} from "@/features/home/data/weatherIntroMemory";
import { HOME_WEATHER_TTL_MS, type HomeWeather } from "@/features/home/model/weather";
import { useHomeWeather } from "@/features/home/model/useHomeWeather";
import {
  getLocationPermission,
  isLocationServiceEnabled,
  locateRounded,
  requestLocationPermission,
  type LocationPermission,
  type RoundedPosition,
} from "@/lib/location";

/**
 * 홈 날씨 상태 훅 — 계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §4.6 · §7.1 P4 (MF-2 · MF-2A · MF-2B · MF-4).
 * 조회 경로는 BE `dev` d77d023에 있다. 이 테스트의 어댑터는 목이다.
 */

let mockFocus: (() => void) | undefined;
let mockBlur: (() => void) | undefined;
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => (() => void) | void) =>
    mockUseEffect(() => {
      let cleanup = effect();
      mockBlur = () => {
        cleanup?.();
        cleanup = undefined;
      };
      mockFocus = () => {
        cleanup = effect();
      };
      return () => cleanup?.();
    }, [effect]),
}));

let mockForeground: (() => void) | undefined;
const mockStopForeground = jest.fn();
jest.mock("@/lib/appState", () => ({
  onForeground: (handler: () => void) => {
    mockForeground = handler;
    return mockStopForeground;
  },
}));

let mockDayChange: (() => void) | undefined;
const mockStopDay = jest.fn();
jest.mock("@/lib/dayChange", () => ({
  onDayChange: (handler: () => void) => {
    mockDayChange = handler;
    return mockStopDay;
  },
}));

jest.mock("@/lib/location", () => ({
  getLocationPermission: jest.fn(),
  isLocationServiceEnabled: jest.fn(),
  locateRounded: jest.fn(),
  requestLocationPermission: jest.fn(),
}));
jest.mock("@/features/home/data/weatherApi", () => ({ fetchCurrentWeather: jest.fn() }));
jest.mock("@/features/home/data/weatherIntroMemory", () => ({
  readWeatherIntroSeen: jest.fn(),
  markWeatherIntroSeen: jest.fn(),
}));
jest.mock("@/features/auth/model/auth", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { create } = require("zustand") as typeof import("zustand");
  return {
    currentUserId: jest.fn(),
    useAuth: create(() => ({ status: "authenticated" })),
  };
});

const weather = (label: string): HomeWeather => ({
  condition: {
    code: "clear.day",
    family: "clear",
    intensity: null,
    showers: false,
    thunder: false,
    daylight: "day",
    windy: false,
  },
  label,
  temperatureC: 22,
  forecastTime: "2026-10-15T13:00:00Z",
  updatedAt: "2026-10-15T12:31:07Z",
  source: "MET Norway",
});
const SUNNY = weather("맑음");
const LATER = weather("흐림");
const SEOUL: RoundedPosition = { kind: "located", latitude: 37.57, longitude: 126.98 };

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
const deferred = <T,>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

let now = 1_000_000;
let permission: LocationPermission;
let serviceOn: boolean;
let user: number | null;
const seen = new Set<number>();

/** 일을 하나 하고 약속이 다 풀릴 때까지 기다린다 — 훅의 점검은 await 이 여러 겹이다 */
const flush = (work?: () => void) =>
  act(async () => {
    work?.();
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });

async function mount() {
  const view = await renderHook(() => useHomeWeather());
  await flush();
  return view;
}
const focusAgain = () =>
  flush(() => {
    mockBlur?.();
    mockFocus?.();
  });
const foreground = () => flush(() => mockForeground?.());
const dayChange = () => flush(() => mockDayChange?.());
const advance = (ms: number) => {
  now += ms;
};

beforeEach(() => {
  jest.clearAllMocks();
  now = 1_000_000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  permission = "granted";
  serviceOn = true;
  user = 7;
  seen.clear();
  useAuth.setState({ status: "authenticated" });
  jest.mocked(getLocationPermission).mockImplementation(async () => permission);
  jest.mocked(isLocationServiceEnabled).mockImplementation(async () => serviceOn);
  jest.mocked(currentUserId).mockImplementation(async () => user);
  jest.mocked(locateRounded).mockResolvedValue(SEOUL);
  jest.mocked(fetchCurrentWeather).mockResolvedValue({ kind: "ready", weather: SUNNY });
  jest.mocked(requestLocationPermission).mockResolvedValue("granted");
  jest.mocked(readWeatherIntroSeen).mockImplementation(async (id) => seen.has(id));
  jest.mocked(markWeatherIntroSeen).mockImplementation(async (id) => {
    seen.add(id);
  });
});
afterEach(() => jest.restoreAllMocks());

describe("허용 · 안내 · 거부", () => {
  it("허용 → 스티커", async () => {
    const { result } = await mount();
    expect(result.current.status).toBe("ready");
    expect(result.current.weather).toEqual(SUNNY);
    expect(fetchCurrentWeather).toHaveBeenCalledWith(SEOUL, 7);
    expect(requestLocationPermission).not.toHaveBeenCalled();
  });

  it("undetermined + 안내 미열람 → 안내 · 위치를 읽지 않는다", async () => {
    permission = "undetermined";
    const { result } = await mount();
    expect(result.current.status).toBe("intro");
    expect(result.current.weather).toBeNull();
    expect(readWeatherIntroSeen).toHaveBeenCalledWith(7);
    expect(locateRounded).not.toHaveBeenCalled();
    expect(requestLocationPermission).not.toHaveBeenCalled();
  });

  it("안내를 닫으면 기록하고 다시 묻지 않는다", async () => {
    permission = "undetermined";
    const { result } = await mount();
    await act(() => result.current.dismissIntro());
    expect(result.current.status).toBe("hidden");
    expect(markWeatherIntroSeen).toHaveBeenCalledWith(7);
    await focusAgain();
    await foreground();
    expect(result.current.status).toBe("hidden");
    expect(requestLocationPermission).not.toHaveBeenCalled();
  });

  it("「위치 허용하기」 → 기록 → 권한 창 → 허용되면 조회한다", async () => {
    permission = "undetermined";
    jest.mocked(requestLocationPermission).mockImplementation(async () => {
      permission = "granted";
      return "granted";
    });
    const { result } = await mount();
    await act(() => result.current.acceptIntro());
    await flush();
    expect(markWeatherIntroSeen).toHaveBeenCalledWith(7);
    expect(requestLocationPermission).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("ready");
  });

  it("「위치 허용하기」 뒤 거부 → 숨김 · 조회 없음", async () => {
    permission = "undetermined";
    jest.mocked(requestLocationPermission).mockImplementation(async () => {
      permission = "denied";
      return "denied";
    });
    const { result } = await mount();
    await act(() => result.current.acceptIntro());
    await flush();
    expect(result.current.status).toBe("hidden");
    expect(locateRounded).not.toHaveBeenCalled();
  });

  it("거부 → 숨김 · 안내 없음(다시 물을 수 있든 없든)", async () => {
    permission = "denied";
    const { result } = await mount();
    expect(result.current.status).toBe("hidden");
    expect(readWeatherIntroSeen).not.toHaveBeenCalled();
    expect(locateRounded).not.toHaveBeenCalled();
    expect(isLocationServiceEnabled).not.toHaveBeenCalled();
  });

  it("userId 를 모르면 안내를 띄우지 않고 기록도 쓰지 않는다", async () => {
    permission = "undetermined";
    user = null;
    const { result } = await mount();
    expect(result.current.status).toBe("hidden");
    expect(readWeatherIntroSeen).not.toHaveBeenCalled();
    await act(() => result.current.dismissIntro());
    await act(() => result.current.acceptIntro());
    expect(markWeatherIntroSeen).not.toHaveBeenCalled();
    expect(requestLocationPermission).not.toHaveBeenCalled();
  });

  it("안내가 떠 있는 동안 사용자가 바뀌면 그 기록을 쓰지 않는다", async () => {
    permission = "undetermined";
    const { result } = await mount();
    expect(result.current.status).toBe("intro");
    const staleDismiss = result.current.dismissIntro;
    user = 8;
    await focusAgain();
    expect(result.current.status).toBe("intro");
    await act(() => staleDismiss());
    expect(markWeatherIntroSeen).not.toHaveBeenCalled();
    expect(result.current.status).toBe("intro");
  });

  it("안내 기록을 기다리는 사이 계정이 바뀌면 새 계정의 권한 창을 열지 않는다", async () => {
    permission = "undetermined";
    const { result } = await mount();
    const pending = deferred<void>();
    jest.mocked(markWeatherIntroSeen).mockReturnValueOnce(pending.promise);
    let accepting!: Promise<void>;
    await flush(() => {
      accepting = result.current.acceptIntro();
    });
    expect(markWeatherIntroSeen).toHaveBeenCalledWith(7);

    user = 8;
    await focusAgain();
    expect(result.current.status).toBe("intro");
    await flush(() => pending.resolve());
    await accepting;

    expect(requestLocationPermission).not.toHaveBeenCalled();
    expect(result.current.status).toBe("intro");
  });
});

describe("TTL · 다시 보는 때", () => {
  it("TTL 안에서는 다시 조회하지 않는다 — 권한 · 서비스는 매번 읽는다", async () => {
    const { result } = await mount();
    advance(HOME_WEATHER_TTL_MS - 1);
    await focusAgain();
    await foreground();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(1);
    expect(getLocationPermission).toHaveBeenCalledTimes(3);
    expect(isLocationServiceEnabled).toHaveBeenCalledTimes(3);
    expect(result.current.weather).toEqual(SUNNY);
  });

  it("포커스 · 복귀 · 하루 전환 매번 권한과 서비스를 다시 읽는다(묻지 않는다)", async () => {
    await mount();
    await focusAgain();
    await foreground();
    await dayChange();
    expect(getLocationPermission).toHaveBeenCalledTimes(4);
    expect(isLocationServiceEnabled).toHaveBeenCalledTimes(4);
    expect(requestLocationPermission).not.toHaveBeenCalled();
  });

  it("하루가 바뀌면 TTL 과 무관하게 다시 조회한다", async () => {
    jest
      .mocked(fetchCurrentWeather)
      .mockResolvedValueOnce({ kind: "ready", weather: SUNNY })
      .mockResolvedValueOnce({ kind: "ready", weather: LATER });
    const { result } = await mount();
    advance(60_000);
    await dayChange();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
    expect(result.current.weather).toEqual(LATER);
  });

  it("TTL 이 지나 다시 조회하는 중에는 이전 값을 두고, 실패로 끝나면 숨긴다(MF-2)", async () => {
    const { result } = await mount();
    const pending = deferred<CurrentWeatherResult>();
    jest.mocked(fetchCurrentWeather).mockReturnValueOnce(pending.promise);
    advance(HOME_WEATHER_TTL_MS);
    await focusAgain();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("ready");
    expect(result.current.weather).toEqual(SUNNY);
    pending.resolve({ kind: "unavailable" });
    await flush();
    expect(result.current.status).toBe("hidden");
    expect(result.current.weather).toBeNull();
  });

  it("TTL 안이어도 새 조회가 실패하면 이전 스티커를 버리고 숨긴다(MF-2)", async () => {
    const { result } = await mount();
    jest.mocked(fetchCurrentWeather).mockResolvedValueOnce({ kind: "unavailable" });
    advance(60_000);
    await dayChange();
    expect(result.current.status).toBe("hidden");
    expect(result.current.weather).toBeNull();
  });

  it("조회 중 위치를 못 찾으면(서비스 꺼짐 · 12초) 서버를 부르지 않고 숨긴다", async () => {
    jest.mocked(locateRounded).mockResolvedValue({ kind: "unavailable" });
    const { result } = await mount();
    expect(fetchCurrentWeather).not.toHaveBeenCalled();
    expect(result.current.status).toBe("hidden");
  });

  it("실패한 뒤에도 마지막 시도부터 30분은 다시 묻지 않는다(결정 D2)", async () => {
    jest.mocked(fetchCurrentWeather).mockResolvedValue({ kind: "unavailable" });
    const { result } = await mount();
    advance(HOME_WEATHER_TTL_MS - 1);
    await focusAgain();
    await foreground();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("hidden");
    advance(1);
    jest.mocked(fetchCurrentWeather).mockResolvedValue({ kind: "ready", weather: SUNNY });
    await focusAgain();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("ready");
  });

  it("실패 직후 하루가 바뀌어도 30분 전에는 다시 묻지 않는다(결정 D2)", async () => {
    jest.mocked(fetchCurrentWeather).mockResolvedValue({ kind: "unavailable" });
    const { result } = await mount();
    advance(60_000);
    await dayChange();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(1);
    // 보이지 않을 때 넘어가 다음 포커스가 보는 길도 같다
    await flush(() => mockBlur?.());
    await dayChange();
    advance(HOME_WEATHER_TTL_MS - 60_000 - 1);
    await flush(() => mockFocus?.());
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("hidden");
    advance(1);
    jest.mocked(fetchCurrentWeather).mockResolvedValue({ kind: "ready", weather: SUNNY });
    await dayChange();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("ready");
  });

  it("위치를 못 찾은 실패도 하루 전환이 30분을 지우지 않는다", async () => {
    jest.mocked(locateRounded).mockResolvedValue({ kind: "unavailable" });
    await mount();
    expect(locateRounded).toHaveBeenCalledTimes(1);
    advance(60_000);
    await dayChange();
    expect(locateRounded).toHaveBeenCalledTimes(1);
  });

  it("보이지 않을 때의 복귀 · 하루 전환은 점검하지 않는다 — 다음 포커스가 본다", async () => {
    await mount();
    await flush(() => mockBlur?.());
    await foreground();
    await dayChange();
    expect(getLocationPermission).toHaveBeenCalledTimes(1);
    await flush(() => mockFocus?.());
    // 하루가 넘어갔으니 TTL 안이어도 다시 조회한다
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
  });
});

describe("철회 · 서비스 꺼짐 (MF-2 · MF-2A)", () => {
  it("복귀 때 권한이 denied 로 바뀌었으면 조회 없이 즉시 숨기고 안내도 띄우지 않는다", async () => {
    const { result } = await mount();
    permission = "denied";
    await foreground();
    expect(result.current.status).toBe("hidden");
    expect(result.current.weather).toBeNull();
    expect(locateRounded).toHaveBeenCalledTimes(1);
    expect(readWeatherIntroSeen).not.toHaveBeenCalled();
  });

  it("TTL 안이어도 복귀 때 위치 서비스가 꺼져 있으면 조회 없이 숨긴다", async () => {
    const { result } = await mount();
    serviceOn = false;
    await foreground();
    expect(result.current.status).toBe("hidden");
    expect(result.current.weather).toBeNull();
    expect(locateRounded).toHaveBeenCalledTimes(1);
  });

  it("철회 뒤 다시 허용하고 돌아오면 TTL 이 남아 있어도 새로 조회한다", async () => {
    const { result } = await mount();
    permission = "denied";
    await foreground();
    permission = "granted";
    await foreground();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("ready");
  });

  it("서비스를 다시 켜고 돌아오면 TTL 이 남아 있어도 새로 조회한다", async () => {
    const { result } = await mount();
    serviceOn = false;
    await foreground();
    serviceOn = true;
    await foreground();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("ready");
  });
});

describe("늦은 응답 버리기 (MF-2B)", () => {
  const startPending = async () => {
    const pending = deferred<CurrentWeatherResult>();
    jest.mocked(fetchCurrentWeather).mockReturnValueOnce(pending.promise);
    const view = await mount();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(1);
    expect(view.result.current.status).toBe("hidden");
    return { ...view, pending };
  };

  it("조회 중 복귀로 권한 denied 를 확인하면 앞선 조회의 성공이 와도 나타나지 않는다", async () => {
    const { result, pending } = await startPending();
    permission = "denied";
    await foreground();
    pending.resolve({ kind: "ready", weather: SUNNY });
    await flush();
    expect(result.current.status).toBe("hidden");
    expect(result.current.weather).toBeNull();
  });

  it("조회 중 위치 서비스 꺼짐을 확인한 뒤의 늦은 성공도 버린다", async () => {
    const { result, pending } = await startPending();
    serviceOn = false;
    await foreground();
    pending.resolve({ kind: "ready", weather: SUNNY });
    await flush();
    expect(result.current.status).toBe("hidden");
  });

  it("로그아웃 뒤 도착한 앞선 조회의 성공을 버린다", async () => {
    const { result, pending } = await startPending();
    await act(async () => useAuth.setState({ status: "anonymous" }));
    user = null;
    pending.resolve({ kind: "ready", weather: SUNNY });
    await flush();
    expect(result.current.status).toBe("hidden");
    expect(result.current.weather).toBeNull();
  });

  it("무효화된 조회가 끝나기 전에 다시 허용하고 돌아오면 새 조회가 시작되고 새 응답만 반영된다", async () => {
    const { result, pending } = await startPending();
    permission = "denied";
    await foreground();
    const second = deferred<CurrentWeatherResult>();
    jest.mocked(fetchCurrentWeather).mockReturnValueOnce(second.promise);
    permission = "granted";
    await foreground();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
    second.resolve({ kind: "ready", weather: LATER });
    await flush();
    pending.resolve({ kind: "ready", weather: SUNNY });
    await flush();
    expect(result.current.weather).toEqual(LATER);
  });

  it("같은 세대의 조회가 진행 중이면 새로 떠나지 않는다", async () => {
    await startPending();
    advance(HOME_WEATHER_TTL_MS);
    await foreground();
    await focusAgain();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(1);
  });
});

describe("계정 격리", () => {
  it("로그아웃하면 비운다", async () => {
    const { result } = await mount();
    expect(result.current.status).toBe("ready");
    await act(async () => useAuth.setState({ status: "anonymous" }));
    expect(result.current.status).toBe("hidden");
    expect(result.current.weather).toBeNull();
  });

  it("다른 사용자로 바뀐 응답은 버린다", async () => {
    const pending = deferred<CurrentWeatherResult>();
    jest.mocked(fetchCurrentWeather).mockReturnValueOnce(pending.promise);
    const { result } = await mount();
    user = 8;
    pending.resolve({ kind: "ready", weather: SUNNY });
    await flush();
    expect(result.current.status).toBe("hidden");
    expect(result.current.weather).toBeNull();
  });

  it("A 의 값을 B 가 넘겨받지 않는다 — B 로 다시 들어오면 TTL 과 무관하게 B 로 새로 조회한다", async () => {
    const { result } = await mount();
    await act(async () => useAuth.setState({ status: "anonymous" }));
    user = 8;
    jest.mocked(fetchCurrentWeather).mockResolvedValueOnce({ kind: "ready", weather: LATER });
    await act(async () => useAuth.setState({ status: "authenticated" }));
    await flush();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
    expect(result.current.weather).toEqual(LATER);
  });

  it("위치를 기다리는 사이 계정이 바뀌면 이전 조회를 서버로 보내지 않는다", async () => {
    const located = deferred<RoundedPosition>();
    jest.mocked(locateRounded).mockReturnValueOnce(located.promise);
    const { result } = await mount();
    expect(locateRounded).toHaveBeenCalledTimes(1);
    user = 8; // 인증 상태는 그대로 — 효과가 아직 세대를 올리지 않은 틈
    located.resolve(SEOUL);
    await flush();
    expect(fetchCurrentWeather).not.toHaveBeenCalled();
    expect(result.current.status).toBe("hidden");
    expect(result.current.weather).toBeNull();

    // 다음 점검은 새 사용자로 새로 조회한다 — 버린 시도의 30분을 넘겨받지 않는다
    jest.mocked(fetchCurrentWeather).mockResolvedValueOnce({ kind: "ready", weather: LATER });
    await focusAgain();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(1);
    expect(result.current.weather).toEqual(LATER);
  });

  it("위치를 기다리는 사이 로그아웃하면 서버로 보내지 않는다", async () => {
    const located = deferred<RoundedPosition>();
    jest.mocked(locateRounded).mockReturnValueOnce(located.promise);
    const { result } = await mount();
    user = null;
    await act(async () => useAuth.setState({ status: "anonymous" }));
    located.resolve(SEOUL);
    await flush();
    expect(fetchCurrentWeather).not.toHaveBeenCalled();
    expect(result.current.status).toBe("hidden");
  });

  it("세션 사용자가 바뀐 것을 점검에서 알면 이전 사용자의 값을 버리고 새로 조회한다", async () => {
    const { result } = await mount();
    user = 8;
    jest.mocked(fetchCurrentWeather).mockResolvedValueOnce({ kind: "unavailable" });
    await foreground();
    expect(fetchCurrentWeather).toHaveBeenCalledTimes(2);
    expect(result.current.weather).toBeNull();
  });
});

it("언마운트하면 구독을 풀고 늦은 응답을 버린다", async () => {
  const pending = deferred<CurrentWeatherResult>();
  jest.mocked(fetchCurrentWeather).mockReturnValueOnce(pending.promise);
  const { unmount } = await mount();
  await unmount();
  expect(mockStopForeground).toHaveBeenCalled();
  expect(mockStopDay).toHaveBeenCalled();
  pending.resolve({ kind: "ready", weather: SUNNY });
  await flush();
});
