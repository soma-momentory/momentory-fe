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
