/**
 * 화면이 읽는 조각 — store 상태에서 **골라내기만** 한다. 상태를 바꾸지 않는다.
 * 바꾸는 것(mutation)은 전부 `diary.ts` 의 action 에 있다.
 */
import type { ActionCard } from "./types";

/** 그 일기에 붙은 행동 카드 — **1:1** 이라 배열이 아니다 */
export const actionCardOf = (cards: readonly ActionCard[], diaryId: string) =>
  cards.find((c) => c.diaryId === diaryId) ?? null;
