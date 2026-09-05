import { captureAnalytics } from "@/features/analytics";
import type { SyncEvent, SyncRange } from "@/features/calendar/model/types";
import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 기기 캘린더 화해 — `POST /api/v1/schedules/sync`.
 *
 * ```
 * { from, to, events: [{ externalId, date, title }, …] }
 *   → 200 { created, updated, deleted }
 * ```
 *
 * 서버와 프론트가 공유하는 화해 계약이다. 화면·store 는 서버 응답 모양을 직접
 * 보지 않고 이 경계만 지난다.
 *
 * ## 이 요청이 「추가」가 아니라 「화해」인 이유
 *
 * 기기에서 지운 일정은 **훑어도 나오지 않는다.** 「새 것 있나」로는 삭제를 알 수
 * 없어서, 그 범위의 기기 일정 **전부**를 보내고 서버가 맞춰본다(`DISCUSSION.md` §1-4).
 *
 * 서버가 하는 일 — 대상은 `현재 user` **AND** `source = CALENDAR` **AND**
 * `date ∈ [from, to]` 를 **모두** 만족하는 행뿐이다:
 *
 * | 상태                     | 서버 동작                                    |
 * | ------------------------ | -------------------------------------------- |
 * | 스냅샷에만 있음          | CREATE                                       |
 * | 양쪽에 있음              | `date`·`title` UPDATE · **`hidden` 은 유지** |
 * | DB 에만 있음             | DELETE                                       |
 * | `source = MANUAL`        | **절대 건드리지 않는다**                     |
 * | 범위 밖                  | **절대 건드리지 않는다**                     |
 *
 * `hidden` 유지가 특히 중요하다 — 초기화하면 `12-c` 에서 숨긴 일정이 **다음 화해마다
 * 되살아난다.** 완료·감정도 같은 이유로 보존한다.
 *
 * ## `events: []` 는 정상이다
 *
 * 그 범위를 전부 지운 사용자가 있다. 그래서 서버는 빈 스냅샷을 거절하지 않는다 —
 * **잘못된 빈 목록을 막는 것은 FE 몫이다**(`readCalendarEvents` 가 실패를
 * `{ ok: false }` 로 갈라 주고, 그때는 이 함수를 부르지 않는다).
 *
 * ## `externalId` 는 불투명하다
 *
 * 서버는 파싱하지 않는다. 우리가 만드는 규칙이 바뀌어도 서버는 모른다
 * (`externalId.ts`). 서버가 기대하는 것은 **같은 회차면 같은 문자열**이라는 것뿐이다.
 */
export const CALENDAR_SYNC_PATH = "/api/v1/schedules/sync";

/**
 * 화면이 이것을 기다리지 않는다 — 홈은 캘린더 없이도 그려진다. 그래도 상한을
 * 짧게 두는 이유는, 실패하면 **다음 실행이 같은 것을 다시 보내면 그만**이라
 * 오래 붙들고 있을 값이 없어서다.
 */
export const CALENDAR_SYNC_TIMEOUT_MS = 15_000;

/** 서버가 실제로 무엇을 했는지 — 로그·테스트에서 읽는다 */
export type CalendarSyncResult = {
  created: number;
  updated: number;
  deleted: number;
};

const asCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/**
 * 응답의 모양은 **호출부가 확인한다**(`http.ts` 는 안전 파싱까지만 한다).
 * 카운트가 빠져 있어도 실패로 보지 않는다 — 화해가 됐는지 여부는 상태 코드가
 * 말하고, 숫자는 우리 눈으로 보는 값이다.
 */
const toResult = (data: unknown): CalendarSyncResult => {
  const d = (typeof data === "object" && data != null ? data : {}) as Record<string, unknown>;
  return {
    created: asCount(d.created),
    updated: asCount(d.updated),
    deleted: asCount(d.deleted),
  };
};

/**
 * 스냅샷을 보낸다. **던지지 않는다** — `{ ok, error }` 로 닫는다(`http.ts` 규약).
 *
 * 실패했을 때 **부르는 쪽이 해시를 저장하면 안 된다.** 저장하면 다음 실행이
 * 「같으니 보낼 것 없다」로 읽어 그 변경을 영영 놓친다.
 */
export async function syncCalendarSnapshot(
  range: SyncRange,
  events: SyncEvent[],
): Promise<{ ok: true; data: CalendarSyncResult } | { ok: false; error: HttpError }> {
  const record = captureAnalytics();
  const result = await authedRequest<unknown>(
    "POST",
    CALENDAR_SYNC_PATH,
    { from: range.from, to: range.to, events },
    { timeoutMs: CALENDAR_SYNC_TIMEOUT_MS },
  );

  if (!result.ok) return result;
  const data = toResult(result.data);
  record("calendar_sync_succeeded", {
    created: data.created,
    updated: data.updated,
    deleted: data.deleted,
  });
  return { ok: true, data };
}
