import { capybaraSpace, isWaterSpot, pondMotion, surfaceRippleMs } from "../pond";

/**
 * 감각연못의 **자리 계산** — 보기 단계가 수면 터치로 바뀌면서(2026-09-06) 「어디가
 * 물인가」와 「잎이 어디에 뜨는가」를 코드가 판정하게 됐다. 그림을 보고 잰 값이라
 * 눈으로 확인할 수 없는 대신, 여기서 **말이 되는지**를 고정한다.
 *
 * 배경 그림이 바뀌면 이 테스트가 먼저 깨진다 — 그때 `pondLayout.water` 를 다시 잰다.
 */

/** 손에 들리는 화면의 비율(높이 ÷ 폭) — 자리 계산은 이것에 따라 조금씩 달라진다 */
const ASPECT = 640 / 360;

describe("수면 판정 · isWaterSpot", () => {
  it("연못 한가운데는 물이다", () => {
    expect(isWaterSpot({ x: 0.5, y: 0.62 }, ASPECT)).toBe(true);
    expect(isWaterSpot({ x: 0.7, y: 0.6 }, ASPECT)).toBe(true);
  });

  it("상단 글이 앉는 곳과 아래 판 언저리는 물이 아니다 — 여기를 눌러도 세지 않는다", () => {
    expect(isWaterSpot({ x: 0.5, y: 0.12 }, ASPECT)).toBe(false);
    expect(isWaterSpot({ x: 0.5, y: 0.4 }, ASPECT)).toBe(false);
    expect(isWaterSpot({ x: 0.5, y: 0.9 }, ASPECT)).toBe(false);
  });

  it("좌우 둑은 물이 아니다 — 물은 위가 좁고 가운데가 넓다", () => {
    expect(isWaterSpot({ x: 0.02, y: 0.62 }, ASPECT)).toBe(false);
    expect(isWaterSpot({ x: 0.98, y: 0.62 }, ASPECT)).toBe(false);
    // 같은 x 라도 높이에 따라 갈린다 — 아래로 갈수록 앞쪽 돌이 물을 좁힌다
    expect(isWaterSpot({ x: 0.8, y: 0.62 }, ASPECT)).toBe(true);
    expect(isWaterSpot({ x: 0.8, y: 0.74 }, ASPECT)).toBe(false);
  });

  it("카피바라가 앉은 칸은 물이 아니다 — 카피바라를 눌러도 셈이 오르지 않는다", () => {
    const capy = capybaraSpace(ASPECT);
    const middle = { x: (capy.left + capy.right) / 2, y: (capy.top + capy.bottom) / 2 };

    expect(isWaterSpot(middle, ASPECT)).toBe(false);
    // 바로 오른쪽은 열린 물이다 — 칸이 필요 이상으로 넓지 않다
    expect(isWaterSpot({ x: capy.right + 0.05, y: middle.y }, ASPECT)).toBe(true);
  });

  it("카피바라는 왼쪽 물가에 앉고 아래 판과 떨어져 있다 — 모서리에 붙인 스티커가 아니다", () => {
    const capy = capybaraSpace(ASPECT);

    expect(capy.left).toBeGreaterThan(0.02);
    expect(capy.right).toBeLessThan(0.4); // 열린 수면(가운데)을 가리지 않는다
    expect(capy.bottom).toBeLessThan(0.82); // 판까지 장면 높이의 18% 넘게 남는다
    expect(capy.top).toBeGreaterThan(0.5); // 중단~중하단이다
  });
});

describe("물결의 결 · surfaceRippleMs", () => {
  it("단계가 안쪽으로 갈수록 넓고 느리고 옅어진다 — 셋은 같은 물결의 다른 결이다", () => {
    const step = pondMotion.surfaceRipple.step;

    expect(surfaceRippleMs("see")).toBeLessThan(surfaceRippleMs("hear"));
    expect(surfaceRippleMs("hear")).toBeLessThan(surfaceRippleMs("feel"));
    expect(step.see.size).toBeLessThan(step.hear.size);
    expect(step.hear.size).toBeLessThan(step.feel.size);
    expect(step.see.peakOpacity).toBeGreaterThan(step.hear.peakOpacity);
    expect(step.hear.peakOpacity).toBeGreaterThan(step.feel.peakOpacity);
  });

  it("보기의 물결은 0.8~1.2초 안에 끝난다 — 손끝의 반응이라 기다리게 하지 않는다", () => {
    expect(surfaceRippleMs("see")).toBeGreaterThanOrEqual(800);
    expect(surfaceRippleMs("see")).toBeLessThanOrEqual(1200);
  });

  it("완료는 감각의 물결이 **다 퍼진 뒤에** 온다 — 마지막 반응이 잘리지 않는다", () => {
    expect(pondMotion.doneHold).toBeGreaterThanOrEqual(surfaceRippleMs("feel"));
  });

  it("링은 가는 선 둘이다 — 면을 채우면 배경과 연잎을 가린다", () => {
    expect(pondMotion.surfaceRipple.rings).toBe(2);
    // 굵히면 물결이 아니라 테두리가 된다. 1 은 밝은 물빛 위에서 보이지 않았다(2026-09-06)
    expect(pondMotion.surfaceRipple.strokeWidth).toBeLessThanOrEqual(2);
    for (const it of Object.values(pondMotion.surfaceRipple.step)) {
      // 보이되 그래픽이 되지 않는 선 — 면이 없는 테두리라 이 짙기에서도 장면이 비친다
      expect(it.peakOpacity).toBeLessThanOrEqual(0.5);
    }
  });
});
