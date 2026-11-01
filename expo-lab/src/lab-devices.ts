/**
 * Expo Lab 기기 사양 — **셸(기기 외형)과 프레임(앱 안의 안전 영역)이 같은 표를 쓴다.**
 *
 * 단위: iOS 는 pt, Android 는 dp(= 앱이 보는 논리 크기). **추정으로 그리지 않는다** — 각 줄의
 * `source` 에 값이 어디서 왔는지, 확인 못 하고 환산·도출한 값이 무엇인지 적는다.
 *
 * 출처 (2026-11-02 갈래 C 가 확인):
 * - iOS 화면 크기 · 안전 영역 · 상태바 높이 — useyourloaf.com 「iPhone 12 / 14 / 16 screen sizes」
 *   (Xcode 시뮬레이터에서 잰 값). 16e 는 화면이 iPhone 14 와 같은 판이다(390×844 · 노치).
 * - iOS 화면 모서리(`_displayCornerRadius`) — github.com/kylebshr/ScreenCorners 표
 *   (기기에서 읽은 값을 모은 표 · Apple 공식 문서는 없다).
 * - Dynamic Island 126×37.33pt @ y11 — Apple Design Resources(iOS 16+ UI kit)의 14 Pro 값.
 *   16 Pro 의 y14 는 **도출**이다: 안전 영역 62 − 섬 37.33 − (14 Pro 의 아래 틈 59−11−37.33=10.67).
 * - 노치 크기 — Apple 이 pt 로 공개하지 않는다. iPhone 13 노치 실물 26.8×5.35mm(Mac Otakara
 *   실측 보도)를 화소 밀도로 **환산한 근사**다(14/16e: 460ppi÷3 · 13 mini: 476ppi÷2.88).
 * - Android — 로컬 Android SDK 가 정본이다: `skins/pixel_8/layout`(외형 이미지 안의 화면 위치) ·
 *   `mask.webp`(화면 모서리) · Android Studio `sdklib.jar` 의 `devices.xml`(1080×2400 @ 420dpi) ·
 *   그리고 **Pixel_8 AVD(Android 16 · 제스처 탐색)를 띄워 `dumpsys window` 로 읽은 값**
 *   (상태바 132px · 탐색 막대 63px · 펀치홀 `cutoutSpec` · 제스처 손잡이 위치).
 * - Galaxy S24 는 뺐다 — 기본 화면 배율(dp 크기)·펀치홀·상태바를 로컬 자료로 확인할 수 없다.
 */
import type { LabPlatform } from "./lab-contract";

export type Insets = { top: number; bottom: number; left: number; right: number };

export type DeviceCutout =
  | { kind: "none" }
  | { kind: "notch"; width: number; height: number }
  | { kind: "dynamic-island"; width: number; height: number; top: number }
  | { kind: "punch-hole"; diameter: number; top: number; centerX: number };

/**
 * Android 에뮬레이터 외형(스킨). 값은 SDK `skins/<name>/layout` 의 px 그대로다.
 * 이미지는 저장소에 없다 — `node expo-lab/scripts/link-device-skins.mjs` 가 로컬 SDK 에서
 * `expo-lab/public/device-skins/<name>/` 로 복사한다(gitignore). 없으면 셸이 SVG 외형으로 그린다.
 */
export type DeviceSkin = {
  name: string;
  /** back.webp 전체 크기(px) */
  frameWidth: number;
  frameHeight: number;
  /** back.webp 안에서 화면이 놓이는 자리(px) */
  displayX: number;
  displayY: number;
  /** 화면 크기(px) — mask.webp 크기와 같다 */
  displayWidth: number;
  displayHeight: number;
};

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
  /** 상태바 높이(외형용). iOS 노치·섬 기기는 안전 영역보다 작다 */
  statusBarHeight: number;
  /** 하단: iOS 홈 인디케이터 / Android 제스처 바 / 홈 버튼 */
  bottomBar: "home-indicator" | "gesture-bar" | "home-button";
  /** Android 에뮬레이터 스킨(있으면 셸이 실제 외형 이미지로 그린다) */
  skin?: DeviceSkin;
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
    source: "크기 useyourloaf(375×667 @2x) · 상태바 20pt(홈 버튼 기기 공통) · 둥근 화면 없음",
  },
  {
    id: "iphone-13-mini",
    label: "iPhone 13 mini",
    platform: "ios",
    width: 375,
    height: 812,
    insets: { top: 50, bottom: 34, left: 0, right: 0 },
    cornerRadius: 44,
    cutout: { kind: "notch", width: 174, height: 35 },
    statusBarHeight: 44,
    bottomBar: "home-indicator",
    source:
      "크기·안전 영역 50/34·상태바 44 useyourloaf(12 mini) · 모서리 44 ScreenCorners · 노치 174×35 는 실물 환산 근사",
  },
  {
    id: "iphone-16e",
    label: "iPhone 16e",
    platform: "ios",
    width: 390,
    height: 844,
    insets: { top: 47, bottom: 34, left: 0, right: 0 },
    cornerRadius: 47.33,
    cutout: { kind: "notch", width: 162, height: 32 },
    statusBarHeight: 47,
    bottomBar: "home-indicator",
    source:
      "크기·안전 영역 47/34·상태바 47 useyourloaf(iPhone 14 와 같은 판) · 모서리 47.33 ScreenCorners · 노치 162×32 는 실물 환산 근사",
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
    source:
      "크기·안전 영역 59/34·상태바 54 useyourloaf · 모서리 55 ScreenCorners · 섬 126×37.33 @ y11 Apple Design Resources",
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
    source:
      "크기·안전 영역 62/34·상태바 54 useyourloaf · 모서리 62 ScreenCorners · 섬 위치 y14 는 안전 영역에서 도출",
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
    source:
      "크기·안전 영역 59/34·상태바 54 useyourloaf · 모서리 55 ScreenCorners · 섬 126×37.33 @ y11 Apple Design Resources",
  },
  {
    id: "pixel-8",
    label: "Pixel 8",
    platform: "android",
    // 1080×2400 @ 420dpi(×2.625) = 411.43×914.29dp — Chrome DevTools 와 같이 412×915 로 올린다
    width: 412,
    height: 915,
    // AVD 실측: statusBars 132px = 50.29dp · navigationBars(제스처) 63px = 24dp
    insets: { top: 50.29, bottom: 24, left: 0, right: 0 },
    // 스킨 mask.webp 의 모서리 원 맞춤 ≈ 88px = 33.5dp
    // (참고: 에뮬레이터 시스템 이미지의 RoundedCorners 는 104px — 스킨이 실제 외형이라 스킨을 따른다)
    cornerRadius: 33.5,
    // AVD cutoutSpec `m 576,65.75 a 36.25,36.25 …` — 지름 72.5px · 위 29.5px · 가운데 540px
    cutout: { kind: "punch-hole", diameter: 27.62, top: 11.24, centerX: 206 },
    statusBarHeight: 50.29,
    bottomBar: "gesture-bar",
    skin: {
      name: "pixel_8",
      frameWidth: 1187,
      frameHeight: 2513,
      displayX: 49,
      displayY: 55,
      displayWidth: 1080,
      displayHeight: 2400,
    },
    source:
      "Android SDK — devices.xml(1080×2400 @420dpi) · skins/pixel_8(layout·mask) · Pixel_8 AVD(Android 16) dumpsys 실측",
  },
];

export const DEFAULT_DEVICE_ID = { ios: "iphone-16", android: "pixel-8" } as const;

export const findDevice = (id: string | null | undefined): LabDevice =>
  labDevices.find((device) => device.id === id) ?? labDevices.find((d) => d.id === "iphone-16")!;

/**
 * 하단 막대 외형 — iOS 홈 인디케이터 134×5pt · 아래 8pt(Apple HIG 기본 판),
 * Android 제스처 손잡이 108×3.81dp · 아래 9.9dp(Pixel_8 AVD 화면 캡처에서 잰 값).
 */
export const BOTTOM_BAR_SHAPE = {
  "home-indicator": { width: 134, height: 5, bottom: 8 },
  "gesture-bar": { width: 108, height: 3.81, bottom: 9.9 },
} as const;
