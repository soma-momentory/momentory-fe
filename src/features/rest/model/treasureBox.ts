import type { Treasure } from "../data/treasureApi";

/**
 * 오늘의 보물함 — 문안과 규칙 (2026-10-05).
 *
 * 오늘의 소중한 순간 한 줄을 적으면 작은 보물 카드가 되고, 카피바라가 들고 통통 뛰어가
 * 보물함에 넣는다. 쓴 글은 **서버에 남는다** — 쉼 콘텐츠 가운데 결과물이 쌓이는 유일한
 * 콘텐츠다(`DESIGN.md` 「오늘의 보물함」). 쌓인 것은 평가 없이 **그대로 다시 보여 준다**.
 *
 * 말투: 칭찬 · 평가보다 **남긴 행동 자체를 인정한다**(「잘했어요」가 아니라 「남겼어요」).
 */
export type TreasureBoxStage = "write" | "tucking" | "done";

/** 서버와 같은 상한(BE `Treasure.CONTENT_MAX_LENGTH`) */
export const TREASURE_MAX_LENGTH = 100;

export const canTuck = (text: string) => text.trim().length > 0;

export const TREASURE_BOX_INTRO = {
  title: "오늘의 보물함",
  description: "오늘의 소중한 순간과 잘한 일을\n보물처럼 담아봐요",
} as const;

export const TREASURE_BOX_INPUT = {
  label: "오늘의 소중한 순간을 적어보세요",
  placeholder: "혼자서도 용기 내서 해냈어요",
  cta: "보물함에 담기",
} as const;

/** 카피바라가 보물을 옮기는 동안 — 진행 중의 말 */
export const TREASURE_BOX_TUCKING = {
  title: "보물함에 담고 있어요",
  description: "",
} as const;

export const TREASURE_BOX_DONE = {
  title: "오늘의 작은 순간 하나를\n보물로 남겼어요",
  description: "작은 순간도 소중한 보물이 될 수 있어요",
} as const;

export const TREASURE_TODAY_TITLE = "오늘의 보물";
export const TREASURE_ALL_LINK = "모두 보기";
export const TREASURE_ALL_TITLE = "지난 보물";
export const TREASURE_ALL_EMPTY = "아직 담은 보물이 없어요";
export const TREASURE_DONE_CTA = "쉼터로 돌아가기";
/** 담기에 실패했다 — 한 줄로 흡수한다(`RULES.md` 4 · 재시도 버튼을 두지 않는다) */
export const TREASURE_SAVE_FAILED = "보물을 담지 못했어요. 잠시 뒤에 다시 담아주세요.";

/**
 * 보물 카드의 작은 표식 — **고르지 않고 순서대로 돈다**(2026-10-04 결정). 그날 몇 번째
 * 보물인가로 정해서, 같은 보물은 어디서 봐도 같은 표식이다. 이모지는 기기마다 모양이 달라
 * 코드로 그린다(`TreasureMark`).
 */
export const TREASURE_MARKS = ["star", "heart", "sprout"] as const;
export type TreasureMarkName = (typeof TREASURE_MARKS)[number];

export const markAt = (index: number): TreasureMarkName =>
  TREASURE_MARKS[index % TREASURE_MARKS.length]!;

/**
 * 모든 보물(최신순) → 하루 묶음(최신 날 먼저). 묶음 안은 **담은 순서**라 표식이 오늘의
 * 보물함과 같다.
 */
export const groupByDay = (all: readonly Treasure[]) => {
  const days = new Map<string, Treasure[]>();
  for (const t of all) days.set(t.date, [...(days.get(t.date) ?? []), t]);
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, list]) => ({
      date,
      treasures: [...list].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    }));
};
