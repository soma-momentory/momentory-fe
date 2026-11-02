/**
 * 가짜 서버의 시각 계산 — **한국시간(KST) 04:00 하루 경계**. 서버(`DayBoundary`)와 같은 판정이다.
 *
 * 하루 계산 자체는 앱의 `src/lib/clock.ts`(`dayFrom` · `addDays` · `momentOf`)를 그대로 빌린다.
 * 그 함수들은 **기기 시간대**의 벽시계를 읽으므로, 순간을 KST 벽시계로 옮겨(기기 시간대가 KST 면
 * 이동 0) 넘긴다 — 브라우저가 어느 시간대여도 서버처럼 KST 로 하루를 가른다.
 */
import { addDays, dayFrom, momentOf } from "@/lib/clock";

export { addDays };

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 벽시계를 기기 벽시계로 읽게 옮기는 양(ms). 기기가 KST 면 0 */
const shiftFor = (ms: number) => KST_OFFSET_MS + new Date(ms).getTimezoneOffset() * 60 * 1000;

/** 순간 → 그 순간이 속한 하루(KST · 04:00 경계) `YYYY-MM-DD` */
export const dayOf = (ms: number): string => dayFrom(new Date(ms + shiftFor(ms)));

/** ISO → 하루. 못 읽으면 `null` */
export const dayOfIso = (iso: string): string | null => {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : dayOf(ms);
};

/**
 * 하루 `day` 의 KST `hour:minute` 순간(ms). 04:00 전 시각은 그 하루에 속하는 다음 달력 날이다
 * (`momentOf` 와 같은 뜻).
 */
export const kstMoment = (day: string, hour: number, minute: number): number => {
  const local = momentOf(day, hour, minute).getTime();
  return local - shiftFor(local);
};

export const kstIso = (day: string, hour: number, minute: number): string =>
  new Date(kstMoment(day, hour, minute)).toISOString();

/** 요일(0=일 … 6=토) — 날짜 문자열만 본다 */
export const weekdayOf = (day: string): number => {
  const [y = 2026, m = 1, d = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** 그 날이 든 주의 일요일 */
export const sundayOf = (day: string): string => addDays(day, -weekdayOf(day));

/** `from`~`to`(포함) 사이의 날짜들 */
export const daysBetween = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
};

/** KST 벽시계의 시(0~23) */
export const kstHourOf = (ms: number): number => new Date(ms + KST_OFFSET_MS).getUTCHours();

export const isDay = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const isHhmm = (v: unknown): v is string =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
