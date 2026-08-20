/**
 * 날짜 **표기** 유틸 — 문자열을 사람의 말로 바꾸기만 한다.
 *
 * ⚠ **하루는 새벽 4:00 에 넘어간다**(`RULES.md` 「불변 규칙」) — 자정이 아니다.
 * 그 경계 계산과 「오늘」의 공급은 `src/lib/clock.ts` 가 한다 — 여기서 오늘을
 * 만들지 않는다. `ARCHITECTURE.md §4` — "`date` 계산은 전부 이 유틸을 지난다".
 */
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** `"2026-07-27"` → `"7월 27일 월요일"` — 홈 상단 한 줄 */
export function formatKoreanDate(iso: string) {
  const [y = "0", m = "1", d = "1"] = iso.split("-");
  const weekday = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return `${Number(m)}월 ${Number(d)}일 ${weekday}요일`;
}

/** `"2026-07"` → `"2026년 7월"` — 달력·목록의 달 라벨 */
export function formatKoreanMonth(month: string) {
  const [y = "0", m = "1"] = month.split("-");
  return `${Number(y)}년 ${Number(m)}월`;
}

/**
 * `"2026-07-27"` → `"월"` — 요일 한 글자.
 *
 * 홈 상단이 날짜(`7월 27일`)와 요일(`월요일`)을 **두 줄로 나눠** 쓰고
 * (`Home Sample.dc.html`), 이번 주 감정 줄이 요일 한 글자를 쓴다.
 * `formatKoreanDate` 와 같은 표를 봐야 두 곳이 어긋나지 않는다.
 */
export function koreanWeekday(iso: string) {
  const [y = "0", m = "1", d = "1"] = iso.split("-");
  return WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()] ?? "";
}

/**
 * `"2026-07-28"` → `"7월 28일"` — 문장 안에 들어가는 짧은 형태.
 * 「회고 대화에서 작성 · **7월 28일** 수정」처럼 요일이 문장을 늘어뜨리는 자리에 쓴다.
 */
export function formatKoreanDateShort(iso: string) {
  const [, m = "1", d = "1"] = iso.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}
