import { create } from "zustand";

import type { Schedule } from "@/features/home/model/types";
import type { Letter, LetterSummary } from "@/features/letter/data/letterApi";
import { adoptLetterPreference } from "@/features/my/model/settings";
import { addDays, clock, momentOf } from "@/lib/clock";
import { formatKoreanDateShort } from "@/lib/day";
import { cancelOneOff } from "@/lib/notifications";
import { parseHHMM } from "@/lib/time";

/**
 * 편지 API 는 **요청하는 순간에** `require` 로 읽는다 — `auth.ts` 가 이 store 를 정리 자리에서
 * 부르므로, 정적으로 들면 `auth.ts → letter.ts → letterApi.ts → http.ts → auth.ts` 순환이 된다
 * (옛 알림함 `inbox.ts` 와 같은 자리 · 같은 까닭).
 */
type LetterApi = typeof import("@/features/letter/data/letterApi");
const letterApi = (): LetterApi =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/features/letter/data/letterApi");

/**
 * 바바의 편지 목록 — 홈 아이콘의 점 · 넘겨 보기 · 일기 상세의 「편지 보기」가 이걸 본다(PRD 4-1 · 4-2).
 *
 * 서버가 정본이다. `summaries` 가 `null` 이면 이번 로그인에서 아직 못 받았다 — 점을 달지 않는다.
 * 신원은 `auth` 가 밀어 넣는다(`bindUser` · `reset`). 늦게 온 응답은 출발할 때의 주인과 다르면 버린다.
 */
type LetterStore = {
  userId: number | null;
  /** 열 수 있는 편지, 최신순 */
  summaries: LetterSummary[] | null;
  /**
   * 한 번 불러온 편지(날짜별) — 편지 화면을 닫았다 열어도 다시 기다리지 않게 남긴다.
   * 화면은 이걸 먼저 그리고 뒤에서 한 번 더 불러 바꿔 끼운다.
   */
  letters: Record<string, Letter>;
  bindUser: (userId: number) => void;
  reset: () => void;
  refresh: () => Promise<void>;
  keep: (letter: Letter) => void;
  /** 열었다 — 목록의 점을 바로 끄고 서버에 처음 연 시각을 남긴다 */
  markOpened: (letter: Pick<Letter, "id" | "date" | "openedAt">) => void;
};

export const useLetters = create<LetterStore>((set, get) => ({
  userId: null,
  summaries: null,
  letters: {},

  bindUser: (userId) => {
    if (get().userId !== userId) set({ userId, summaries: null, letters: {} });
  },

  reset: () => set({ userId: null, summaries: null, letters: {} }),

  keep: (letter) => set((s) => ({ letters: { ...s.letters, [letter.date]: letter } })),

  refresh: async () => {
    const userId = get().userId;
    if (userId == null) return;
    const result = await letterApi().fetchLetters(userId);
    if (get().userId !== userId || !result.ok) return;
    // 열람 POST 보다 먼저 출발한 응답이 늦게 오면 방금 연 편지의 점이 되살아난다 — 기기가 아는 열람은 지킨다
    const opened = new Map((get().summaries ?? []).map((l) => [l.id, l.openedAt]));
    set({
      summaries: result.data.map((l) => ({
        ...l,
        openedAt: l.openedAt ?? opened.get(l.id) ?? null,
      })),
    });
  },

  markOpened: (letter) => {
    if (letter.openedAt != null) return;
    const now = clock.now().toISOString();
    set((s) => {
      const kept = s.letters[letter.date];
      return {
        summaries:
          s.summaries?.map((item) => (item.id === letter.id ? { ...item, openedAt: now } : item)) ??
          null,
        letters:
          kept != null ? { ...s.letters, [letter.date]: { ...kept, openedAt: now } } : s.letters,
      };
    });
    void letterApi().markLetterOpened(letter.id);
  },
}));

/** 고른 작은 일 알림의 이름 — 편지마다 하나다(`actionReminder.ts`) */
export const actionReminderKey = (letterId: string) => `letter-action.${letterId}`;

/**
 * 일기를 지웠다 — 서버는 그 일기의 편지 · 고른 작은 일을 함께 지운다(FK cascade). 기기에서는 목록에서
 * 빼고 예약된 작은 일 알림을 지운다.
 */
export function forgetLetterOf(date: string): void {
  const letter = useLetters.getState().summaries?.find((l) => l.date === date);
  if (letter == null) return;
  void cancelOneOff(actionReminderKey(letter.id));
  useLetters.setState((s) => {
    const letters = { ...s.letters };
    delete letters[date];
    return { summaries: s.summaries?.filter((l) => l.id !== letter.id) ?? null, letters };
  });
}

/** 홈 아이콘의 점 — 가장 최근 편지가 새것이고 아직 안 열었을 때만. 숫자는 세지 않는다 */
export const hasUnreadLetter = (summaries: readonly LetterSummary[] | null): boolean => {
  const latest = summaries?.[0];
  return latest != null && latest.isNew && latest.openedAt == null;
};

/** 어절 줄바꿈 — 정본은 `@/lib/keepWords`(공용 `Text` 가 모든 글자에 건다). 옛 import 자리를 위해 다시 내보낸다 */
export { keepWords } from "@/lib/keepWords";

/** 편지는 일기 다음 날 아침에 받는다 — 「10월 15일 아침」 */
export const receivedLabel = (date: string) => `${formatKoreanDateShort(addDays(date, 1))} 아침`;

/** 계측의 `days_after` — 받은 날 0, 그다음 날 1, 그 뒤는 2+ */
export const daysAfterBucket = (date: string, today: string): "0" | "1" | "2+" => {
  const received = addDays(date, 1);
  if (today <= received) return "0";
  return addDays(received, 1) === today ? "1" : "2+";
};

/**
 * 「언제 할 거예요?」 칩(PRD 4-3 · 문구는 2026-10-27 사용자 요청으로 바꿈). 일정 칩은 오늘 남은 일정 앞의 둘이다.
 *
 * ⚠ **일정 칩에는 알림 시각이 없다.** PRD 는 「그 일정의 끝 시각」이라 했지만 서버 일정에 시각이
 * 없다(`Schedule.time` 은 늘 `null`). 그래서 일정 칩은 「언제」만 남기고 알림 없이 고른다.
 */
export type WhenKind = "schedule" | "lunch" | "commute" | "bedtime" | "none";

export type WhenChoice = {
  kind: WhenKind;
  label: string;
  /** `"HH:mm"`. 없으면 알림 없이 */
  time: string | null;
  scheduleId: string | null;
};

const FIXED: readonly WhenChoice[] = [
  { kind: "lunch", label: "점심 뒤", time: "12:30", scheduleId: null },
  { kind: "commute", label: "퇴근길", time: "18:30", scheduleId: null },
  { kind: "bedtime", label: "자기 전", time: "22:00", scheduleId: null },
];

export const NO_REMINDER: WhenChoice = {
  kind: "none",
  label: "알림 없이",
  time: null,
  scheduleId: null,
};

/** 서버 `whenLabel` 상한(30자) 안에 「끝나고」까지 들어가게 일정 제목을 자른다 */
const SCHEDULE_TITLE_MAX = 24;

/** 그 칩이 울릴 시각 — 오늘(04:00 경계) 그 시각. 시각 없는 칩은 `null` */
export const remindAtOf = (choice: WhenChoice, today: string): Date | null => {
  if (choice.time == null) return null;
  const { hour, minute } = parseHHMM(choice.time);
  return momentOf(today, hour, minute);
};

export function whenChoices(
  now: Date,
  today: string,
  schedules: readonly Schedule[],
): WhenChoice[] {
  const upcoming = schedules
    .filter((s) => !s.hidden && !s.done)
    .slice(0, 2)
    .map<WhenChoice>((s) => ({
      kind: "schedule",
      label: `${s.title.trim().slice(0, SCHEDULE_TITLE_MAX)} 끝나고`,
      time: null,
      scheduleId: s.id,
    }));
  // 지난 시각은 뺀다
  const fixed = FIXED.filter((c) => (remindAtOf(c, today)?.getTime() ?? 0) > now.getTime());
  return [...upcoming, ...fixed, NO_REMINDER];
}

/**
 * 편지 시각을 서버에 남기고, 받은 뒤에 store 를 바꾼다 — 기기에만 두면 다음 `syncMe` 가 덮는다.
 * 아침 알림 예약은 store 를 따라간다(`reminders.ts`).
 */
export async function saveLetterPreference(time: string, enabled: boolean): Promise<boolean> {
  const ok = await letterApi().saveLetterTime(time, enabled);
  if (ok) adoptLetterPreference(time, enabled);
  return ok;
}
