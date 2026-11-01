/**
 * 셸이 A/B 설명에 쓰는 시안 정보(이름 · 바꾼 값 수). 시안은 디자인 편집기가 만들고 고친다 —
 * 셸은 **읽기만** 한다(`DESIGN_DRAFTS_STORAGE_KEY` · 계약의 `DesignDraft`).
 *
 * 언제 다시 읽나: 다른 탭의 `storage` 이벤트 · 편집기의 `onDraftChanged`(→ `notifyDraftsChanged`) ·
 * 그리고 이름 바꾸기처럼 알림이 없는 변경을 놓치지 않게 1초마다 원문 문자열만 비교한다.
 */
import { useMemo, useSyncExternalStore } from "react";

import { DESIGN_DRAFTS_STORAGE_KEY, type DesignDraft } from "../lab-contract";

export type DraftInfo = { id: string; name: string; changes: number };

const CHANGED_EVENT = "momentory-lab:drafts-changed";
const POLL_MS = 1000;

/** 편집기가 시안을 고쳤다고 알릴 때 */
export const notifyDraftsChanged = () => window.dispatchEvent(new Event(CHANGED_EVENT));

const readRaw = (): string | null => {
  try {
    return window.localStorage.getItem(DESIGN_DRAFTS_STORAGE_KEY);
  } catch {
    return null;
  }
};

const subscribe = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DESIGN_DRAFTS_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED_EVENT, listener);
  const timer = setInterval(listener, POLL_MS);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED_EVENT, listener);
    clearInterval(timer);
  };
};

const countKeys = (value: unknown) =>
  value && typeof value === "object" ? Object.keys(value).length : 0;

/** 저장된 원문에서 시안 하나를 찾는다 — 깨졌거나 없으면 null */
export function findDraftInfo(raw: string | null, id: string | null): DraftInfo | null {
  if (!raw || !id) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const draft = (parsed as Partial<DesignDraft>[]).find((item) => item?.id === id);
    if (!draft) return null;
    return {
      id,
      name: typeof draft.name === "string" && draft.name ? draft.name : id,
      changes: countKeys(draft.tokens) + countKeys(draft.studio),
    };
  } catch {
    return null;
  }
}

export function useDraftInfo(id: string | null): DraftInfo | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => findDraftInfo(raw, id), [raw, id]);
}
