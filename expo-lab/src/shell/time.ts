/**
 * 셸의 **가상 시각** — 프레임 `config.now` 를 만들고 읽는다. 전부 한국 시각(KST · UTC+9 · 일광
 * 절약 없음)으로 계산한다 — 브라우저가 어느 시간대에 있든 같은 값이 나오게.
 *
 * `now` 가 null 이면 「실제 시각」이다. 하루 넘기기는 시·분을 그대로 두고 날짜만 옮긴다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type KstParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

export function kstParts(ms: number): KstParts {
  const d = new Date(ms + KST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export const kstDateString = (p: Pick<KstParts, "year" | "month" | "day">) =>
  `${p.year}-${pad(p.month)}-${pad(p.day)}`;

export const kstIso = (p: KstParts) =>
  `${kstDateString(p)}T${pad(p.hour)}:${pad(p.minute)}:00+09:00`;

/** 가상 시각(ms). `now` 가 null 이거나 읽을 수 없으면 실제 시각 */
export function virtualMs(now: string | null | undefined, realMs: number): number {
  if (!now) return realMs;
  const parsed = Date.parse(now);
  return Number.isNaN(parsed) ? realMs : parsed;
}

/** 하루 넘기기/되돌리기 — 시·분은 그대로, 날짜만 `days` 만큼 */
export function shiftDays(now: string | null, days: number, realMs: number): string {
  return kstIso(kstParts(virtualMs(now, realMs) + days * DAY_MS));
}

/** 같은 (가상) 날짜에서 시각만 바꾼다. 「HH:MM」 */
export function setClock(now: string | null, hhmm: string, realMs: number): string {
  const [h = "0", m = "0"] = hhmm.split(":");
  return kstIso({ ...kstParts(virtualMs(now, realMs)), hour: Number(h), minute: Number(m) });
}

const utcDay = (p: Pick<KstParts, "year" | "month" | "day">) =>
  Date.UTC(p.year, p.month - 1, p.day) / DAY_MS;

/** 가상 날짜가 실제 날짜보다 며칠 뒤인가(달력 날짜 기준) */
export function dayOffset(now: string | null, realMs: number): number {
  if (!now) return 0;
  return utcDay(kstParts(virtualMs(now, realMs))) - utcDay(kstParts(realMs));
}

const describeParts = (p: KstParts) =>
  `${p.month}월 ${p.day}일 (${WEEKDAYS[p.weekday]}) ${pad(p.hour)}:${pad(p.minute)}`;

/** 예: "11월 3일 (화) 21:30 · 실제보다 +1일" */
export function describeVirtual(now: string | null, realMs: number): string {
  const parts = kstParts(virtualMs(now, realMs));
  if (!now) return `${describeParts(parts)} · 실제 시각`;
  const offset = dayOffset(now, realMs);
  const tail =
    offset === 0 ? "오늘 · 시각 고정" : `실제보다 ${offset > 0 ? "+" : "−"}${Math.abs(offset)}일`;
  return `${describeParts(parts)} · ${tail}`;
}

/** 상태바 시계 — iOS·Android 기본처럼 12시간제 · 앞자리 0 없음 · 오전/오후 없음 */
export function statusBarClock(now: string | null | undefined, realMs: number): string {
  const { hour, minute } = kstParts(virtualMs(now, realMs));
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad(minute)}`;
}

export const TIME_PRESETS = [
  { id: "real", label: "지금" },
  { id: "08:00", label: "아침 8:00" },
  { id: "21:30", label: "밤 21:30" },
  { id: "03:59", label: "03:59 (04:00 직전)" },
] as const;
