import type { SyncRange } from "@/features/calendar/model/types";

/**
 * 동기화가 맞춰보는 창 — **이전 달 1일 ~ 다음 달 말일.**
 *
 * 8월이면 `2026-07-01 ~ 2026-09-30` 이다. 첫 연결과 이후 화해가 **같은 규칙**이라
 * 창이 달마다 밀린다.
 *
 * ## 밀리는 것이 문제가 되지 않는 이유
 *
 * `9/30~10/5` 워크숍이라면 8월 창에는 `9/30` 한 줄만 들어간다. 그래도 비지 않는다 —
 * 앱은 「오늘」만 보고, 10월이 되면 창이 `9/1~11/30` 으로 밀리면서 `10/1~10/5` 가
 * 채워진다. **미리 넣어 둘 필요가 없다.**
 *
 * ## 창 밖으로 밀려난 과거는 서버에서 굳는다
 *
 * 9월이 되면 7월 일정은 기기에서 지워도 서버에 남는다. 삭제가 **보낸 범위 안에서만**
 * 일어나기 때문이다(`DISCUSSION.md` §1-4). 이건 버그가 아니라 선택이다 — §1-4 가
 * 경고한 대가(「일정을 지우면 거기 남긴 감정·마침 기록이 함께 사라진다」)를
 * **최근 3개월로 가두는** 쪽이다.
 */

/** `YYYY-MM-DD` 로 굳힌다 — 로컬 기준이다. `Date#toISOString` 은 UTC 라 쓰지 않는다 */
const ymd = (year: number, monthIndex: number, day: number): string => {
  const at = new Date(year, monthIndex, day);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
};

/**
 * 그 날짜가 속한 창. 인자는 `clock.today()` 가 준 `YYYY-MM-DD` 다.
 *
 * 달 넘김은 `Date` 에 맡긴다 — `monthIndex` 가 `-1` 이나 `12` 여도 연도가 알아서
 * 넘어간다. 1월이면 `전년 12/1 ~ 당해 2/28`(윤년이면 2/29)이다.
 */
export const syncWindow = (today: string): SyncRange => {
  const at = new Date(`${today}T12:00:00`);
  const year = at.getFullYear();
  const month = at.getMonth();

  return {
    from: ymd(year, month - 1, 1),
    // 다음 달의 「0일」 = 그 달의 말일. 말일을 직접 세지 않는다
    to: ymd(year, month + 2, 0),
  };
};

/** 두 창이 같은가 — 범위가 바뀌면 해시가 같아도 다시 화해해야 한다 */
export const sameRange = (a: SyncRange, b: SyncRange): boolean =>
  a.from === b.from && a.to === b.to;
