/**
 * Expo Lab 기기 사양 — **셸(기기 외형)과 프레임(앱 안의 안전 영역)이 같은 표를 쓴다.**
 *
 * 단위: iOS 는 pt, Android 는 dp(= 앱이 보는 논리 크기).
 * iOS 값은 Apple 의 기기 해상도·시뮬레이터 안전 영역을 따른다. Android 값과 외형 세부
 * (노치 크기 · 펀치홀 위치 · 상태바 높이)는 갈래 C 가 공식 자료(Android SDK 에뮬레이터 스킨 ·
 * AVD 설정 · Apple 사양)로 확인해 채운다 — **추정으로 그리지 않는다.** 출처는 각 줄 `source` 에 적는다.
 */
import type { LabPlatform } from "./lab-contract";

export type Insets = { top: number; bottom: number; left: number; right: number };

export type DeviceCutout =
  | { kind: "none" }
  | { kind: "notch"; width: number; height: number }
  | { kind: "dynamic-island"; width: number; height: number; top: number }
  | { kind: "punch-hole"; diameter: number; top: number; centerX: number };

export type LabDevice = {
  id: string;
  label: string;
  platform: LabPlatform;
  width: number;
  height: number;
  /** 앱이 받는 안전 영역 여백 (react-native-safe-area-context 값) */
  insets: Insets;
  /** 화면 모서리 곡률 */
  cornerRadius: number;
  cutout: DeviceCutout;
  /** 상태바 높이(외형용). 대개 insets.top 과 같다 */
  statusBarHeight: number;
  /** 하단: iOS 홈 인디케이터 / Android 제스처 바 / 홈 버튼 */
  bottomBar: "home-indicator" | "gesture-bar" | "home-button";
  /** 값의 출처 — 확인 못 한 값이 있으면 그렇다고 적는다 */
  source: string;
};

export const labDevices: readonly LabDevice[] = [
  {
    id: "iphone-se-3",
    label: "iPhone SE (3세대)",
    platform: "ios",
    width: 375,
    height: 667,
    insets: { top: 20, bottom: 0, left: 0, right: 0 },
    cornerRadius: 0,
    cutout: { kind: "none" },
    statusBarHeight: 20,
    bottomBar: "home-button",
    source: "Apple 해상도 · iOS 시뮬레이터 안전 영역",
  },
  {
    id: "iphone-13-mini",
    label: "iPhone 13 mini",
    platform: "ios",
    width: 375,
    height: 812,
    insets: { top: 50, bottom: 34, left: 0, right: 0 },
    cornerRadius: 44,
    cutout: { kind: "notch", width: 0, height: 0 },
    statusBarHeight: 50,
    bottomBar: "home-indicator",
    source: "Apple 해상도 · iOS 시뮬레이터 안전 영역 · 노치 크기 미확인(C 가 채운다)",
  },
  {
    id: "iphone-16e",
    label: "iPhone 16e",
    platform: "ios",
    width: 390,
    height: 844,
    insets: { top: 47, bottom: 34, left: 0, right: 0 },
    cornerRadius: 47.33,
    cutout: { kind: "notch", width: 0, height: 0 },
    statusBarHeight: 47,
    bottomBar: "home-indicator",
    source: "Apple 해상도 · iOS 시뮬레이터 안전 영역 · 노치 크기 미확인(C 가 채운다)",
  },
  {
    id: "iphone-16",
    label: "iPhone 16",
    platform: "ios",
    width: 393,
    height: 852,
    insets: { top: 59, bottom: 34, left: 0, right: 0 },
    cornerRadius: 55,
    cutout: { kind: "dynamic-island", width: 126, height: 37.33, top: 11 },
    statusBarHeight: 54,
    bottomBar: "home-indicator",
    source: "Apple 해상도 · iOS 시뮬레이터 안전 영역 · Dynamic Island 126×37.33 @ y11",
  },
  {
    id: "iphone-16-pro",
    label: "iPhone 16 Pro",
    platform: "ios",
    width: 402,
    height: 874,
    insets: { top: 62, bottom: 34, left: 0, right: 0 },
    cornerRadius: 62,
    cutout: { kind: "dynamic-island", width: 126, height: 37.33, top: 14 },
    statusBarHeight: 54,
    bottomBar: "home-indicator",
    source: "Apple 해상도 · iOS 시뮬레이터 안전 영역 · 모서리·섬 위치 C 가 확인",
  },
  {
    id: "iphone-16-plus",
    label: "iPhone 16 Plus",
    platform: "ios",
    width: 430,
    height: 932,
    insets: { top: 59, bottom: 34, left: 0, right: 0 },
    cornerRadius: 55,
    cutout: { kind: "dynamic-island", width: 126, height: 37.33, top: 11 },
    statusBarHeight: 54,
    bottomBar: "home-indicator",
    source: "Apple 해상도 · iOS 시뮬레이터 안전 영역",
  },
  {
    id: "pixel-8",
    label: "Pixel 8",
    platform: "android",
    width: 412,
    height: 915,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    cornerRadius: 0,
    cutout: { kind: "punch-hole", diameter: 0, top: 0, centerX: 206 },
    statusBarHeight: 0,
    bottomBar: "gesture-bar",
    source: "미확인 — C 가 로컬 Android SDK 의 Pixel_8 AVD · 에뮬레이터 스킨에서 채운다",
  },
  {
    id: "galaxy-s24",
    label: "Galaxy S24",
    platform: "android",
    width: 360,
    height: 780,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    cornerRadius: 0,
    cutout: { kind: "punch-hole", diameter: 0, top: 0, centerX: 180 },
    statusBarHeight: 0,
    bottomBar: "gesture-bar",
    source: "미확인 — C 가 공식 사양으로 채운다(확인 못 하면 목록에서 뺀다)",
  },
];

export const DEFAULT_DEVICE_ID = { ios: "iphone-16", android: "pixel-8" } as const;

export const findDevice = (id: string | null | undefined): LabDevice =>
  labDevices.find((device) => device.id === id) ?? labDevices.find((d) => d.id === "iphone-16")!;
