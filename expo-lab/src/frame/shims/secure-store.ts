/**
 * `expo-secure-store` 심 — 웹 빌드가 빈 모듈이라 세션이 남지 않는다. localStorage 에
 * **프레임마다 따로** 둔다(`FRAME_STORAGE_PREFIX + frameId + ":"`). 앱이 쓰는 셋만 있다
 * (`auth.ts` 세션 · `syncStateStore.ts` 캘린더 동기화 상태).
 *
 * 저장소가 없으면(Jest · 사생활 모드) 메모리에 둔다 — 실패로 던지지 않는다.
 */
import { browserStorage, frameStorageKey } from "../runtime";

const memory = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  const storage = browserStorage();
  const full = frameStorageKey(key);
  return storage ? storage.getItem(full) : (memory.get(full) ?? null);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  const storage = browserStorage();
  const full = frameStorageKey(key);
  if (storage) storage.setItem(full, value);
  else memory.set(full, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  const storage = browserStorage();
  const full = frameStorageKey(key);
  if (storage) storage.removeItem(full);
  else memory.delete(full);
}

export function getItem(key: string): string | null {
  const storage = browserStorage();
  const full = frameStorageKey(key);
  return storage ? storage.getItem(full) : (memory.get(full) ?? null);
}

export function setItem(key: string, value: string): void {
  void setItemAsync(key, value);
}

export async function isAvailableAsync(): Promise<boolean> {
  return true;
}

export function canUseBiometricAuthentication(): boolean {
  return false;
}

// 옵션 상수 — 앱은 쓰지 않지만 타입·값을 기대하는 코드가 깨지지 않게 둔다
export const AFTER_FIRST_UNLOCK = 0;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 1;
export const ALWAYS = 2;
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 3;
export const ALWAYS_THIS_DEVICE_ONLY = 4;
export const WHEN_UNLOCKED = 5;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;
