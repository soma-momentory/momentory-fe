/**
 * 기기별 **화면 키보드 높이** — 한국어 사용자가 보는 그대로(예측 · 추천 막대 포함, 세로 화면).
 *
 * 단위는 `lab-devices.ts` 와 같다(iOS pt · Android dp). 값마다 `source` 에 어디서 왔는지,
 * 무엇을 확인하지 못했는지 적는다 — **추정은 추정이라고 적는다.**
 *
 * ## 높이를 셋으로 나눈다
 *
 * ```
 * ┌──────────────────────────┐  ← 키보드 윗변(screenY)
 * │ suggestionBar            │  iOS 예측 막대 / Gboard 도구 · 추천 줄
 * ├──────────────────────────┤
 * │ keys (네 줄)              │
 * ├──────────────────────────┤
 * │ bottomArea               │  iOS 지구본 · 마이크 줄(홈 인디케이터 자리 포함, 홈 버튼 기기는 0)
 * └──────────────────────────┘  Android 시스템 내비게이션 자리(키보드 바탕이 그 뒤까지 깔린다)
 * ```
 *
 * `total` 이 화면 바닥에서 키보드 윗변까지다. 앱이 받는 이벤트의 `endCoordinates.height` 는
 * **플랫폼마다 다르다**(RN 네이티브 그대로):
 * - iOS — `total` 그대로(UIKit 의 키보드 프레임은 홈 인디케이터 자리까지 덮는다).
 * - Android — `total - 내비게이션 inset`. RN 의 `ReactRootView` 가 `ime.bottom - systemBars.bottom`
 *   을 보낸다(`src/components/ds/BottomSheet.tsx` 머리말이 실기기에서 밟은 그 차이).
 *   `screenY` 는 둘 다 키보드 윗변의 화면 좌표다.
 *
 * ## 출처
 *
 * - **iOS 키 네 줄 216pt / 226pt(414pt 이상 넓은 판)** — UIKit 표준 키보드 높이로 오래 알려진 값
 *   (Stack Overflow 11284321 의 기기별 표 · iOS 11 기준). Apple 이 공식 문서로 내지 않는다.
 * - **iOS 예측 막대 44~45pt** · **Face ID 기기의 지구본 · 마이크 줄 75pt** — 개발자들이
 *   `keyboardWillShow` 의 끝 프레임으로 잰 값의 차이에서 나온다:
 *   iPhone X 291pt(막대 없음, 같은 글 댓글) → 335pt(막대 있음) · iPhone 11(414pt 판) 346pt 에서
 *   막대가 빠지면 301pt(Apple Developer Forums thread 798087 — 「45pt suggestion bar」).
 *   ⇒ 216 + 44 + 75 = 335 · 226 + 45 + 75 = 346 이 서로 맞는다.
 * - **한국어 두벌식** — iOS 한국어 키보드는 영문 QWERTY 와 같은 네 줄 판이고 예측(자동 완성) 막대도
 *   있다. **한국어 판을 따로 재지는 못했다** — 영문 판 값을 그대로 쓴다.
 * - **Android(Pixel 8)** — 로컬 Pixel_8 AVD(Android 16 · Play 이미지 · Gboard 기본 높이 · 영어 판)를
 *   띄워 연락처 입력칸을 누르고 `dumpsys window InputMethod` 로 **실측**했다(2026-11-02):
 *   키보드 윗변 y=1517px → 바닥까지 883px = **336.38dp**(내비 63px = 24dp 포함),
 *   `mImeHeight` 820px = 312.38dp(= RN 이 보낼 `height`). Gboard 두벌식도 네 줄 판이라 같은 높이로
 *   본다(**한국어 판은 재지 않았다**). 도구 줄 / 키 줄의 나눔은 그림을 위한 근사다(합계만 실측).
 */
import { findDevice, type LabDevice } from "../../lab-devices";

export type KeyboardStyle = "ios" | "android";

export type KeyboardSpec = {
  style: KeyboardStyle;
  /** 예측 · 추천 막대(Android 는 Gboard 도구 줄) */
  suggestionBar: number;
  /** 키 네 줄 */
  keys: number;
  /** iOS: 지구본 · 마이크 줄(홈 버튼 기기 0) / Android: 시스템 내비게이션 자리 */
  bottomArea: number;
  /** 화면 바닥 → 키보드 윗변. = suggestionBar + keys + bottomArea */
  total: number;
  /** 앱 이벤트의 `endCoordinates.height`(위 머리말) */
  eventHeight: number;
  /** 값의 출처 · 확인 못 한 것 */
  source: string;
};

/** iOS 키보드 애니메이션 — UIKit 이 `keyboardWillShow` 에 싣는 0.25초(RN 은 ms 로 250) */
export const IOS_KEYBOARD_DURATION_MS = 250;
/**
 * iOS 키보드 곡선(UIViewAnimationCurve 7 · 공개되지 않은 스프링)의 CSS 근사. 그림에만 쓴다 —
 * 앱이 받는 `easing` 은 RN 네이티브처럼 `"keyboard"` 다.
 */
export const IOS_KEYBOARD_CSS_EASING = "cubic-bezier(0.38, 0.7, 0.125, 1)";
/**
 * Android IME 인셋 애니메이션은 대략 0.25~0.3초다(기기 · 키보드마다 다르다 — **재지 않았다**).
 * RN Android 는 `keyboardDidShow` 에 `duration: 0` 을 싣는다 — 이 값은 그림의 움직임에만 쓴다.
 */
export const ANDROID_KEYBOARD_DURATION_MS = 250;
export const ANDROID_KEYBOARD_CSS_EASING = "cubic-bezier(0.2, 0, 0, 1)";

const IOS_SOURCE_COMMON =
  "키 216pt(Stack Overflow 11284321 기기별 표) + 예측 막대 · Face ID 하단 줄은 iPhone X 291→335pt 실측 보고에서 도출 · 한국어 판은 따로 재지 못했다";

type IosRow = { suggestionBar: number; keys: number; bottomArea: number; source: string };

/** 기기 id → iOS 높이. 새 기기는 여기에 한 줄을 더한다(없으면 `iosFallback`) */
const IOS_TABLE: Record<string, IosRow> = {
  "iphone-se-3": {
    suggestionBar: 44,
    keys: 216,
    bottomArea: 0,
    source: `260pt — 4.7형 홈 버튼 판. ${IOS_SOURCE_COMMON}`,
  },
  "iphone-13-mini": {
    suggestionBar: 44,
    keys: 216,
    bottomArea: 75,
    source: `335pt — iPhone X 와 같은 375×812 판(291pt + 예측 44pt 보고값). ${IOS_SOURCE_COMMON}`,
  },
  "iphone-16e": {
    suggestionBar: 45,
    keys: 216,
    bottomArea: 75,
    source: `336pt — 390pt 판(12 · 13 · 14 와 같다). 개발자 보고값 336pt 와 맞는다. ${IOS_SOURCE_COMMON}`,
  },
  "iphone-16": {
    suggestionBar: 45,
    keys: 216,
    bottomArea: 75,
    source: `336pt — 393pt 판(14 Pro · 15 와 같다). ${IOS_SOURCE_COMMON}`,
  },
  "iphone-16-pro": {
    suggestionBar: 45,
    keys: 216,
    bottomArea: 75,
    source: `336pt — **도출**: 402pt 판은 414pt 미만이라 키 줄이 216pt 판이라고 본다(이 판의 실측 보고는 찾지 못했다). ${IOS_SOURCE_COMMON}`,
  },
  "iphone-16-plus": {
    suggestionBar: 45,
    keys: 226,
    bottomArea: 75,
    source:
      "346pt — 넓은 판(414pt 이상). iPhone 11(414pt) 346pt · 막대 45pt 보고(Apple Developer Forums 798087)와 같은 판으로 본다. 한국어 판은 따로 재지 못했다",
  },
};

/** 실측한 Pixel 8 의 Gboard — 내비 자리를 뺀 키보드 몸통(dp) */
const GBOARD_BODY = 312.38;
const GBOARD_TOOLBAR = 52;

const ANDROID_TABLE: Record<string, { body: number; source: string }> = {
  "pixel-8": {
    body: GBOARD_BODY,
    source:
      "336.38dp — Pixel_8 AVD(Android 16 · Gboard 기본 높이 · 영어 판) dumpsys 실측: 윗변 y1517px · mImeHeight 820px @420dpi. 한국어 두벌식은 같은 네 줄 판으로 본다(재지 않았다). 도구 줄 52dp / 키 줄 나눔은 그림용 근사",
  },
};

const iosSpec = (row: IosRow): KeyboardSpec => {
  const total = row.suggestionBar + row.keys + row.bottomArea;
  return { style: "ios", ...row, total, eventHeight: total };
};

/**
 * 표에 없는 iOS 기기 — 화면 판으로 고른다: 414pt 이상이면 넓은 판(346), 홈 인디케이터가 있으면
 * 336, 홈 버튼 기기면 260. **표에 없는 기기는 확인한 값이 아니다.**
 */
function iosFallback(device: LabDevice): KeyboardSpec {
  const wide = device.width >= 414;
  const homeIndicator = device.insets.bottom > 0;
  return iosSpec({
    suggestionBar: homeIndicator ? 45 : 44,
    keys: wide ? 226 : 216,
    bottomArea: homeIndicator ? 75 : 0,
    source: `표에 없는 기기(${device.id}) — 화면 판으로 고른 값(확인하지 않았다)`,
  });
}

/**
 * Android — Gboard 몸통은 dp 로 거의 같다고 보고(폰 판) **Pixel 8 실측 몸통 + 그 기기의 내비 inset**.
 * 표에 없는 기기(갈래 G 가 더할 Galaxy 360dp 판 등)도 이 규칙을 따른다 — 삼성 키보드는 재지 않았다.
 */
function androidSpec(device: LabDevice): KeyboardSpec {
  const row = ANDROID_TABLE[device.id] ?? {
    body: GBOARD_BODY,
    source: `표에 없는 기기(${device.id}) — Pixel 8 Gboard 실측 몸통 312.38dp + 기기 내비 inset(확인하지 않았다 · 삼성 키보드는 재지 않았다)`,
  };
  const nav = device.insets.bottom;
  return {
    style: "android",
    suggestionBar: GBOARD_TOOLBAR,
    keys: row.body - GBOARD_TOOLBAR,
    bottomArea: nav,
    total: row.body + nav,
    eventHeight: row.body,
    source: row.source,
  };
}

/** 기기 하나의 키보드. 기기 id 를 모르면 `findDevice` 처럼 iPhone 16 으로 물러선다 */
export function keyboardSpecFor(deviceOrId: LabDevice | string | null | undefined): KeyboardSpec {
  const device =
    typeof deviceOrId === "object" && deviceOrId != null ? deviceOrId : findDevice(deviceOrId);
  if (device.platform === "android") return androidSpec(device);
  const row = IOS_TABLE[device.id];
  return row ? iosSpec(row) : iosFallback(device);
}

/** 표에 직접 적힌 기기 id — 테스트가 `lab-devices` 와 대조한다 */
export const MEASURED_KEYBOARD_DEVICE_IDS = [
  ...Object.keys(IOS_TABLE),
  ...Object.keys(ANDROID_TABLE),
] as const;
