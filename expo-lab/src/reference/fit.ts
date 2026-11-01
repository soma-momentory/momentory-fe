/**
 * 시안 이미지 크기 → 기기 화면(CSS px) 배치 계산.
 *
 * 시안은 대개 화면 배율로 뽑힌다 — iPhone 16 Pro @3x 면 1206×2622, @1x 면 402×874,
 * 피그마 프레임은 아무 크기나(@2x 내보내기 786×1704 …). 그래서 기본은 **폭 맞춤**이다: 이미지 폭을
 * 기기 폭에 맞추면 배율이 무엇이든 같은 자리에 놓인다. 배율 추정(`guessPixelRatio`)은
 * 「실제 배율」로 볼 때(`fit: "none"`)의 기본값과 안내 문구에만 쓴다.
 *
 * ⚠ 상태바 — 피그마 · Claude Design 의 화면은 대개 **상태바까지 든 전체 화면**이다. Lab 도 상태바를
 * 화면 위에 그리므로(`shell/device/StatusBar`) 오버레이는 상태바 자리까지 덮는 전체 화면으로 놓는다.
 * 상태바 없이 내용만 뽑은 시안이면 높이가 안전 영역 위 여백만큼 짧다 — `detectStatusBar` 가 그걸
 * 알아보고, 패널이 「아래로 {inset}px」을 제안한다.
 */
import type { LabDevice } from "../lab-devices";
import type { ReferenceAlign } from "./types";

/** 흔한 내보내기 배율 — iOS 1·2·3 · Android 밀도 버킷(1.5 · 2.625 · 2.75 · 3.5 · 4) */
export const KNOWN_PIXEL_RATIOS = [1, 1.5, 2, 2.625, 2.75, 3, 3.5, 4] as const;

export type PixelRatioGuess = {
  /** 가장 가까운 알려진 배율 */
  ratio: number;
  /** 이미지 폭 ÷ 기기 폭 그대로 */
  raw: number;
  /** 알려진 배율과 1% 안으로 맞는가 — 아니면 다른 기기 폭 · 임의 크기 프레임이다 */
  exact: boolean;
};

export function guessPixelRatio(naturalWidth: number, deviceWidth: number): PixelRatioGuess {
  const raw = deviceWidth > 0 ? naturalWidth / deviceWidth : 1;
  let ratio: number = KNOWN_PIXEL_RATIOS[0];
  for (const candidate of KNOWN_PIXEL_RATIOS) {
    if (Math.abs(candidate - raw) < Math.abs(ratio - raw)) ratio = candidate;
  }
  return { ratio, raw, exact: Math.abs(raw - ratio) / ratio <= 0.01 };
}

/** 이미지 1px 이 기기 화면에서 몇 CSS px 인가 */
export function displayScale(
  align: Pick<ReferenceAlign, "fit" | "scale">,
  naturalWidth: number,
  deviceWidth: number,
): number {
  const base = align.fit === "width" && naturalWidth > 0 ? deviceWidth / naturalWidth : 1;
  return base * align.scale;
}

export type ReferenceLayout = {
  /** 화면 안에 놓인 이미지의 CSS 크기 · 자리 */
  width: number;
  height: number;
  left: number;
  top: number;
  scale: number;
};

export function referenceLayout(
  align: ReferenceAlign,
  natural: { width: number; height: number },
  deviceWidth: number,
): ReferenceLayout {
  const scale = displayScale(align, natural.width, deviceWidth);
  return {
    width: natural.width * scale,
    height: natural.height * scale,
    left: align.offsetX,
    top: align.offsetY,
    scale,
  };
}

/**
 * 「기기 폭에 맞춤」을 켜고 끌 때 — 끄면 추정 배율의 실제 크기(@3x → 1/3)로, 켜면 폭 맞춤 1배로.
 * 이동은 그대로 둔다.
 */
export function toggleFit(
  align: ReferenceAlign,
  naturalWidth: number,
  deviceWidth: number,
): ReferenceAlign {
  if (align.fit === "width") {
    const { ratio } = guessPixelRatio(naturalWidth, deviceWidth);
    return { ...align, fit: "none", scale: 1 / ratio };
  }
  return { ...align, fit: "width", scale: 1 };
}

export type StatusBarGuess = "included" | "missing" | "unknown";

/**
 * 폭을 맞췄을 때 높이가 화면 높이면 상태바까지 든 전체 화면, 화면 높이 − 위 안전 영역이면
 * 상태바 없이 뽑은 시안으로 본다(2px 안 · 반올림 여유). 그 밖(긴 스크롤 프레임 등)은 모른다.
 */
export function detectStatusBar(
  natural: { width: number; height: number },
  device: Pick<LabDevice, "width" | "height" | "insets">,
): StatusBarGuess {
  if (natural.width <= 0) return "unknown";
  const height = (natural.height * device.width) / natural.width;
  if (Math.abs(height - device.height) <= 2) return "included";
  if (Math.abs(height - (device.height - device.insets.top)) <= 2) return "missing";
  return "unknown";
}

const trim = (value: number) => String(Math.round(value * 1000) / 1000);

/** 패널에 보일 한 줄 — 「1206×2622 · @3x(402×874) · 이 기기와 같은 판」 */
export function describeFit(
  natural: { width: number; height: number },
  device: Pick<LabDevice, "width" | "height" | "insets" | "label">,
): string {
  const guess = guessPixelRatio(natural.width, device.width);
  const size = `${natural.width}×${natural.height}`;
  const statusBar = detectStatusBar(natural, device);
  const tail =
    statusBar === "included"
      ? " · 상태바까지 든 전체 화면"
      : statusBar === "missing"
        ? ` · 상태바 없이 뽑은 것 같아요(위 ${trim(device.insets.top)}px 짧음)`
        : "";
  if (guess.exact) {
    const cssHeight = natural.height / guess.ratio;
    const sameHeight = Math.abs(cssHeight - device.height) <= 1;
    return `${size} · @${trim(guess.ratio)}x(${trim(device.width)}×${trim(cssHeight)})${
      sameHeight ? ` · ${device.label}와 같은 판` : ""
    }${tail}`;
  }
  return `${size} · 알려진 배율이 아니에요 — ${device.label} 폭(${trim(device.width)})에 맞춰 ${trim(
    1 / guess.raw,
  )}배로 놓아요${tail}`;
}
