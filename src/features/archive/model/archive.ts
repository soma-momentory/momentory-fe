import type { Diary } from "@/features/diary/model/diary";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";
import { SAMPLE_LAST_MONTH_EMOTIONS } from "@/mocks/sample";

/**
 * 보관함이 세는 것 — **기록 수치뿐이다.**
 *
 * `A1.md`: "요약 3칸은 **AI 의 판단이 아니라 기록 수치만** 쓴다." 그래서 여기
 * 있는 함수는 전부 세기·고르기이고 해석이 없다.
 *
 * **연속 일수를 세지 않는다** — 세는 것은 **장수**다(`RULES.md` 「보관함」).
 * 그래서 스트릭 계산 함수가 없다.
 */

/** `2026-07-22` → `22`. 그달 안에서만 쓰는 값이다 */
export const dayOf = (date: string) => Number(date.slice(8, 10));

/** `2026-07-22` → `2026-07`. 보관함이 여는 달은 오늘이 속한 달이다 */
export const monthOf = (date: string) => date.slice(0, 7);

/** `2026-07` 로 시작하는 일기만 */
export const diariesInMonth = (diaries: readonly Diary[], month: string) =>
  diaries.filter((d) => d.date.startsWith(month));

/** 최신순 — **정렬 옵션을 두지 않는다**(`A2.md`) */
export const byLatest = (diaries: readonly Diary[]) =>
  [...diaries].sort((a, b) => b.date.localeCompare(a.date));

/** 감정별 기록 수. 한 일기의 감정 태그를 모두 센다 */
export function countEmotions(diaries: readonly Diary[]) {
  const counts = new Map<EmotionId, number>();
  for (const d of diaries) {
    for (const e of d.emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  return counts;
}

/** 감정 기록 총 개수 — `A2` 필터의 「전체 24」가 이 값이다(**「12편」과 다른 값**) */
export const totalEmotionRecords = (diaries: readonly Diary[]) =>
  diaries.reduce((n, d) => n + d.emotions.length, 0);

/**
 * 이번 달 **가장 많이 기록한 감정**.
 *
 * ⚠ **기간마다 다른 값**이다 — 전체는 마이(`M1`), 이번 달은 여기, 그 주는
 * 리포트(`W1`). **한 값을 세 곳에 넣지 않는다**(`RULES.md` 「샘플 데이터」).
 */
export function topEmotion(diaries: readonly Diary[]): EmotionId | null {
  let top: EmotionId | null = null;
  let best = 0;
  for (const [id, n] of countEmotions(diaries)) {
    if (n > best) {
      best = n;
      top = id;
    }
  }
  return top;
}

/**
 * 「지난달과 비교」 — **얼마나 줄었는지를 말한다.**
 *
 * 화살표(↓)는 정도를 말하지 못해 상류가 "불안 **2회 감소**" 로 바꿨다(`A1.md`).
 * 가장 많이 줄어든 감정 하나만 고른다.
 *
 * **비교할 데이터가 부족하면 `null`** 을 준다 — 화면은 그때
 * "변화를 모으는 중 / 기록이 쌓이면 알려드릴게요"를 쓴다.
 */
export function monthChange(
  diaries: readonly Diary[],
  previous: Partial<Record<EmotionId, number>> = SAMPLE_LAST_MONTH_EMOTIONS,
): { emotion: EmotionId; decrease: number } | null {
  const prevTotal = Object.values(previous).reduce((n, v) => n + (v ?? 0), 0);
  if (prevTotal === 0) return null;

  const now = countEmotions(diaries);
  let picked: { emotion: EmotionId; decrease: number } | null = null;
  for (const [key, before] of Object.entries(previous)) {
    const id = Number(key) as EmotionId;
    const decrease = (before ?? 0) - (now.get(id) ?? 0);
    if (decrease > (picked?.decrease ?? 0)) picked = { emotion: id, decrease };
  }
  return picked;
}

/** 감정 이름에서 「/」 뒤를 떼어 짧게 — 「화남/답답」 → 「화남」 (좁은 칸용) */
export const shortEmotionName = (id: EmotionId) => emotionName(id).split("/")[0] ?? "";

/**
 * 문장에 넣는 어간 — 「불안함」 → **「불안」**.
 *
 * `A1` 의 「지난달과 비교」가 **"불안 2회 감소"** 라고 쓴다(`A1.md`) — 「불안함
 * 2회 감소」보다 문장으로 읽힌다. 「가장 많이 기록」은 이름 그대로(「행복함」)를
 * 쓰므로 둘을 같은 함수로 묶지 않는다.
 *
 * 「무기력」처럼 「함」으로 끝나지 않는 이름은 그대로 둔다.
 */
export const emotionStem = (id: EmotionId) => {
  const short = shortEmotionName(id);
  return short.endsWith("함") ? short.slice(0, -1) : short;
};

/**
 * 달력 한 칸씩 — 그달 1일의 요일만큼 앞을 비우고 채운다.
 *
 * **일기가 있는 날에만 점이 찍히고 하루 최대 3개**다. 넘으면 늘리지 않고
 * 대표 감정만 둔다(`A1.md`).
 */
export const MAX_DOTS = 3;

export type CalendarCell = {
  day: number | null;
  emotions: EmotionId[];
  hasDiary: boolean;
};

export function calendarCells(diaries: readonly Diary[], month: string): CalendarCell[] {
  const [y = "2026", m = "1"] = month.split("-");
  const first = new Date(Number(y), Number(m) - 1, 1);
  const daysInMonth = new Date(Number(y), Number(m), 0).getDate();

  const byDay = new Map<number, Diary>();
  for (const d of diariesInMonth(diaries, month)) byDay.set(dayOf(d.date), d);

  const cells: CalendarCell[] = [];
  // 1일의 요일만큼 앞을 비운다 — 요일 머리글과 줄이 맞아야 달력으로 읽힌다
  for (let i = 0; i < first.getDay(); i++) cells.push({ day: null, emotions: [], hasDiary: false });
  for (let day = 1; day <= daysInMonth; day++) {
    const diary = byDay.get(day);
    cells.push({
      day,
      emotions: diary?.emotions.slice(0, MAX_DOTS) ?? [],
      hasDiary: diary != null,
    });
  }
  return cells;
}
