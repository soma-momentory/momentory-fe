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
 * 그래서 키에 `userId` 가 들어간다.
 *
 * ⚠ **로그아웃은 묘비를 지우지 않는다.** 키가 사용자별이라 지울 이유가 없고,
 * 서버에 삭제 계약이 없어 **묘비가 유일한 삭제 기록**이다 — 지우면 같은 사람이
 * 다시 로그인했을 때 지운 카드가 되살아나 위 약속이 깨진다. `clearDeletedCards`
 * 는 **계정 삭제처럼 기기에서 흔적을 지우는 흐름**을 위해 남겨 둔 것이다.
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
 * 상한은 **개수가 아니라 바이트**다 — 실제로 걸리는 제약이 그것이기 때문이다.
 * SecureStore 는 안드로이드에서 값이 2048바이트를 넘으면 경고하고, 앞으로는
 * 오류가 될 수 있다고 문서가 예고한다. 여유를 두고 1800.
 *
 * ⚠ **12개월치를 전부 담지는 못한다.** 조회 창이 12개월(`ARCHIVE_MONTHS`)이고
 * 카드는 하루 한 장까지 생기므로 이론상 365건인데, 여기 들어가는 것은 id 길이에
 * 따라 **250~360건**이다. 그보다 더 지운 사용자는 **가장 오래된 삭제부터**
 * 떨어져 나가 그 카드가 다음 조회에 되살아난다.
 *
 * 그 지점을 여기서 더 늘리지 않는 이유: 2048바이트가 플랫폼 제약이라 값을
 * 쪼개 여러 키에 나눠 담는 수밖에 없는데, **이 파일은 서버에
 * `DELETE /api/v1/action-cards/{id}` 가 생기면 통째로 사라진다**
 * (`docs/PRODUCT.md` 「상류와 차이」 25). 임시 장치에 그 복잡도를 얹지 않는다.
 */
const MAX_TOMBSTONE_BYTES = 1800;

/**
 * 저장 모양은 **쉼표로 이은 id 목록**이다(`"7,8,9"`). JSON 배열(`["7","8"]`)보다
 * id 하나당 3바이트 남짓 아껴서, 같은 바이트로 **1.5배쯤 더** 담는다.
 *
 * 전제: **id 에 쉼표가 없다** — 서버 번호(`"1234"`)이거나 로컬 id(`*-local-*`)다.
 */
const SEPARATOR = ",";

/**
 * 저장된 문자열 → id 목록. **두 모양을 다 읽는다** — 지금 쓰는 쉼표 목록과,
 * 앞 버전이 눕혀 둔 JSON 배열. 옛 모양을 못 읽으면 **그 사람의 삭제가 통째로
 * 되살아난다** — 앱을 업데이트했을 뿐인데.
 */
const parse = (raw: string): string[] => {
  const text = raw.trim();
  if (text.length === 0) return [];
  if (!text.startsWith("[")) return text.split(SEPARATOR).filter((v) => v.length > 0);
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
};

/**
 * 바이트 예산 안에 들어오는 만큼만 — **최근 것부터 담고, 넘치면 가장 오래된 것을
 * 버린다.** id 는 ASCII 라 글자 수가 곧 바이트다.
 */
const withinBudget = (ids: readonly string[]): string[] => {
  const kept: string[] = [];
  let bytes = 0;
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i];
    if (id == null) continue;
    const size = id.length + (kept.length > 0 ? SEPARATOR.length : 0);
    if (bytes + size > MAX_TOMBSTONE_BYTES) break;
    bytes += size;
    kept.unshift(id);
  }
  return kept;
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
  // 아직 눕지 않은 묘비를 기다린다 — 「지우자마자 새로고침」이 그 카드를 다시
  // 그리지 않게(쓰기는 아래 `queue` 가 한 줄로 세운다)
  await queue.catch(() => undefined);
  return new Set(await read(userId));
}

/**
 * 쓰기를 **한 줄로 세운다**(`features/my/model/reminders.ts` 와 같은 결).
 *
 * 한 줄이 필요한 이유는 이것이 **읽고-고쳐-쓰기**이기 때문이다. 카드 둘을 잇따라
 * 지우면 두 호출이 같은 목록을 읽고 각자 자기 id 만 붙여 쓴다 — **나중 것이 앞의
 * 것을 덮어** 첫 번째 카드가 다음 조회에 되살아난다. 지운 적 없는 카드가 살아
 * 있는 것보다, 지운 카드가 되살아나는 쪽이 사용자에게 더 나쁘다.
 */
let queue: Promise<unknown> = Promise.resolve();

const append = async (userId: number, cardId: string): Promise<boolean> => {
  try {
    const kept = await read(userId);
    if (kept.includes(cardId)) return true;
    // 최근 것이 뒤에 쌓인다 — 예산을 넘기면 앞(오래된 것)부터 떨어진다
    const next = withinBudget([...kept, cardId]);
    await SecureStore.setItemAsync(keyFor(userId), next.join(SEPARATOR));
    return true;
  } catch {
    return false;
  }
};

/**
 * 지운 카드를 기록한다. **남기지 못하면 `false`** — 부르는 쪽이 삭제를 되돌린다.
 *
 * 이미 있는 id 면 다시 쓰지 않고 `true` 다(멱등).
 */
export async function rememberDeletedCard(cardId: string): Promise<boolean> {
  const userId = await currentUserId();
  // 세션이 없으면 서버가 이 카드를 다시 줄 일도 없다 — 남길 것이 없다
  if (userId == null) return true;

  const run = queue.then(() => append(userId, cardId));
  // 하나가 실패해도 줄은 계속 돈다 — 다음 삭제까지 막을 이유가 없다
  queue = run.catch(() => false);
  return run;
}

/** 계정 삭제처럼 **기기에서 흔적을 지우는 흐름**이 부른다. 로그아웃은 부르지 않는다 */
export async function clearDeletedCards(userId: number | string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(keyFor(userId));
  } catch {
    // 지우지 못해도 다음 사용자는 자기 키를 쓴다 — 키에 userId 가 들어 있다
  }
}
