import * as SecureStore from "expo-secure-store";

import type { CalendarSyncState } from "@/features/calendar/model/types";

/**
 * 동기화 상태가 눕는 자리 — **사용자마다 따로.**
 *
 * ## 왜 SecureStore 인가 (그리고 언제 옮기나)
 *
 * 지금 이 저장소에 깔린 로컬 persistence 는 `expo-secure-store` 하나뿐이다
 * (MMKV 는 M3 · AsyncStorage 미설치). 담는 것이 해시 한 줄과 날짜 둘이라
 * **이것 때문에 새 네이티브 의존성을 늘리지 않는다.**
 *
 * ⚠ 다만 여기는 원래 **비밀**이 눕는 곳이고 CLAUDE.md 는 "SecureStore 에는
 * 모멘토리 토큰만"이라고 적어 뒀다. 해시는 비밀이 아니다 — 넣어서 해로울 것은
 * 없지만 제자리도 아니다. **MMKV 가 오면 이 파일만 바꾼다** — 부르는 쪽은
 * 아래 세 함수만 알고 있으므로 다른 곳은 손대지 않는다.
 *
 * ## 사용자별 namespace 가 필수인 이유
 *
 * ```
 * A 로그인 → 해시 저장 → 로그아웃 → B 로그인 → A 의 해시와 비교 → 같다 → 건너뜀
 * ```
 *
 * B 의 첫 동기화가 통째로 사라진다. 그래서 키에 `userId` 가 들어가고,
 * 로그아웃이 `clearSyncState` 를 부른다(`auth.ts` `clearUserScopedStores`).
 *
 * ## 던지지 않는다
 *
 * 저장이 실패하면 **다음 실행이 한 번 더 보낼 뿐**이다(화해는 멱등이다).
 * 읽기가 실패하면 `null` 이고 그것도 한 번 더 보내는 것으로 끝난다. 어느 쪽도
 * 사용자에게 보일 일이 아니다.
 */

/** SecureStore 키는 `[A-Za-z0-9._-]` 만 받는다 — id 가 무엇이든 통과하게 다듬는다 */
const keyFor = (userId: number | string) =>
  `momentory.calendarSync.${String(userId).replace(/[^A-Za-z0-9._-]/g, "_")}`;

const isRange = (value: unknown): value is CalendarSyncState["range"] => {
  if (typeof value !== "object" || value == null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.from === "string" && typeof r.to === "string";
};

/**
 * 모양까지 확인한 것만 돌려준다 — 앱 버전이 바뀌며 형태가 달라졌을 수 있다.
 * 하나라도 어긋나면 `null` 이고, 그러면 **전량 화해로 되돌아간다**(안전한 쪽).
 */
const parse = (raw: string): CalendarSyncState | null => {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value == null) return null;
    const s = value as Record<string, unknown>;
    if (typeof s.hash !== "string" || s.hash.length === 0) return null;
    if (typeof s.lastSyncAt !== "string") return null;
    if (!isRange(s.range)) return null;
    return { hash: s.hash, lastSyncAt: s.lastSyncAt, range: s.range };
  } catch {
    return null;
  }
};

export async function readSyncState(userId: number | string): Promise<CalendarSyncState | null> {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(userId));
    return raw == null ? null : parse(raw);
  } catch {
    return null;
  }
}

/**
 * ⚠ **서버 화해가 성공한 뒤에만 부른다.** 먼저 저장하면 전송이 실패했는데도
 * 다음 실행이 「해시가 같으니 보낼 것이 없다」로 읽어 **그 변경을 영영 놓친다.**
 */
export async function writeSyncState(
  userId: number | string,
  state: CalendarSyncState,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(keyFor(userId), JSON.stringify(state));
  } catch {
    // 다음 실행이 한 번 더 보낸다 — 화해는 멱등이다
  }
}

/** 로그아웃·계정 삭제가 부른다. 남기면 다음 사용자가 앞 사람의 해시를 본다 */
export async function clearSyncState(userId: number | string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(keyFor(userId));
  } catch {
    // 지우지 못해도 다음 사용자는 자기 키를 쓴다 — 키에 userId 가 들어 있다
  }
}
