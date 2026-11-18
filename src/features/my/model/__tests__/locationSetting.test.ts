import { act, renderHook } from "@testing-library/react-native";
import { useEffect as mockUseEffect } from "react";

import { useLocationSetting } from "@/features/my/model/locationSetting";
import {
  canAskLocationAgain,
  getLocationPermission,
  openLocationSettings,
  requestLocationPermission,
  type LocationPermission,
} from "@/lib/location";

let mockFocus: (() => void) | undefined;
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) =>
    mockUseEffect(() => {
      mockFocus = effect;
      effect();
    }, [effect]),
}));

let mockForeground: (() => void) | undefined;
jest.mock("@/lib/appState", () => ({
  onForeground: (handler: () => void) => {
    mockForeground = handler;
    return jest.fn();
  },
}));

jest.mock("@/lib/location", () => ({
  canAskLocationAgain: jest.fn(),
  getLocationPermission: jest.fn(),
  openLocationSettings: jest.fn(),
  requestLocationPermission: jest.fn(),
}));

const read = jest.mocked(getLocationPermission);
const request = jest.mocked(requestLocationPermission);
const settings = jest.mocked(openLocationSettings);
const canAskAgain = jest.mocked(canAskLocationAgain);

async function mount(permission: LocationPermission) {
  read.mockResolvedValue(permission);
  const hook = await renderHook(() => useLocationSetting());
  await act(async () => {});
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  settings.mockResolvedValue(true);
  canAskAgain.mockResolvedValue(false);
});

describe("권한 상태별 동작", () => {
  it("아직 묻지 않았으면 OS 권한 창을 띄우고 답을 다시 읽어 보여 준다", async () => {
    const { result } = await mount("undetermined");
    expect(result.current.row?.value).toBe("선택 전");

    request.mockResolvedValue("granted");
    read.mockResolvedValue("granted");
    await act(() => result.current.open());

    expect(request).toHaveBeenCalledTimes(1);
    expect(settings).not.toHaveBeenCalled();
    expect(result.current.row?.value).toBe("허용됨");
  });

  it("권한 창에서 거절하면 안내 없이 상태만 바뀐다", async () => {
    const { result } = await mount("undetermined");

    request.mockResolvedValue("denied");
    read.mockResolvedValue("denied");
    await act(() => result.current.open());

    expect(result.current.row?.value).toBe("허용 안 함");
    expect(result.current.note).toBeNull();
  });

  it.each([
    ["denied", "허용 안 함"],
    ["granted", "허용됨"],
  ] as const)("%s 상태는 묻지 않고 기기 설정을 연다", async (permission, value) => {
    const { result } = await mount(permission);
    expect(result.current.row?.value).toBe(value);

    await act(() => result.current.open());

    expect(settings).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });

  it("다시 물을 수 있는 거절(Android 의 첫 거절)은 기기 설정 대신 권한 창을 띄운다", async () => {
    const { result } = await mount("denied");
    canAskAgain.mockResolvedValue(true);
    request.mockResolvedValue("granted");
    read.mockResolvedValue("granted");

    await act(() => result.current.open());

    expect(request).toHaveBeenCalledTimes(1);
    expect(settings).not.toHaveBeenCalled();
    expect(result.current.row?.value).toBe("허용됨");
  });

  it("다시 거절해 막히면 다음 누름은 기기 설정으로 간다", async () => {
    const { result } = await mount("denied");
    canAskAgain.mockResolvedValueOnce(true);
    request.mockResolvedValue("denied");

    await act(() => result.current.open());
    expect(settings).not.toHaveBeenCalled();

    await act(() => result.current.open());
    expect(request).toHaveBeenCalledTimes(1);
    expect(settings).toHaveBeenCalledTimes(1);
  });

  it("허용된 상태는 다시 물을 수 있는지 보지 않고 기기 설정을 연다", async () => {
    const { result } = await mount("granted");
    canAskAgain.mockResolvedValue(true);

    await act(() => result.current.open());

    expect(canAskAgain).not.toHaveBeenCalled();
    expect(settings).toHaveBeenCalledTimes(1);
  });

  it("권한을 읽기 전에는 줄의 값이 없다", async () => {
    read.mockReturnValue(new Promise(() => {}));
    const { result } = await renderHook(() => useLocationSetting());

    expect(result.current.row).toBeNull();
  });
});

describe("다시 읽는 때", () => {
  it("기기 설정에서 허용하고 돌아오면 줄이 바뀐다", async () => {
    const { result } = await mount("denied");
    await act(() => result.current.open());

    read.mockResolvedValue("granted");
    await act(async () => mockForeground?.());

    expect(result.current.row?.value).toBe("허용됨");
  });

  it("기기 설정에서 끄고 돌아오면 줄이 바뀐다", async () => {
    const { result } = await mount("granted");
    await act(() => result.current.open());

    read.mockResolvedValue("denied");
    await act(async () => mockForeground?.());

    expect(result.current.row?.value).toBe("허용 안 함");
  });

  it("다른 탭에서 허용하고 포커스가 돌아오면 줄이 바뀐다", async () => {
    const { result } = await mount("undetermined");

    read.mockResolvedValue("granted");
    await act(async () => mockFocus?.());

    expect(result.current.row?.value).toBe("허용됨");
  });

  it("늦게 끝난 앞선 읽기가 나중 결과를 덮지 않는다", async () => {
    const { result } = await mount("denied");
    let finishOld: (value: LocationPermission) => void = () => {};
    read.mockReturnValueOnce(new Promise((resolve) => (finishOld = resolve)));
    read.mockResolvedValueOnce("granted");

    await act(async () => {
      mockForeground?.();
      mockForeground?.();
    });
    await act(async () => finishOld("denied"));

    expect(result.current.row?.value).toBe("허용됨");
  });
});

describe("실패와 중복", () => {
  it("기기 설정을 열지 못하면 한 줄로 알리고, 다시 누르면 지운다", async () => {
    const { result } = await mount("denied");

    settings.mockResolvedValueOnce(false);
    await act(() => result.current.open());
    expect(result.current.note).toContain("열지 못했어요");

    await act(() => result.current.open());
    expect(result.current.note).toBeNull();
  });

  it("권한 창을 띄우지 못하면 한 줄로 알린다", async () => {
    const { result } = await mount("undetermined");

    request.mockResolvedValue("unavailable");
    await act(() => result.current.open());

    expect(result.current.note).toContain("열지 못했어요");
  });

  it("권한 창이 떠 있는 동안 다시 눌러도 한 번만 묻는다", async () => {
    const { result } = await mount("undetermined");
    let answer: (value: "granted") => void = () => {};
    request.mockReturnValue(new Promise((resolve) => (answer = resolve)));

    await act(async () => {
      void result.current.open();
      void result.current.open();
    });
    await act(async () => answer("granted"));

    expect(request).toHaveBeenCalledTimes(1);
  });
});
