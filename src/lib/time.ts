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

/** `"21:30"` → 오늘 그 시각의 `Date`. OS 시간 피커의 초기값으로 쓴다 */
export function dateAtTime(hhmm: string) {
  const [h = "0", m = "0"] = hhmm.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d;
}

/** `Date` → `"HH:mm"`. 초안·스키마가 쓰는 형태다 */
export function toHHMM(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
