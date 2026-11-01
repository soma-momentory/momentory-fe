/**
 * 프레임 한 벌의 **실행 상태** — 부트스트랩이 한 번 적고, 심(`shims/`)이 읽는다.
 *
 * 심은 Metro 가 앱 모듈 자리에 끼워 넣는 것이라 셸(Lab 최상위 창)에서도 같은 파일이
 * 불린다. 그래서 상태가 비어 있으면(= 셸) **진짜 모듈처럼** 굴어야 한다 — 각 심이
 * `getFrameConfig() == null` 을 보고 갈린다.
 *
 * 이 파일은 앱 모듈을 import 하지 않는다 — 앱보다 먼저 불려야 하기 때문이다.
 */
import { FRAME_STORAGE_PREFIX, type LabFrameConfig, type LabPlatform } from "../lab-contract";
import { findDevice, type Insets } from "../lab-devices";

let active: LabFrameConfig | null = null;

/** 부트스트랩이 앱을 불러오기 전에 부른다 */
export function setFrameConfig(config: LabFrameConfig | null): void {
  active = config;
}

/** 프레임 안이면 그 설정, 셸이면 `null` */
export function getFrameConfig(): LabFrameConfig | null {
  return active;
}

/** 앱 코드가 볼 플랫폼. 셸이면 `null` — 진짜 `Platform.OS`(web)를 그대로 쓴다 */
export function getEmulatedPlatform(): LabPlatform | null {
  return active?.platform ?? null;
}

/** 이 기기의 안전 영역 여백. 셸이면 `null` */
export function getFrameInsets(): Insets | null {
  return active ? findDevice(active.deviceId).insets : null;
}

/**
 * 프레임마다 따로 눕는 저장소 키. 셸에서도 쓰일 수 있으므로(심이 불리면) `shell` 로 가른다 —
 * 셸과 프레임이 같은 세션을 나눠 갖지 않게.
 */
export function frameStorageKey(key: string, frameId = active?.frameId ?? "shell"): string {
  return `${FRAME_STORAGE_PREFIX}${frameId}:${key}`;
}

/** 브라우저가 아니면(Jest 등) `null` */
export function browserStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
