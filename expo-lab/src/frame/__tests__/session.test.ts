import { describe, expect, it } from "@jest/globals";

import { DEFAULT_FRAME_CONFIG, FRAME_STORAGE_PREFIX } from "../../lab-contract";
import { APP_SESSION_KEY, LAB_SESSION, applySessionPolicy, forgetSessionPolicy } from "../session";
import { clearFrameKeys } from "../storage";

/** localStorage 와 같은 모양의 메모리 저장소 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const config = { ...DEFAULT_FRAME_CONFIG, frameId: "f1" };
const sessionKey = `${FRAME_STORAGE_PREFIX}f1:${APP_SESSION_KEY}`;

describe("frame session policy", () => {
  it("seeds a far-future lab session for signed-in frames", () => {
    const storage = new MemoryStorage();
    expect(applySessionPolicy(config, "m1", storage, new MemoryStorage())).toBe(true);
    const session = JSON.parse(storage.getItem(sessionKey)!);
    expect(session).toEqual(LAB_SESSION);
    expect(session.expiresAt).toBeGreaterThan(Date.now() + 365 * 24 * 60 * 60 * 1000);
  });

  it("removes any session for signed-out frames", () => {
    const storage = new MemoryStorage();
    storage.setItem(sessionKey, "{}");
    applySessionPolicy({ ...config, signedIn: false }, "m1", storage, new MemoryStorage());
    expect(storage.getItem(sessionKey)).toBeNull();
  });

  it("applies once per frame config so in-frame sign-in/out survives reloads", () => {
    const storage = new MemoryStorage();
    const boot = new MemoryStorage();
    applySessionPolicy({ ...config, signedIn: false }, "m1", storage, boot);
    storage.setItem(sessionKey, '{"signed":"in-frame"}');
    expect(applySessionPolicy({ ...config, signedIn: false }, "m1", storage, boot)).toBe(false);
    expect(storage.getItem(sessionKey)).toBe('{"signed":"in-frame"}');

    // 셸이 설정을 바꾸면 다시 반영된다
    expect(applySessionPolicy({ ...config, signedIn: false }, "m2", storage, boot)).toBe(true);
    expect(storage.getItem(sessionKey)).toBeNull();

    // 데이터 초기화는 표시를 지운다
    forgetSessionPolicy(config, boot);
    expect(applySessionPolicy(config, "m2", storage, boot)).toBe(true);
    expect(storage.getItem(sessionKey)).not.toBeNull();
  });

  it("keeps an existing session when seeding", () => {
    const storage = new MemoryStorage();
    storage.setItem(sessionKey, '{"keep":true}');
    expect(applySessionPolicy(config, "m1", storage, new MemoryStorage())).toBe(false);
    expect(storage.getItem(sessionKey)).toBe('{"keep":true}');
  });

  it("clears only this frame's keys", () => {
    const storage = new MemoryStorage();
    storage.setItem(`${FRAME_STORAGE_PREFIX}f1:a`, "1");
    storage.setItem(`${FRAME_STORAGE_PREFIX}f1:async:b`, "2");
    storage.setItem(`${FRAME_STORAGE_PREFIX}f10:a`, "3");
    storage.setItem("other", "4");
    expect(clearFrameKeys(storage, "f1")).toBe(2);
    expect(storage.length).toBe(2);
    expect(storage.getItem(`${FRAME_STORAGE_PREFIX}f10:a`)).toBe("3");
  });
});
