import type { ActionCard, Diary } from "@/features/diary/model/diary";

/**
 * 쉼터가 보는 것 — **행동 카드뿐이다**(2026-08-14 결정 · `PLAN.md` D1).
 *
 * 시안의 룸 3종(대나무 숲 · 감각 연못 · 걱정 상자)은 구현 범위 밖이라 여기에
 * 상태를 두지 않는다.
 *
 * **카드는 일기에 붙어 산다** — 스스로 store 를 두지 않고 `features/diary` 의
 * 것을 읽어 날짜로 엮는다(`ActionCard.diaryId` → `Diary.date`). 카드를 따로
 * 저장하면 회고가 남긴 한 벌이 두 곳에 생긴다.
 *
 * 세는 함수가 아니라 **고르는 함수만** 둔다 — 쉼터는 수행률을 보여주지 않는다
 * (`RULES.md` 「숫자로 압박하지 않는다」).
 */
export type DatedCard = { card: ActionCard; date: string };

const dateOf = (diaries: readonly Diary[], card: ActionCard) =>
  diaries.find((d) => d.id === card.diaryId)?.date ?? null;

/** 카드에 그날 날짜를 붙여 **최신순**으로. 날짜를 모르는 카드는 버린다 */
export const datedCards = (diaries: readonly Diary[], cards: readonly ActionCard[]): DatedCard[] =>
  cards
    .map((card) => {
      const date = dateOf(diaries, card);
      return date == null ? null : { card, date };
    })
    .filter((x): x is DatedCard => x != null)
    .sort((a, b) => b.date.localeCompare(a.date));

/** 그날의 카드 한 장 — 없으면 `null`. 하루에 한 장뿐이다(`ActionCard` 주석) */
export const cardOn = (all: readonly DatedCard[], date: string): ActionCard | null =>
  all.find((x) => x.date === date)?.card ?? null;

/** 카드가 있는 날짜들 — 미니 캘린더가 채우는 칸 */
export const cardDays = (all: readonly DatedCard[]): string[] => all.map((x) => x.date);

/** 그 달(`YYYY-MM`)에 카드가 있는 날 */
export const cardDaysIn = (all: readonly DatedCard[], month: string): string[] =>
  cardDays(all).filter((d) => d.startsWith(month));

/**
 * 처음 열었을 때 고를 날 — **가장 최근에 카드가 있는 날**이다.
 * 카드가 하나도 없으면 `null` 이고 화면은 빈 상태를 그린다.
 */
export const latestCardDay = (all: readonly DatedCard[]): string | null => all[0]?.date ?? null;

/**
 * 상세의 **지난 기록** — 그날보다 **이전** 카드만 최신순으로. 기본 6건
 * (`app-flow.md` §2.4). 그날 카드 자신은 빼고 센다.
 */
export const pastCards = (all: readonly DatedCard[], before: string, limit = 6): DatedCard[] =>
  all.filter((x) => x.date < before).slice(0, limit);
