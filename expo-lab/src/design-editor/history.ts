/**
 * 되돌리기 · 다시 하기 — 시안마다 따로, 탭 안의 메모리에만 둔다(새로고침하면 비지만 시안 자체는 남는다).
 * 패널이 접혔다 펴져도 이어지게 모듈 수준 Map 에 둔다.
 */
import type { DraftContent } from "./drafts";

export const HISTORY_LIMIT = 100;

export type History = { past: DraftContent[]; future: DraftContent[] };
export const emptyHistory = (): History => ({ past: [], future: [] });

/** 편집 하나 — 바꾸기 **전** 내용을 쌓고 다시 하기 줄을 비운다 */
export const recordEdit = (history: History, before: DraftContent): History => ({
  past: [...history.past, before].slice(-HISTORY_LIMIT),
  future: [],
});

export function undo(
  history: History,
  current: DraftContent,
): { history: History; content: DraftContent } | null {
  const previous = history.past[history.past.length - 1];
  if (!previous) return null;
  return {
    history: { past: history.past.slice(0, -1), future: [...history.future, current] },
    content: previous,
  };
}

export function redo(
  history: History,
  current: DraftContent,
): { history: History; content: DraftContent } | null {
  const next = history.future[history.future.length - 1];
  if (!next) return null;
  return {
    history: { past: [...history.past, current], future: history.future.slice(0, -1) },
    content: next,
  };
}

const sessions = new Map<string, History>();
export const readHistory = (draftId: string) => sessions.get(draftId) ?? emptyHistory();
export const saveHistory = (draftId: string, history: History) => sessions.set(draftId, history);
export const dropHistory = (draftId: string) => sessions.delete(draftId);
