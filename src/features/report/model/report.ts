import type { EmotionId } from "@/design/theme";
import { countEmotions } from "@/features/archive/model/archive";
import type { Diary } from "@/features/diary/model/diary";

/**
 * 주간 리포트가 세는 것 — **관찰이지 평가가 아니다**(`W1.md`).
 *
 * 그래서 여기에 점수·등급·실행률·최고 기록·연속 일수를 만드는 함수가 없다.
 * 세는 것은 **회고 횟수 · 감정 기록 수 · 그 주 가장 많이 기록한 감정** 셋이다.
 */

/** 리포트가 열리는 최소 장수 — **일기 7편부터**(`RULES.md` 「리포트」) */
export const REPORT_UNLOCK_COUNT = 7;

/** `diaryCount >= 7` 이면 열린다. 그 전에는 **잠긴 화면 대신 홈의 한 줄**로 예고한다 */
export const isReportUnlocked = (diaries: readonly Diary[]) =>
  diaries.length >= REPORT_UNLOCK_COUNT;

/** 그 주(시작~끝, 양끝 포함)에 든 일기 */
export const diariesInWeek = (diaries: readonly Diary[], start: string, end: string) =>
  diaries.filter((d) => d.date >= start && d.date <= end);

export type WeekDay = {
  /** 「월」…「일」 */
  label: string;
  date: string;
  /** 하루 최대 3개. 비어 있으면 「기록 없음」 칸이다 */
  emotions: EmotionId[];
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 하루 최대 3개 — 넘으면 늘리지 않는다(`W1.md`) */
export const MAX_DAY_DOTS = 3;

/**
 * 요일별 칸 — **막대가 아니라 점**이다. 감정에 강도를 입력받지 않으므로
 * 높이로 말할 수 있는 것이 없다. 기록 없는 날은 흐린 칸으로 남긴다.
 */
export function weekDays(diaries: readonly Diary[], start: string, end: string): WeekDay[] {
  const byDate = new Map(diariesInWeek(diaries, start, end).map((d) => [d.date, d]));
  const [y = "2026", m = "1", d0 = "1"] = start.split("-");
  const from = new Date(Number(y), Number(m) - 1, Number(d0));

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return {
      label: WEEKDAYS[day.getDay()] ?? "",
      date: iso,
      emotions: byDate.get(iso)?.emotions.slice(0, MAX_DAY_DOTS) ?? [],
    };
  });
}

const toIso = (at: Date) =>
  `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;

/** `iso` 에서 `days` 일 뒤(음수면 앞). 달·해를 넘겨도 `Date` 가 맞춰준다 */
function addDays(iso: string, days: number) {
  const [y = "2026", m = "1", d = "1"] = iso.split("-");
  return toIso(new Date(Number(y), Number(m) - 1, Number(d) + days));
}

/** 주차 이동 — 음수면 이전 주 */
export const shiftWeek = (start: string, weeks: number) => addDays(start, weeks * 7);

/** 그 주의 끝(시작 + 6일) */
export const weekEnd = (start: string) => addDays(start, 6);

/**
 * 주차 이동 범위.
 *
 * - **이전**: 그 주 시작보다 앞선 일기가 하나라도 있으면 갈 수 있다
 * - **다음**: 최신 주가 마지막이다 — 그 뒤로는 볼 것이 없으므로 **비활성**이다
 *
 * 범위의 끝은 `report.pendingStates` 라 화면이 따로 없다 — 화살표를 흐리게 두고
 * 누르지 못하게 하는 것으로 끝을 말한다.
 */
export function weekRange(diaries: readonly Diary[], start: string, latestStart: string) {
  const earliest = diaries.reduce<string | null>(
    (min, d) => (min == null || d.date < min ? d.date : min),
    null,
  );
  return {
    hasPrev: earliest != null && earliest < start,
    hasNext: start < latestStart,
  };
}

/** 그 주 감정 기록 수 — 「회고 5회」와 **다른 값**이라 라벨이 구분해야 한다 */
export const weekEmotionCount = (days: readonly WeekDay[]) =>
  days.reduce((n, d) => n + d.emotions.length, 0);

/**
 * 그 주 가장 많이 기록한 감정.
 * **보관함(이번 달)·마이(전체)와 기간이 달라 값도 다르다** — 한 값을 세 곳에
 * 넣지 않는다(`RULES.md` 「샘플 데이터」).
 */
export function weekTopEmotion(
  diaries: readonly Diary[],
  start: string,
  end: string,
): { emotion: EmotionId; count: number } | null {
  let picked: { emotion: EmotionId; count: number } | null = null;
  for (const [emotion, count] of countEmotions(diariesInWeek(diaries, start, end))) {
    if (count > (picked?.count ?? 0)) picked = { emotion, count };
  }
  return picked;
}
