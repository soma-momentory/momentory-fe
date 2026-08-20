import { create } from "zustand";

import { syncCalendarSnapshot } from "@/features/calendar/data/calendarSyncApi";
import { readSyncState, writeSyncState } from "@/features/calendar/data/syncStateStore";
import { expandCalendarEventByDate } from "@/features/calendar/model/expand";
import { resolveCalendarEventIdentities } from "@/features/calendar/model/identity";
import { snapshotHash } from "@/features/calendar/model/hash";
import { normalizeOccurrences } from "@/features/calendar/model/normalize";
import type { CalendarSnapshot, SyncRange } from "@/features/calendar/model/types";
import { sameRange, syncWindow } from "@/features/calendar/model/window";
import { readCalendarEvents } from "@/lib/calendar";
import { clock } from "@/lib/clock";

/**
 * 기기 캘린더 ↔ 서버 화해의 **단일 진입점.**
 *
 * ```
 * 창 계산 → 기기 조회 → 펼치기 → 접기 → 정렬 → 해시
 *   해시·범위가 지난번과 같다  → 서버를 부르지 않는다
 *   다르다                      → 화해 → **성공한 뒤에만** 새 해시 저장
 * ```
 *
 * ## 왜 매번 읽는가 — 증분 동기화 수단이 없다
 *
 * `expo-calendar` 57 의 `lastModifiedDate`·`creationDate` 는 타입 주석에
 * **`@platform ios`** 로 박혀 있고, 2026-08-14 Android 실측 원시 객체에도 그 키가
 * 없었다. 변경 알림(Android `ContentObserver` · iOS `EKEventStoreChanged`)은 OS 에
 * 있지만 `expo-calendar` 가 내보내지 않고, 있어도 **「뭔가 바뀌었다」까지만** 말한다.
 * 그리고 **삭제는 어느 API 로도 보이지 않는다** — 지워진 행은 그냥 없어진다.
 *
 * 그래서 「무엇이 바뀌었나」는 **읽어서 맞춰보는 것 말고 방법이 없다.** 대신
 * 실측 229ms 로 싸고(달력 13개 × 3개월), 해시가 같으면 **서버는 부르지 않는다** —
 * 실제로 비싼 쪽은 왕복이다.
 *
 * ## 앱이 꺼져 있는 동안의 변경
 *
 * 네이티브 옵저버를 붙여도 **프로세스가 죽어 있는 동안의 변경은 못 본다.**
 * 「앱 종료 → 구글 캘린더에서 수정 → 하루 뒤 실행」이 그렇다. 그래서 cold start 는
 * `dirty` 와 무관하게 **무조건 한 번 읽는다.** 옵저버는 나중에 붙더라도
 * *조회 횟수를 줄이는 최적화*일 뿐이고, **정확성은 이 흐름 하나에만 기댄다.**
 */

/**
 * 한 번의 실행이 어떻게 끝났나. **화면에 띄우지 않는다** — 캘린더는 앱의 본체가
 * 아니라 회고 재료를 거드는 것이라, 실패가 홈이나 온보딩을 멈추게 하면 안 된다
 * (`RULES.md` 4). 로그·테스트가 읽는 값이다.
 */
export type SyncOutcome =
  /** 서버까지 갔다 왔다 */
  | { kind: "synced"; created: number; updated: number; deleted: number }
  /** 지난번과 같아서 **서버를 부르지 않았다** */
  | { kind: "unchanged" }
  /** 권한이 없다 — 아무것도 보내지 않았다 */
  | { kind: "denied" }
  /** 기기 조회가 실패했다 — **아무것도 보내지 않았다**(아래 ⛔) */
  | { kind: "unreadable" }
  /** 서버가 받지 못했다. 해시를 저장하지 않았으므로 다음 실행이 다시 보낸다 */
  | { kind: "failed" }
  /** 이미 돌고 있다 */
  | { kind: "busy" };

/**
 * 그 창의 스냅샷을 만든다 — **기기만 본다. 서버도 저장소도 모른다.**
 * 순수해서 테스트에서 그대로 부를 수 있다.
 */
export async function buildSnapshot(
  range: SyncRange,
): Promise<{ ok: true; snapshot: CalendarSnapshot } | { ok: false; reason: "denied" | "failed" }> {
  const read = await readCalendarEvents(range.from, range.to);
  if (!read.ok) return { ok: false, reason: read.reason };

  const identities = resolveCalendarEventIdentities(read.events);
  const occurrences = read.events.flatMap((event, index) =>
    expandCalendarEventByDate(event, range, identities[index]),
  );
  const events = normalizeOccurrences(occurrences);
  return { ok: true, snapshot: { range, events, hash: snapshotHash(range, events) } };
}

type CalendarSyncStore = {
  /**
   * 기기 캘린더가 바뀌었다고 알려진 상태. **지금은 아무도 켜지 않는다** —
   * 네이티브 옵저버가 붙으면 그때 켜진다. 켜져 있어도 정확성은 달라지지 않고,
   * *foreground 재조회를 건너뛸지*를 정하는 데만 쓴다.
   */
  dirty: boolean;
  syncing: boolean;
  /** 마지막 실행 결과 — 디버깅용. 화면이 읽지 않는다 */
  lastOutcome: SyncOutcome | null;
  markDirty: () => void;
  /**
   * 한 번 돌린다. `reason` 은 로그를 읽을 때를 위한 것이고 동작을 가르지 않는다 —
   * **cold start 는 `dirty` 를 보지 않는다**(위 주석).
   */
  sync: (userId: number | string) => Promise<SyncOutcome>;
  reset: () => void;
};

export const useCalendarSync = create<CalendarSyncStore>((set, get) => ({
  dirty: false,
  syncing: false,
  lastOutcome: null,

  markDirty: () => set({ dirty: true }),

  sync: async (userId) => {
    // 겹쳐 부르면 같은 스냅샷을 두 번 보낸다 — 멱등이라 해롭진 않지만 낭비다
    if (get().syncing) return { kind: "busy" };
    set({ syncing: true });

    const finish = (outcome: SyncOutcome): SyncOutcome => {
      set({ syncing: false, lastOutcome: outcome });
      return outcome;
    };

    try {
      const range = syncWindow(clock.today());
      const built = await buildSnapshot(range);

      // ⛔ 못 읽은 것을 「0건」으로 보내면 서버가 그 범위를 통째로 지운다 —
      //    거기 붙은 감정·마침 기록까지 함께. 읽기 실패는 **아무것도 보내지 않는다**
      if (!built.ok) {
        return finish({ kind: built.reason === "denied" ? "denied" : "unreadable" });
      }

      const { snapshot } = built;
      const saved = await readSyncState(userId);
      // 범위와 해시는 한 몸이다 — 창이 달마다 밀리므로 해시만 보면 새 달을 놓친다
      if (saved != null && saved.hash === snapshot.hash && sameRange(saved.range, range)) {
        // dirty 였더라도 실제로 바뀐 것이 없었다는 뜻이다
        set({ dirty: false });
        return finish({ kind: "unchanged" });
      }

      const sent = await syncCalendarSnapshot(range, snapshot.events);
      if (!sent.ok) {
        // 해시를 저장하지 않는다 — 저장하면 다음 실행이 「같으니 건너뛴다」로 읽는다
        return finish({ kind: "failed" });
      }

      await writeSyncState(userId, {
        range,
        hash: snapshot.hash,
        lastSyncAt: clock.now().toISOString(),
      });
      set({ dirty: false });
      return finish({ kind: "synced", ...sent.data });
    } catch {
      // 여기까지 오는 예외는 없어야 하지만, 캘린더 때문에 앱이 멈추는 일은 만들지 않는다
      return finish({ kind: "failed" });
    }
  },

  reset: () => set({ dirty: false, syncing: false, lastOutcome: null }),
}));
