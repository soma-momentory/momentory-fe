import { describe, expect, it } from "@jest/globals";

import { findDevice } from "../../lab-devices";
import {
  describeFit,
  detectStatusBar,
  displayScale,
  guessPixelRatio,
  referenceLayout,
  toggleFit,
} from "../fit";
import { DEFAULT_ALIGN } from "../types";

const iphone16 = findDevice("iphone-16"); // 393×852 · 위 59
const iphone16Pro = findDevice("iphone-16-pro"); // 402×874 · 위 62
const pixel8 = findDevice("pixel-8"); // 412×915

describe("guessPixelRatio", () => {
  it("1x · 2x · 3x 내보내기를 알아본다", () => {
    expect(guessPixelRatio(393, 393)).toMatchObject({ ratio: 1, exact: true });
    expect(guessPixelRatio(786, 393)).toMatchObject({ ratio: 2, exact: true });
    expect(guessPixelRatio(1179, 393)).toMatchObject({ ratio: 3, exact: true });
    expect(guessPixelRatio(1206, 402)).toMatchObject({ ratio: 3, exact: true });
  });

  it("Android 420dpi(2.625) 를 알아본다", () => {
    expect(guessPixelRatio(1080, 412)).toMatchObject({ ratio: 2.625, exact: true });
  });

  it("다른 기기 폭 · 임의 크기 프레임은 exact 가 아니다", () => {
    // iPhone 16 @3x 시안을 16 Pro 에 — 1179/402 = 2.93
    const guess = guessPixelRatio(1179, 402);
    expect(guess.ratio).toBe(3);
    expect(guess.exact).toBe(false);
    expect(guessPixelRatio(1000, 393).exact).toBe(false);
  });
});

describe("displayScale · referenceLayout", () => {
  it("폭 맞춤은 배율과 무관하게 기기 폭이 된다", () => {
    for (const width of [393, 786, 1179, 1000, 517]) {
      const layout = referenceLayout(DEFAULT_ALIGN, { width, height: width * 2.168 }, 393);
      expect(layout.width).toBeCloseTo(393, 6);
    }
    const layout = referenceLayout(DEFAULT_ALIGN, { width: 1179, height: 2556 }, 393);
    expect(layout.height).toBeCloseTo(852, 6);
    expect(layout.scale).toBeCloseTo(1 / 3, 6);
  });

  it("실제 크기(fit none)는 이미지 px 에 배율을 곱한다 · 이동은 배율 뒤에 더한다", () => {
    const align = { fit: "none" as const, scale: 0.5, offsetX: 3, offsetY: -4 };
    expect(displayScale(align, 786, 393)).toBe(0.5);
    expect(referenceLayout(align, { width: 786, height: 1704 }, 393)).toEqual({
      width: 393,
      height: 852,
      left: 3,
      top: -4,
      scale: 0.5,
    });
  });

  it("폭 맞춤에 곱하는 배율", () => {
    expect(displayScale({ fit: "width", scale: 1.1 }, 1179, 393)).toBeCloseTo(1.1 / 3, 6);
  });
});

describe("toggleFit", () => {
  it("끄면 추정 배율의 실제 크기, 켜면 폭 맞춤 1배 — 이동은 그대로", () => {
    const off = toggleFit({ ...DEFAULT_ALIGN, offsetX: 5 }, 1179, 393);
    expect(off).toEqual({ fit: "none", scale: 1 / 3, offsetX: 5, offsetY: 0 });
    expect(toggleFit(off, 1179, 393)).toEqual({ fit: "width", scale: 1, offsetX: 5, offsetY: 0 });
  });
});

describe("detectStatusBar · describeFit", () => {
  it("상태바까지 든 전체 화면 · 상태바 없는 시안 · 긴 프레임", () => {
    expect(detectStatusBar({ width: 1179, height: 2556 }, iphone16)).toBe("included");
    expect(detectStatusBar({ width: 1179, height: (852 - 59) * 3 }, iphone16)).toBe("missing");
    expect(detectStatusBar({ width: 393, height: 2000 }, iphone16)).toBe("unknown");
    expect(detectStatusBar({ width: 0, height: 0 }, iphone16)).toBe("unknown");
  });

  it("같은 판이면 그렇다고, 아니면 몇 배로 놓는지 말한다", () => {
    expect(describeFit({ width: 1206, height: 2622 }, iphone16Pro)).toBe(
      "1206×2622 · @3x(402×874) · iPhone 16 Pro와 같은 판 · 상태바까지 든 전체 화면",
    );
    expect(describeFit({ width: 1080, height: 2400 }, pixel8)).toContain("@2.625x");
    expect(describeFit({ width: 1000, height: 2168 }, iphone16)).toContain("0.393배로 놓아요");
    expect(describeFit({ width: 1179, height: 2379 }, iphone16)).toContain("상태바 없이");
  });
});
