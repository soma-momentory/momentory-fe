/**
 * React 쪽 입구 — 저장소 스냅샷을 `useSyncExternalStore` 로 읽는다.
 */
import { useMemo, useSyncExternalStore } from "react";

import {
  filterReferences,
  getReferenceStore,
  type ReferenceSnapshot,
  type ReferenceStore,
} from "./referenceStore";
import type { Reference, ReferenceScope } from "./types";

export function useReferenceSnapshot(
  store: ReferenceStore = getReferenceStore(),
): ReferenceSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export type ReferencesFor = {
  /** 보일 시안 — 숨김이면 null. 오버레이는 이것만 본다 */
  reference: Reference | null;
  /** `reference` 의 이미지 주소 */
  url: string | null;
  /** 숨김과 무관하게 이 범위에서 고른(또는 가장 새) 시안 */
  active: Reference | null;
  /** 이 범위에 맞는 시안 전부 — 새것이 먼저 */
  matches: readonly Reference[];
  visible: boolean;
  loaded: boolean;
};

/**
 * 이 프레임(화면 · 시안 · 플랫폼 · 기기)에 보일 참고 시안. 셸이 오버레이 · 나란히 칸을 그릴 때 쓴다.
 */
export function useReferencesFor(
  scope: ReferenceScope,
  store: ReferenceStore = getReferenceStore(),
): ReferencesFor {
  const snapshot = useReferenceSnapshot(store);
  const { route, draftId, platform, deviceId } = scope;
  return useMemo(() => {
    const matches = filterReferences(snapshot.references, { route, draftId, platform, deviceId });
    const active = store.activeFor({ route, draftId, platform, deviceId });
    const reference = snapshot.ui.visible ? active : null;
    return {
      reference,
      url: reference ? store.getUrl(reference.id) : null,
      active,
      matches,
      visible: snapshot.ui.visible,
      loaded: snapshot.loaded,
    };
  }, [snapshot, store, route, draftId, platform, deviceId]);
}
