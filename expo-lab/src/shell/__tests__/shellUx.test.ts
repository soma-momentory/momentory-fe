import { describe, expect, it } from "@jest/globals";

import { FIT_MAX, fitScale, GRID_FIT } from "../stageFit";

const phone = { width: 431, height: 882 }; // iPhone 16 외형(393×852 + 테두리)

describe("맞춤 배율", () => {
  it("한 화면은 무대 높이에 맞춰 **크게도** 맞춘다 · 상한 2배", () => {
    const scale = fitScale("single", { width: 1200, height: 1400 }, 12, [phone]);
    expect(scale).toBeGreaterThan(1.4);
    expect(fitScale("single", { width: 4000, height: 4000 }, 12, [phone])).toBe(FIT_MAX);
  });

  it("너비가 모자라면 너비에 맞춘다", () => {
    const scale = fitScale("single", { width: 360, height: 2000 }, 12, [phone]);
    expect(scale * phone.width).toBeLessThanOrEqual(360 - 48);
  });

  it("A/B 는 두 대가 나란히 들어간다", () => {
    const area = { width: 1000, height: 1600 };
    const scale = fitScale("ab", area, 100, [phone, phone]);
    expect(scale * phone.width * 2 + 32).toBeLessThanOrEqual(area.width - 48);
    expect(scale * phone.height).toBeLessThanOrEqual(area.height - 100 - 24);
  });

  it("매트릭스는 가장 크게 들어가는 줄 수를 고른다", () => {
    const phones = Array.from({ length: 6 }, () => phone);
    const area = { width: 1400, height: 1000 };
    const scale = fitScale("matrix", area, 40, phones);
    const oneRow = (area.width - 50 - 5 * 32) / (6 * phone.width);
    expect(scale).toBeGreaterThanOrEqual(oneRow - 0.01);
  });

  it("전체 화면은 맞춤이어도 작은 고정 배율", () => {
    expect(fitScale("grid", { width: 2000, height: 2000 }, 0, [phone])).toBe(GRID_FIT);
  });
});
