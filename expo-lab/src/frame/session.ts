/**
 * 프레임의 시작 세션 — `config.signedIn` 을 SecureStore 심(`shims/secure-store.ts`)의 저장소에 반영한다.
 *
 * **한 프레임 설정에 한 번만** 반영한다. 반영한 설정(`window.name` 문자열)을 sessionStorage 에
 * 적어 두고, 같은 설정으로 다시 불리면(새로고침 · `lab:reload`) 손대지 않는다 — 그래야
 * 프레임 안에서 로그인 · 로그아웃한 결과가 새로고침에 살아남는다. 셸이 설정을 바꾸면 문자열이
 * 달라져 다시 반영된다. `lab:resetData` 는 표시를 지워 다음 부팅에 다시 반영하게 한다.
 */
import type { LabFrameConfig } from "../lab-contract";

import { frameStorageKey } from "./runtime";

/** 앱의 세션 키(`src/features/auth/model/auth.ts` `SESSION_KEY`) — 앱 모듈을 먼저 불러오지 않으려고 옮겨 적는다 */
export const APP_SESSION_KEY = "momentory.session";

/** 2100-01-01 — 만료돼 갱신(reissue)으로 빠지지 않게 */
const FAR_FUTURE_MS = Date.UTC(2100, 0, 1);

export const LAB_SESSION = {
  accessToken: "lab",
  refreshToken: "lab",
  expiresAt: FAR_FUTURE_MS,
  userId: 1,
} as const;

const markerKey = (config: LabFrameConfig) => frameStorageKey("bootedWith", config.frameId);

type KeyValue = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * @param marker 같은 설정으로 두 번 반영하지 않게 하는 표시 — 설정을 직렬화한 문자열
 * @returns 세션을 바꿨는가
 */
export function applySessionPolicy(
  config: LabFrameConfig,
  marker: string,
  storage: KeyValue,
  boot: KeyValue,
): boolean {
  if (boot.getItem(markerKey(config)) === marker) return false;
  boot.setItem(markerKey(config), marker);

  const key = frameStorageKey(APP_SESSION_KEY, config.frameId);
  if (config.signedIn === false) {
    storage.removeItem(key);
    return true;
  }
  if (storage.getItem(key) != null) return false;
  storage.setItem(key, JSON.stringify(LAB_SESSION));
  return true;
}

/** 다음 부팅에 `signedIn` 을 다시 반영하게 한다 */
export function forgetSessionPolicy(config: LabFrameConfig, boot: KeyValue): void {
  boot.removeItem(markerKey(config));
}
