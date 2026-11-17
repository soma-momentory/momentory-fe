/** 바바 꾸미기 칸 — 칸마다 하나씩만 입는다 */
export type WardrobeSlot = "hat" | "eyes" | "clothes";

/** 부품을 그릴지 정하는 조건 — 지금 입은 아이템에서 정해진다(`model/figure.ts`) */
export type WardrobeFlag = "always" | "lowerBody" | "baseEyes" | "ears" | "headTop" | "earsFront";

export type WardrobeLayer = { slot: WardrobeSlot } | { when: WardrobeFlag; source: number };

/** 앱 안에 든 아이템 그림과 설정. 값 · 가진 것은 서버가 준다(`WardrobeItem`) */
export type WardrobeItemArt = {
  /** 「칸-아이디」 — 서버 id 와 같다 */
  id: string;
  slot: WardrobeSlot;
  name: string;
  layer: number;
  shop: number;
  ears?: boolean;
  headTop?: boolean;
  earsFront?: boolean;
  baseEyes?: boolean;
  lowerBody?: boolean;
};

export type Outfit = { hat: string | null; eyes: string | null; clothes: string | null };

export const NO_OUTFIT: Outfit = { hat: null, eyes: null, clothes: null };

/** 서버가 주는 상점 한 칸 */
export type WardrobeItem = {
  id: string;
  slot: WardrobeSlot;
  tier: "FREE" | "TANGERINE";
  price: number;
  owned: boolean;
};

export type TangerineReason =
  "CHECK_IN" | "DIARY" | "SCHEDULES_DONE" | "REST" | "LETTER" | "WELCOME";

export type TangerineReward = { reason: TangerineReason; amount: number };
