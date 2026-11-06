import { addDays } from "@/lib/clock";

/**
 * 주간 행복 — 한 주에 있었던 좋은 일을 일곱 칸에 적어 두는 기록장 (2026-11-04 · 디자인만).
 *
 * ⚠ **적은 글은 아직 저장하지 않는다.** 서버 계약이 없어 화면이 떠 있는 동안 메모리에만 있다.
 * 그래서 쉼터 칸도 개발 빌드(`__DEV__` · Lab 포함)에만 보인다(`contents.ts`). 서버가 붙으면 `data/` 어댑터를
 * 더하고, 계측을 `DESIGN.md` 「새 쉼터 체크리스트」대로 붙인다.
 *
 * 끝맺음 · 이용 기록은 다른 쉼터와 같다(2026-11-06) — 「다 적었어요」를 누르면 기분을 묻고, 「했다 + 기분」만
 * 남긴다(적은 글은 보내지 않는다 · `useRestRecord`). 한 칸이라도 적은 뒤 그냥 나가면 「잠깐 들렀어요」다.
 * 서버 `RestContent` 의 `WEEKLY_HAPPINESS`(BE #90)로 남는다.
 *
 * 주는 앱의 다른 주와 같은 **일~토**다(`features/home/model/day.ts` 의 `weekStartOf`).
 */
export const WEEKLY_HAPPINESS_TITLE = "주간 행복";

/** 기록장 맨 아래 — 누르면 기분 쪽지가 뜬다. 한 칸이라도 적어야 눌린다 */
export const WEEKLY_HAPPINESS_DONE_CTA = "다 적었어요";

/** 기분 쪽지의 나가는 버튼 — 다른 쉼터와 같은 말 */
export const WEEKLY_HAPPINESS_LEAVE = "쉼터로 돌아가기";

/** 한 칸에 적는 글 길이 */
export const WEEKLY_HAPPINESS_MAX_LENGTH = 100;

/** 앞으로 넘길 수 있는 주 — 서버가 붙으면 첫 기록이 있는 주까지로 바꾼다 */
export const WEEKLY_HAPPINESS_WEEKS_BACK = 4;

export const WEEKLY_HAPPINESS_CATEGORIES = [
  { key: "moment", label: "좋았던 순간", placeholder: "친구와 카페에서 수다 떨기" },
  { key: "food", label: "맛있었던 음식", placeholder: "오랜만에 먹은 마라탕" },
  { key: "content", label: "좋았던 콘텐츠", placeholder: "요즘 자주 듣는 노래" },
  { key: "place", label: "좋았던 장소", placeholder: "산책했던 공원" },
  { key: "person", label: "고마웠던 사람", placeholder: "힘들 때 이야기 들어준 친구" },
  { key: "proud", label: "뿌듯했던 일", placeholder: "미뤄둔 과제 마무리" },
  { key: "rest", label: "편안했던 시간", placeholder: "자기 전에 음악 듣기" },
] as const;

export type WeeklyHappinessKey = (typeof WEEKLY_HAPPINESS_CATEGORIES)[number]["key"];
export type WeeklyHappinessEntries = Partial<Record<WeeklyHappinessKey, string>>;

const dotted = (iso: string) => iso.slice(5).replace("-", ".");

/** 주의 첫날 → 머리에 적는 날짜 둘 — `{ from: "11.01", to: "11.07" }` */
export const weekRangeLabel = (weekStart: string) => ({
  from: dotted(weekStart),
  to: dotted(addDays(weekStart, 6)),
});

export const shiftWeek = (weekStart: string, weeks: number) => addDays(weekStart, weeks * 7);

/** 이 주들에 적은 칸이 하나라도 있나 — 빈칸 · 공백만은 적은 것이 아니다 */
export const hasWritten = (all: Record<string, WeeklyHappinessEntries>) =>
  Object.values(all).some((week) => Object.values(week).some((t) => t != null && t.trim() !== ""));
