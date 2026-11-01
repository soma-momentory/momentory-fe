/**
 * `@react-native-async-storage/async-storage` 심 — 웹 구현도 localStorage 를 쓰지만 **키를
 * 프레임마다 가르지 않는다.** 나란히 띄운 프레임 둘이 쉼 추천 · 설명 카드 기억을 나눠 가지면
 * 비교가 흐려지므로 `secure-store` 심과 같은 접두사로 가른다.
 */
import { browserStorage, frameStorageKey } from "../runtime";

const memory = new Map<string, string>();

const read = (key: string): string | null => {
  const storage = browserStorage();
  const full = frameStorageKey(`async:${key}`);
  return storage ? storage.getItem(full) : (memory.get(full) ?? null);
};

const write = (key: string, value: string | null) => {
  const storage = browserStorage();
  const full = frameStorageKey(`async:${key}`);
  if (value == null) {
    if (storage) storage.removeItem(full);
    else memory.delete(full);
  } else if (storage) storage.setItem(full, value);
  else memory.set(full, value);
};

const ownKeys = (): string[] => {
  const prefix = frameStorageKey("async:");
  const storage = browserStorage();
  const keys = storage
    ? Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? "")
    : [...memory.keys()];
  return keys.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
};

const AsyncStorage = {
  getItem: async (key: string) => read(key),
  setItem: async (key: string, value: string) => write(key, value),
  removeItem: async (key: string) => write(key, null),
  mergeItem: async (key: string, value: string) => {
    const current = read(key);
    const merged = current
      ? { ...(JSON.parse(current) as object), ...(JSON.parse(value) as object) }
      : JSON.parse(value);
    write(key, JSON.stringify(merged));
  },
  clear: async () => ownKeys().forEach((key) => write(key, null)),
  getAllKeys: async () => ownKeys(),
  multiGet: async (keys: readonly string[]) => keys.map((key) => [key, read(key)] as const),
  multiSet: async (pairs: readonly (readonly [string, string])[]) =>
    pairs.forEach(([key, value]) => write(key, value)),
  multiRemove: async (keys: readonly string[]) => keys.forEach((key) => write(key, null)),
  flushGetRequests: () => {},
};

export default AsyncStorage;
export const { getItem, setItem, removeItem, clear, getAllKeys, multiGet, multiSet, multiRemove } =
  AsyncStorage;
