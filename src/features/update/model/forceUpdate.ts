import Constants from "expo-constants";
import { Platform } from "react-native";

import { APP_VERSION_POLICY_URL } from "@/lib/links";

/**
 * 강제 업데이트 판정 — **이 버전보다 낮으면 앱을 막는다.**
 *
 * 기준 숫자는 앱 밖, 랜딩 서버의 정적 파일(`APP_VERSION_POLICY_URL`)에 둔다.
 * 앱 안에 적어 두면 기준을 올릴 때마다 빌드를 다시 내야 하기 때문이다.
 *
 * ```json
 * { "ios": "1.4.2", "android": "1.4.2" }
 * ```
 *
 * ## 실패하면 통과시킨다
 *
 * 파일이 없거나(404) · 네트워크가 끊겼거나 · 형태가 틀리면 **막지 않는다.**
 * 랜딩 서버가 잠깐 죽었다고 모든 사용자가 갇히면 안 된다.
 *
 * ⚠ **숫자는 새 버전이 양쪽 스토어에 100% 풀린 뒤에 올린다.** 단계적 출시 도중에
 * 올리면 스토어에 업데이트 버튼이 없는 사용자가 차단 화면에 갇힌다.
 *
 * `src/lib/http.ts` 를 지나지 않는다 — 그 통로는 Bearer 를 싣는 API 서버 호출용이고,
 * 이 파일은 로그인 전에도 읽는 정적 파일이다(`logoutApi.ts` 와 같은 부류).
 */

/** 시작을 오래 붙잡지 않는다 — 그 안에 못 받으면 통과 */
export const POLICY_TIMEOUT_MS = 5_000;

type Version = readonly number[];

/** `"1.4.2"` → `[1, 4, 2]`. 숫자 셋 모양이 아니면 `null` */
export function parseVersion(value: unknown): Version | null {
  if (typeof value !== "string" || !/^\d+(\.\d+){0,2}$/.test(value.trim())) return null;
  return value.trim().split(".").map(Number);
}

/** `current` 가 `min` 보다 낮은가. 빠진 자리는 0 으로 본다(`"1.5"` = `"1.5.0"`) */
export function isOlder(current: Version, min: Version): boolean {
  for (let i = 0; i < 3; i++) {
    const a = current[i] ?? 0;
    const b = min[i] ?? 0;
    if (a !== b) return a < b;
  }
  return false;
}

/**
 * 받은 정책과 현재 버전으로 판정한다. 어느 쪽이든 읽을 수 없으면 `false`(통과).
 * 플랫폼이 `ios` · `android` 가 아니면(웹 Lab) 언제나 통과다.
 */
export function mustUpdate(policy: unknown, platform: string, currentVersion: unknown): boolean {
  if (platform !== "ios" && platform !== "android") return false;
  if (typeof policy !== "object" || policy == null) return false;
  const min = parseVersion((policy as Record<string, unknown>)[platform]);
  const current = parseVersion(currentVersion);
  return min != null && current != null && isOlder(current, min);
}

/** 정책 파일을 받아 판정한다. **던지지 않는다** — 실패는 전부 `false` */
export async function checkMustUpdate(): Promise<boolean> {
  // `AbortSignal.timeout` 은 Hermes 에 없을 수 있다 — `logoutApi.ts` 와 같은 방식으로 끊는다
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POLICY_TIMEOUT_MS);
  try {
    const response = await fetch(APP_VERSION_POLICY_URL, {
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    if (!response.ok) return false;
    return mustUpdate(await response.json(), Platform.OS, Constants.expoConfig?.version);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
