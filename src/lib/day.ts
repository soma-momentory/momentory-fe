/**
 * 하루를 다루는 유틸.
 *
 * ⚠ **하루는 새벽 4:00 에 넘어간다**(`RULES.md` 「불변 규칙」) — 자정이 아니다.
 * 그 경계 계산은 실제 날짜를 다루기 시작할 때(첫 로컬 쓰기 · M3) 여기 들어온다.
 * 지금은 샘플 하루가 고정(2026-07-27)이라 형식만 필요하다.
 * `ARCHITECTURE.md §4` — "`date` 계산은 전부 이 유틸을 지난다".
 */
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** `"2026-07-27"` → `"7월 27일 월요일"` — 홈 상단 한 줄 */
export function formatKoreanDate(iso: string) {
  const [y = "0", m = "1", d = "1"] = iso.split("-");
  const weekday = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return `${Number(m)}월 ${Number(d)}일 ${weekday}요일`;
}
