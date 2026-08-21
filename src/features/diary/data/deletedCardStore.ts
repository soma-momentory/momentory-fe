import * as SecureStore from "expo-secure-store";

import { currentUserId } from "@/features/auth/model/auth";

/**
 * 지운 행동 카드의 **묘비** — 기기에 눕는다.
 *
 * ## 왜 필요한가
 *
 * 서버 계약에 `DELETE /api/v1/action-cards/{id}` 가 없다(`docs/api/openapi.json` —
 * 카드는 생성과 `completion` 뿐이다). 그래서 지운 카드는 **다음 조회에 다시
 * 실려 온다.** 메모리에서만 빼면 「삭제했어요」라고 말해 놓고 앱을 다시 켜면
 * 그 카드가 그대로 앉아 있다 — 알린 것과 실제가 어긋난다.
 *
 * 그래서 **지운 id 를 기기에 남기고 `load()` 가 그것을 걸러낸다.** 서버에서
 * 지우는 것이 아니므로 「기기에서만 지운 것」이지만, 적어도 **이 기기에서는
 * 삭제가 유지된다.** 서버에 삭제가 생기면 이 파일을 지우고 `data/diaryApi` 로
 * 보내면 된다 — 부르는 쪽은 아래 세 함수만 안다.
 *
 * ## 왜 SecureStore 인가 (그리고 언제 옮기나)
 *
 * `calendar/data/syncStateStore.ts` 와 같은 이유다 — 지금 깔린 로컬 persistence
 * 가 `expo-secure-store` 하나뿐이고(MMKV 는 M3 · AsyncStorage 미설치), 담는 것이
 * 짧은 id 목록이라 **이것 때문에 새 네이티브 의존성을 늘리지 않는다.**
 * MMKV 가 오면 **이 파일만** 바꾼다.
 *
 * ## 사용자별 namespace 가 필수인 이유
 *
 * 카드 id 는 서버의 전역 번호다. A 가 카드 `123` 을 지우고 로그아웃한 뒤 B 가
 * 로그인하면, namespace 가 없을 때 **B 의 카드 `123` 이 조용히 사라진다.**
 * 그래서 키에 `userId` 가 들어가고, 로그아웃이 `clearDeletedCards` 를 부른다
 * (`auth.ts` `clearUserScopedStores`).
 *
 * ## 던지지 않는다
 *
 * 읽기가 실패하면 **빈 목록**이다 — 거르지 못해 카드가 되살아날 뿐, 없는 카드를
 * 지우지는 않는다(안전한 쪽). 쓰기 실패는 `false` 로 알린다 — 부르는 쪽이 그것을
 * 보고 **삭제를 되돌리고 실패 한 줄을 띄운다.** 남기지 못한 삭제를 성공이라고
 * 말하지 않기 위해서다.
 */

/** SecureStore 키는 `[A-Za-z0-9._-]` 만 받는다 — id 가 무엇이든 통과하게 다듬는다 */
const keyFor = (userId: number | string) =>
  `momentory.diary.deletedCards.${String(userId).replace(/[^A-Za-z0-9._-]/g, "_")}`;

/**
 * 들고 있는 묘비의 상한 — **최근 것부터** 남긴다.
 *
 * SecureStore 는 안드로이드에서 값이 2048바이트를 넘으면 경고한다. id 는 짧지만
 * 목록은 계속 자라므로 상한을 둔다. 넘겨서 떨어져 나간 아주 오래된 삭제는
 * 되살아날 수 있는데, 조회 창이 12개월(`ARCHIVE_MONTHS`)이고 카드는 하루 한
 * 장이라 이 수는 그 창보다 넉넉하다.
 */
const MAX_TOMBSTONES = 200;

/** 모양까지 확인한 것만 돌려준다 — 앱 버전이 바뀌며 형태가 달라졌을 수 있다 */
const parse = (raw: string): string[] => {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
};

const read = async (userId: number): Promise<string[]> => {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(userId));
    return raw == null ? [] : parse(raw);
  } catch {
    return [];
  }
};

/**
 * 이 기기에서 지운 카드 id — `load()` 가 서버 응답에서 이것을 걸러낸다.
 * 세션이 없으면(로그인 전) 비어 있다.
 */
export async function readDeletedCardIds(): Promise<ReadonlySet<string>> {
  const userId = await currentUserId();
  if (userId == null) return new Set();
  return new Set(await read(userId));
}

/**
 * 지운 카드를 기록한다. **남기지 못하면 `false`** — 부르는 쪽이 삭제를 되돌린다.
 *
 * 이미 있는 id 면 다시 쓰지 않고 `true` 다(멱등).
 */
export async function rememberDeletedCard(cardId: string): Promise<boolean> {
  const userId = await currentUserId();
  // 세션이 없으면 서버가 이 카드를 다시 줄 일도 없다 — 남길 것이 없다
  if (userId == null) return true;

  try {
    const kept = await read(userId);
    if (kept.includes(cardId)) return true;
    // 최근 것이 뒤에 쌓이고, 넘치면 **가장 오래된 것부터** 떨어진다
    const next = [...kept, cardId].slice(-MAX_TOMBSTONES);
    await SecureStore.setItemAsync(keyFor(userId), JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/** 로그아웃·계정 삭제가 부른다. 남기면 다음 사용자의 같은 번호 카드가 사라진다 */
export async function clearDeletedCards(userId: number | string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(keyFor(userId));
  } catch {
    // 지우지 못해도 다음 사용자는 자기 키를 쓴다 — 키에 userId 가 들어 있다
  }
}
