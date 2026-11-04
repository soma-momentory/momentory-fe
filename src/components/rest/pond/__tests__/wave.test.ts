import { hopAt, waveRange, waveShape } from "../wave";

describe("뛰어오르는 곡선", () => {
  it("제자리에서 시작해 제자리로 돌아오고 눌림도 풀린다", () => {
    expect(hopAt(0)).toEqual({ height: 0, squash: 0 });
    expect(hopAt(1)).toEqual({ height: 0, squash: 0 });
  });

  it("날아가는 중간에 가장 높고, 이어지는 값이 크게 튀지 않는다", () => {
    expect(hopAt(0.47).height).toBeCloseTo(1, 1);
    for (let i = 1; i <= 200; i += 1) {
      const a = hopAt((i - 1) / 200);
      const b = hopAt(i / 200);
      expect(Math.abs(b.height - a.height)).toBeLessThan(0.05);
    }
  });
});

describe("연잎 · 숨쉬기의 반복 곡선", () => {
  it.each([0, 0.25, 0.44])("처음과 끝이 같아 이음매가 없다 — 시작점 %d", (phase) => {
    const shape = waveShape(phase);
    expect(shape[0]).toBeCloseTo(shape[shape.length - 1]!, 10);
  });

  it("주어진 두 값 사이만 오간다", () => {
    const { outputRange } = waveRange(0, -3, 0.44);
    expect(Math.max(...outputRange)).toBeLessThanOrEqual(0);
    expect(Math.min(...outputRange)).toBeGreaterThanOrEqual(-3);
  });
});
