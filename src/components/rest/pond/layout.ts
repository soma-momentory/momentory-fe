import { pondScene } from "@/design/ds";

/** 화면에 그림을 `cover` 로 깔았을 때 기준 화면보다 몇 배인가 — 자리와 크기를 함께 옮긴다 */
export const artScale = (width: number, height: number) =>
  Math.max(width / pondScene.art.width, height / pondScene.art.height);

const BASE = { width: 393, height: 852 };

/** 기준 화면의 한 점을 지금 화면의 같은 그림 위 자리로 옮긴다 — 그림이 가운데 놓이므로 가운데 기준이다 */
export function artPoint(x: number, y: number, width: number, height: number) {
  const k = artScale(width, height);
  return {
    x: width / 2 + (x - BASE.width / 2) * k,
    y: height / 2 + (y - BASE.height / 2) * k,
  };
}

export type BabaSpot = { x: number; y: number; width: number };

/** 몇 개를 찾았나로 바바가 앉을 연잎을 정한다 — 찾은 수가 곧 연잎 번호다 */
export function spotOnPad(found: number, width: number, height: number): BabaSpot {
  const pad = pondScene.path[Math.min(found, pondScene.path.length - 1)]!;
  const { babaOnPad } = pondScene;
  const k = artScale(width, height);
  return {
    ...artPoint(pad.x, pad.y + babaOnPad.sink * pad.scale, width, height),
    width: babaOnPad.width * pad.scale * k,
  };
}

export function spotAt(spot: BabaSpot, width: number, height: number): BabaSpot {
  return {
    ...artPoint(spot.x, spot.y, width, height),
    width: spot.width * artScale(width, height),
  };
}
