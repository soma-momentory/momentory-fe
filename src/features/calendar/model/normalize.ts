import type { Occurrence, SyncEvent } from "@/features/calendar/model/types";

/**
 * 편 회차들을 **서버로 보낼 모양**으로 만든다 — 접고, 정렬하고, 좁힌다.
 *
 * ```
 * Occurrence[]  →  중복 접기  →  안정 정렬  →  calendarId·eventId 떼기  →  SyncEvent[]
 * ```
 *
 * 순서가 중요하다. **접기를 정렬보다 먼저** 해야 한다 — 정렬 뒤에 접으면 어느 것이
 * 남는지가 정렬 결과에 딸려 흔들린다.
 */

/**
 * **서로 다른 달력이 같은 일정을 들고 있으면 한 줄로 접는다.**
 *
 * 2026-08-14 실측: 사용자의 구글 계정 **둘**이 같은 연락처 생일을 각자 들고 있어
 * `2026-09-07 생일 축하합니다!` 가 두 줄로 왔다. 그대로 두면 홈에 같은 줄이 둘이다.
 * 접어도 **사라지는 정보가 없다** — 줄 하나로 합쳐질 뿐이다.
 *
 * ⚠ **같은 달력 안에서는 접지 않는다.** 한 달력에 같은 날 같은 제목이 둘이면
 * 사용자가 진짜로 둘 만든 것일 수 있다(「점심 약속」 두 건). 그래서 **한 달력이
 * 가진 개수**를 그 일정의 진짜 개수로 본다 — 여러 달력은 같은 것을 나눠 들고 있을
 * 뿐이라고 읽는다.
 *
 * 남길 줄은 `externalId` **사전순 최솟값**부터 고른다. 달력이 오는 순서가 바뀌어도
 * 같은 것이 남아야 화해가 지웠다 새로 만들지 않는다.
 */
const fold = (rows: Occurrence[]): Occurrence[] => {
  const groups = new Map<string, Occurrence[]>();
  for (const row of rows) {
    // 날짜는 길이가 고정(`YYYY-MM-DD`)이라 공백으로 갈라도 경계가 흐려지지 않는다
    const key = `${row.date} ${row.title}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  const keep = new Set<string>();
  for (const group of groups.values()) {
    const perCalendar = new Map<string, number>();
    for (const row of group) {
      perCalendar.set(row.calendarId, (perCalendar.get(row.calendarId) ?? 0) + 1);
    }
    const real = Math.max(...perCalendar.values());
    [...group]
      .sort((a, b) => (a.externalId < b.externalId ? -1 : 1))
      .slice(0, real)
      .forEach((row) => keep.add(row.externalId));
  }

  const out: Occurrence[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    // 같은 키가 두 번 나오는 것도 여기서 막는다 — 멀티데이 반복 일정이 자기 자신과
    // 겹치면(5일짜리가 3일마다) 같은 `id@date` 가 두 번 나올 수 있다
    if (!keep.has(row.externalId) || seen.has(row.externalId)) continue;
    seen.add(row.externalId);
    out.push(row);
  }
  return out;
};

/**
 * **결정적 정렬** — 같은 캘린더를 두 번 읽으면 배열이 글자 하나까지 같아야 한다.
 *
 * 해시가 이 순서 위에 서 있다. 정렬이 흔들리면 **내용이 그대로인데 해시가 달라져서**
 * 매번 서버를 부르게 된다 — 해시가 하는 일이 없어진다. `listEvents` 가 주는 순서는
 * 달력 목록 순서·플랫폼에 딸려 다니므로 믿지 않는다.
 *
 * `date` → `title` → `externalId` 순이다. **`title` 을 두 번째에 두는 이유**는
 * `externalId` 가 해시라서 사람이 볼 때 아무 의미가 없기 때문이다 — 같은 날 여러
 * 일정이 가나다순으로 서면 적어도 눈에 납득이 간다. `externalId` 는 제목까지 같을
 * 때를 가르는 마지막 기준이다(그러면 순서는 임의여도 **안정적**이면 된다).
 */
const byDateThenTitle = (a: Occurrence, b: Occurrence): number => {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  if (a.externalId === b.externalId) return 0;
  return a.externalId < b.externalId ? -1 : 1;
};

/**
 * 접기 → 정렬 → **서버로 갈 셋만 남기기.**
 *
 * `calendarId`·`eventId` 는 여기서 떨어진다. 로컬에서 필요하면 `Occurrence` 를
 * 그대로 들면 되고, **서버로는 나가지 않는다** — 달력 id 와 계정 구조가 서버에
 * 남으면 `09.md` 안내("일정 제목을 저장해요")와 어긋난다.
 */
export const normalizeOccurrences = (rows: Occurrence[]): SyncEvent[] =>
  [...fold(rows)]
    .sort(byDateThenTitle)
    .map(({ externalId, date, title }) => ({ externalId, date, title }));
