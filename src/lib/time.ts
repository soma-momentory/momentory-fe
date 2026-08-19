/**
 * `"21:30"` → `"밤 9:30"`. 홈·완료 카드·회고 시간이 같은 말투로 시각을
 * 말한다(`12.md` · `10.md` — "한 값을 두 곳에 따로 적지 않는다").
 */
export function formatKoreanTime(hhmm: string) {
  const [h = "0", m = "00"] = hhmm.split(":");
  const hour = Number(h);
  const period = hour < 6 ? "새벽" : hour < 12 ? "아침" : hour < 18 ? "낮" : "밤";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${h12}:${m}`;
}

/**
 * `"21:30"` → `{ hour: 21, minute: 30 }`. **시각을 부분으로 가르는 곳은 여기 하나다** —
 * OS 피커의 초기값과 알림 예약(`lib/notifications.ts`)이 같은 해석을 써야 한다.
 *
 * 형태가 아니면 `NaN` 이 나온다. **0 으로 메우지 않는다** — 읽지 못한 것을
 * 자정으로 바꾸면 알림이 한밤중에 울린다. 부르는 쪽이 보고 판단한다.
 */
export function parseHHMM(hhmm: string) {
  const [h, m] = hhmm.split(":");
  // `Number("")` 는 0 이다 — 빈 칸을 「0시」로 읽지 않으려면 먼저 걸러야 한다
  const num = (part: string | undefined) =>
    part == null || part.trim() === "" ? NaN : Number(part);
  return { hour: num(h), minute: num(m) };
}

/**
 * `"21:30"` → 오늘 그 시각의 `Date`. OS 시간 피커의 초기값으로 쓴다.
 *
 * 여기서는 읽지 못한 부분을 0 으로 메운다 — 피커가 어떤 값이든 하나는 들고
 * 열려야 하고, 잘못 골라도 사용자가 그 자리에서 다시 고른다. 알림 예약은
 * 반대로 건너뛴다(`lib/notifications.ts`).
 */
export function dateAtTime(hhmm: string) {
  const { hour, minute } = parseHHMM(hhmm);
  const d = new Date();
  d.setHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0);
  return d;
}

/** `Date` → `"HH:mm"`. 초안·스키마가 쓰는 형태다 */
export function toHHMM(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 시간 휠(`design.md` §11 「시간 선택」)의 눈금 — **오전·오후 / 1~12시 / 5분 단위**.
 *
 * **온보딩 `08` 과 마이 `M2` 가 같은 휠을 연다.** 눈금과 변환을 화면마다 들면
 * 한쪽만 고쳐졌을 때 같은 시각이 두 화면에서 다른 칸에 선다 — 시각을 부분으로
 * 가르는 곳이 여기 하나라는 규칙(`parseHHMM` 주석)의 연장이다.
 *
 * 휠은 **문자열**을 다룬다 — 표시와 값을 하나로 두면 열마다 변환이 생기지 않는다.
 */
export const WHEEL_PERIODS = ["오전", "오후"] as const;
export const WHEEL_HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
export const WHEEL_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export type WheelTime = { period: string; hour: string; minute: string };

/** `"21:30"` → `{ 오후, "9", "30" }`. 읽지 못한 부분은 기본 회고 시각으로 메운다 */
export function toWheelTime(hhmm: string): WheelTime {
  const [h = "21", m = "30"] = hhmm.split(":");
  const hour24 = Number(h);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  // 5분 눈금 밖의 값(서버가 준 21:37 같은 것)은 가장 가까운 눈금으로 내린다
  const nearest = WHEEL_MINUTES.reduce((best, v) =>
    Math.abs(Number(v) - Number(m)) < Math.abs(Number(best) - Number(m)) ? v : best,
  );
  return { period: hour24 < 12 ? "오전" : "오후", hour: String(hour12), minute: nearest };
}

/** `{ 오후, "9", "30" }` → `"21:30"` */
export function fromWheelTime({ period, hour, minute }: WheelTime): string {
  const base = Number(hour) % 12;
  const hour24 = period === "오전" ? base : base + 12;
  // 날짜는 버린다 — `toHHMM` 이 시각만 읽는다
  return toHHMM(new Date(2026, 0, 1, hour24, Number(minute)));
}
