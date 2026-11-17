import { CATALOG, LAYER_ORDER } from "./catalog.generated";
import type { Outfit, WardrobeFlag, WardrobeItemArt } from "./types";

export const ART_BY_ID: ReadonlyMap<string, WardrobeItemArt> = new Map(
  CATALOG.map((art) => [art.id, art]),
);

/** 앱이 모르는 id(서버가 앱보다 새 아이템을 줄 때)는 입지 않은 것으로 본다 */
const artOf = (id: string | null) => (id == null ? undefined : ART_BY_ID.get(id));

/**
 * 꾸민 바바를 그릴 그림들 — 아래부터 위로. 모든 그림이 같은 캔버스라 같은 자리에 겹치기만 한다.
 * 세 칸은 서로의 조건을 바꾸지 않는다: 모자는 귀 · 정수리, 얼굴은 기본 눈, 옷은 목 아래만.
 */
export function figureLayers(outfit: Outfit): number[] {
  const worn = { hat: artOf(outfit.hat), eyes: artOf(outfit.eyes), clothes: artOf(outfit.clothes) };
  const flags: Record<WardrobeFlag, boolean> = {
    always: true,
    lowerBody: worn.clothes?.lowerBody ?? true,
    baseEyes: worn.eyes?.baseEyes ?? true,
    ears: worn.hat?.ears ?? true,
    headTop: worn.hat?.headTop ?? false,
    earsFront: worn.hat?.earsFront ?? false,
  };
  return LAYER_ORDER.flatMap((layer) => {
    if ("slot" in layer) {
      const art = worn[layer.slot];
      return art == null ? [] : [art.layer];
    }
    return flags[layer.when] ? [layer.source] : [];
  });
}

/** 겹치는 순서 전체(부품 + 칸마다 그 칸의 모든 아이템) — 두 모습을 섞어 그릴 때 위아래를 정한다 */
export const LAYER_RANK: ReadonlyMap<number, number> = new Map(
  LAYER_ORDER.flatMap((layer) =>
    "slot" in layer
      ? CATALOG.filter((art) => art.slot === layer.slot).map((art) => art.layer)
      : [layer.source],
  ).map((source, rank) => [source, rank]),
);
