/**
 * 프레임이 브라우저에 남긴 「기기 상태」 — 세션(SecureStore 심) · 캘린더 동기화 상태 ·
 * 쉼터 기기 기억(AsyncStorage 심). 전부 `FRAME_STORAGE_PREFIX + frameId + ":"` 아래에 있다.
 *
 * `lab:resetData` 는 가짜 DB 와 함께 이것도 지운다 — 데이터 세트를 처음부터 다시 보려면 기기도
 * 새것이어야 한다. 시작 세션은 다음 부팅에 `config.signedIn` 대로 다시 심긴다.
 */
import { FRAME_STORAGE_PREFIX, type LabFrameConfig } from "../lab-contract";

import { browserStorage } from "./runtime";
import { forgetSessionPolicy } from "./session";

/** 이 프레임의 키를 모두 지운다. 지운 개수를 돌려준다 */
export function clearFrameKeys(storage: Storage, frameId: string): number {
  const prefix = `${FRAME_STORAGE_PREFIX}${frameId}:`;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
  return keys.length;
}

export function sessionStore(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function forgetFrameState(config: LabFrameConfig): void {
  const storage = browserStorage();
  if (storage) clearFrameKeys(storage, config.frameId);
  const boot = sessionStore();
  if (boot) forgetSessionPolicy(config, boot);
}
