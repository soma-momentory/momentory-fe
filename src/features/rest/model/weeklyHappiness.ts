import { addDays } from "@/lib/clock";

/**
 * 주간 행복 — 한 주에 있었던 좋은 일을 일곱 칸에 적어 두는 기록장 (2026-11-04 · 저장 2026-11-06).
 *
 * **쓰기는 이번 주만, 지난 주는 읽기만**이다(2026-11-06 결정). 주가 넘어가면(일요일 04:00) 새 빈 장이 열리고,
 * 지난 장은 넘겨 볼 수 있지만 고칠 수 없다. 넘겨 볼 수 있는 한계는 **적은 칸이 있는 첫 주**다(서버 `firstWeekStart`).
 * 적은 글은 서버에 남는다(`data/weeklyHappinessApi.ts` · `useWeeklyHappiness.ts`).
 *
 * 끝맺음 · 이용 기록은 다른 쉼터와 같다(2026-11-06) — 「다 적었어요」를 누르면 기분을 묻고, 「했다 + 기분」만
 * 남긴다(적은 글은 이용 기록에 보내지 않는다 · `useRestRecord`). 한 칸이라도 적은 뒤 그냥 나가면 「잠깐 들렀어요」다.
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

/** 지난 주를 펼쳤을 때 주 막대 아래 한 줄 */
export const WEEKLY_HAPPINESS_READ_ONLY = "지난 주는 읽기만 할 수 있어요";

/** 기록장을 받아 오지 못했다 — 적는 칸은 열지 않는다(받기 전에 적으면 서버의 글을 덮는다) */
export const WEEKLY_HAPPINESS_LOAD_FAILED = "지금은 기록장을 불러오지 못했어요";

/** 남기지 못했다 — 화면의 글은 그대로 두고, 다음에 고치거나 「다 적었어요」를 누를 때 다시 보낸다 */
export const WEEKLY_HAPPINESS_SAVE_FAILED = "지금은 저장하지 못했어요. 쓴 글은 그대로예요";

/** 적는 사이 주가 넘어갔다(일요일 04:00) — 그 장은 이제 읽기만 된다 */
export const WEEKLY_HAPPINESS_WEEK_CLOSED = "이번 주 기록장은 닫혔어요. 새 주에 이어서 적어 주세요";

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

/** 이 주에 적은 칸이 하나라도 있나 — 빈칸 · 공백만은 적은 것이 아니다 */
export const hasWritten = (week: WeeklyHappinessEntries) =>
  Object.values(week).some((t) => t != null && t.trim() !== "");

/** 두 장의 내용이 같은가 — 칸 끝의 공백은 서버가 지우므로 같은 것으로 본다 */
export const sameEntries = (a: WeeklyHappinessEntries, b: WeeklyHappinessEntries) =>
  WEEKLY_HAPPINESS_CATEGORIES.every((c) => (a[c.key]?.trim() ?? "") === (b[c.key]?.trim() ?? ""));
