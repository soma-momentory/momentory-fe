import type { Diary } from "@/features/diary/model/diary";
import type { EmotionId } from "@/features/emotion/model/emotion";

/**
 * 한 주를 **요일 일곱 칸으로 펼치는** 계산 — 그리고 리포트가 열리는 문턱.
 *
 * **관찰이지 평가가 아니다**(`W1.md`) — 그래서 여기에 점수·등급·실행률·최고 기록·
 * 연속 일수를 만드는 함수가 없다.
 *
 * ⚠ **리포트 화면은 더 이상 여기서 세지 않는다** (2026-08-24). 주간 리포트의 셈과
 * 문장은 서버가 한 벌로 준다(`model/weeklyReport.ts` · `GET /reports/weekly`) —
 * 그때 이 파일의 집계 함수들(회고 수 · 가장 많이 기록한 감정 · 행동 만든/해본 수 ·
 * 주차 이동 범위)은 부르는 곳이 없어져 지웠다.
 *
 * 남은 것을 쓰는 곳은 **홈의 이번 주 감정 줄**이다(`app/(tabs)/home.tsx` ·
 * `features/home/ui/WeekEmotionStrip.tsx`) — 그쪽은 로컬 일기에서 그대로 그린다.
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
