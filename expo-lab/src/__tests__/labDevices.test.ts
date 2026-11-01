/**
 * 기기 표(`lab-devices.ts`)의 모양 검사 — 값이 맞는지는 `source` 의 출처가 정하고,
 * 여기서는 **서로 모순되는 값**(화면 밖 펀치홀 · 크기보다 큰 여백 · 겹친 id)만 막는다.
 */
import { describe, expect, it } from "@jest/globals";
import { BOTTOM_BAR_SHAPE, DEFAULT_DEVICE_ID, labDevices, skinFile } from "../lab-devices";

describe("기기 표", () => {
  it("id 는 겹치지 않고 기본 기기는 표에 있다", () => {
    const ids = labDevices.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [platform, id] of Object.entries(DEFAULT_DEVICE_ID)) {
      expect(labDevices.find((d) => d.id === id)?.platform).toBe(platform);
    }
  });

  it.each(labDevices.map((d) => [d.id, d] as const))("%s — 크기 · 여백 · 상태바", (_id, d) => {
    expect(d.width).toBeGreaterThan(0);
    expect(d.height).toBeGreaterThan(d.width);
    for (const side of ["top", "bottom", "left", "right"] as const) {
      expect(d.insets[side]).toBeGreaterThanOrEqual(0);
    }
    expect(d.insets.top + d.insets.bottom).toBeLessThan(d.height);
    expect(d.insets.left + d.insets.right).toBeLessThan(d.width);
    expect(d.statusBarHeight).toBeGreaterThan(0);
    expect(d.statusBarHeight).toBeLessThanOrEqual(d.insets.top);
    expect(d.cornerRadius).toBeGreaterThanOrEqual(0);
    expect(d.cornerRadius).toBeLessThan(d.width / 2);
  });

  it.each(labDevices.map((d) => [d.id, d] as const))(
    "%s — 가림은 화면 안 · 상태바 안",
    (_id, d) => {
      const { cutout } = d;
      switch (cutout.kind) {
        case "none":
          return;
        case "punch-hole":
          expect(cutout.diameter).toBeGreaterThan(0);
          expect(cutout.centerX - cutout.diameter / 2).toBeGreaterThan(0);
          expect(cutout.centerX + cutout.diameter / 2).toBeLessThan(d.width);
          expect(cutout.top).toBeGreaterThanOrEqual(0);
          // 펀치홀 아래 끝이 곧 가림 여백인 기기(A55: 23 + 66 = 89px)가 있어 반올림 0.01dp 를 둔다
          expect(cutout.top + cutout.diameter).toBeLessThanOrEqual(d.insets.top + 0.01);
          return;
        case "notch":
          expect(cutout.width).toBeLessThan(d.width);
          expect(cutout.height).toBeLessThanOrEqual(d.insets.top);
          return;
        case "dynamic-island":
          expect(cutout.width).toBeLessThan(d.width);
          expect(cutout.top + cutout.height).toBeLessThanOrEqual(d.insets.top);
          return;
      }
    },
  );

  it.each(labDevices.map((d) => [d.id, d] as const))(
    "%s — 하단 막대와 아래 여백이 맞는다",
    (_id, d) => {
      if (d.bottomBar === "home-button") {
        expect(d.insets.bottom).toBe(0);
        return;
      }
      // 홈 인디케이터 · 제스처 손잡이는 아래 여백 안에 그려진다
      const shape = BOTTOM_BAR_SHAPE[d.bottomBar];
      expect(d.insets.bottom).toBeGreaterThan(0);
      expect(shape.bottom + shape.height).toBeLessThanOrEqual(d.insets.bottom);
      expect(d.bottomBar === "gesture-bar").toBe(d.platform === "android");
    },
  );

  it.each(labDevices.filter((d) => d.skin).map((d) => [d.id, d] as const))(
    "%s — 스킨의 화면 자리가 외형 안 · 화면 비율이 표와 같다",
    (_id, d) => {
      const s = d.skin!;
      expect(d.platform).toBe("android");
      expect(s.displayX + s.displayWidth).toBeLessThanOrEqual(s.frameWidth);
      expect(s.displayY + s.displayHeight).toBeLessThanOrEqual(s.frameHeight);
      // 스킨 px 을 표의 dp 로 줄였을 때 높이가 1dp 안에서 맞는다
      expect(Math.abs((s.displayHeight * d.width) / s.displayWidth - d.height)).toBeLessThan(1);
      if (s.bodyCrop) {
        const c = s.bodyCrop;
        expect(c.x).toBeLessThanOrEqual(s.displayX);
        expect(c.y).toBeLessThanOrEqual(s.displayY);
        expect(c.x + c.width).toBeGreaterThanOrEqual(s.displayX + s.displayWidth);
        expect(c.y + c.height).toBeGreaterThanOrEqual(s.displayY + s.displayHeight);
        expect(c.x + c.width).toBeLessThanOrEqual(s.frameWidth);
        expect(c.y + c.height).toBeLessThanOrEqual(s.frameHeight);
      }
    },
  );

  it("스킨 그림 이름 — SDK 는 webp, 삼성 스킨은 png", () => {
    const pixel = labDevices.find((d) => d.id === "pixel-8")!.skin!;
    const galaxy = labDevices.find((d) => d.id === "galaxy-s24")!.skin!;
    expect([skinFile(pixel, "back"), skinFile(pixel, "mask")]).toEqual(["back.webp", "mask.webp"]);
    expect([skinFile(galaxy, "back"), skinFile(galaxy, "mask")]).toEqual(["back.png", "mask.png"]);
  });

  it("갤럭시는 국내 사용자가 많은 S · A 를 360dp · 384dp 두 폭으로 덮는다", () => {
    const galaxy = labDevices.filter((d) => d.id.startsWith("galaxy-"));
    expect(new Set(galaxy.map((d) => d.width))).toEqual(new Set([360, 384]));
    for (const d of galaxy) expect(d.source).toMatch(/windowinsets\.info/);
  });
});
