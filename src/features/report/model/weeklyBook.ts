import { create } from "zustand";

import type { Diary } from "@/features/diary/model/types";
import { weekStartOf } from "@/features/home/model/day";
import {
  fetchWeeklyBook,
  type WeeklyBook,
  type WeeklyBookFailureCode,
} from "@/features/report/data/weeklyBookApi";
import { weekEnd } from "@/features/report/model/report";
import { clock } from "@/lib/clock";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * 주간 리포트 공책 한 권 — 끝난 주만 연다. 사실도 AI 글도 서버가 한 벌로 주고, 화면은 세지 않는다.
 * 재료가 없는 장은 건너뛴다. **던지지 않는다** — 실패는 `status: "failed"` 하나로 닫는다.
 */
export type { WeeklyBook } from "@/features/report/data/weeklyBookApi";

export type BookPage =
  "review" | "words" | "feelEvents" | "okMoments" | "restMoods" | "done" | "closing";

export const BOOK_PAGE_TITLES: Record<Exclude<BookPage, "closing">, string> = {
  review: "바바가 본 한 주",
  words: "내가 남겼던 말",
  feelEvents: "감정과 있었던 일",
  okMoments: "괜찮았던 순간",
  restMoods: "쉬어 간 곳",
  done: "해낸 일",
};

/** 공책의 장 순서. 일기가 3일 미만인 주는 표지 한 장이라 안쪽 장이 없다 */
export function bookPages(book: WeeklyBook): BookPage[] {
  if (!book.detailed) return [];
  // 위기 안내가 나온 주는 힘든 감정을 세어 보이지 않는다 — 바바의 말과 도움받을 곳, 인사만 둔다
  if (book.tone === "CRISIS") return ["review", "closing"];
  const pages: BookPage[] = [];
  if (book.review != null) pages.push("review");
  if (book.words.length > 0) pages.push("words");
  if (book.emotions.length > 0) pages.push("feelEvents");
  if (book.okMoments.length > 0) pages.push("okMoments");
  if (book.rest.total > 0) pages.push("restMoods");
  if (book.done.completedCount > 0) pages.push("done");
  pages.push("closing");
  return pages;
}

/**
 * 마지막 인사. 「지난 주」는 가장 최근 공책에만 맞는 말이라 예전 공책은 「이 주」로 쓴다. 힘든 주에 「활기차게」는
 * 재촉으로 들리므로 빼고, 위기 안내가 나온 주는 아무것도 권하지 않는다.
 */
export function closingLines(book: WeeklyBook): [string, string] {
  if (book.tone === "CRISIS")
    return ["이야기를 남겨 줘서 고마워요", "오늘은 아무것도 해내지 않아도 괜찮아요"];
  const first = book.newest ? "지난 주도 고생 많았어요" : "이 주도 고생 많았어요";
  if (book.tone === "HARD") {
    return [first, book.newest ? "이번 주는 더 편안하기를 바라요" : "오늘은 더 편안하기를 바라요"];
  }
  return [first, book.newest ? "이번 주도 활기차게 보내 봐요!" : "오늘도 활기차게 보내 봐요!"];
}

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;
/** `2026-10-28` → 「수」 — 서버 날짜를 그대로 읽어 기기 시간대에 흔들리지 않는다 */
export function weekdayOf(date: string): string {
  const [y = "2026", m = "1", d = "1"] = date.split("-");
  return WEEKDAY_NAMES[new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay()] ?? "";
}

/** 표지 아래 큰 버튼의 이름 — 일기가 적은 주는 일기로 바로 간다 */
export function diaryButtonLabel(book: WeeklyBook): string {
  if (book.diaryCount === 1) {
    const day = book.days.find((d) => d.written);
    return day == null ? "일기 보기" : `${weekdayOf(day.date)}요일 일기 보기`;
  }
  return "이틀치 일기 보기";
}

/** 예전 공책 목록 — 일기가 남은 **끝난 주**만, 최근 주가 위로 */
export type NotebookOption = { weekStart: string; name: string; range: string; diaryCount: number };

export function notebookOptions(diaries: readonly Diary[]): NotebookOption[] {
  const thisWeek = weekStartOf(clock.today());
  const counts = new Map<string, number>();
  for (const diary of diaries) {
    const week = weekStartOf(diary.date);
    if (week < thisWeek) counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  return [...counts.keys()]
    .sort()
    .reverse()
    .map((weekStart) => {
      const range = `${formatKoreanDateShort(weekStart)} ~ ${formatKoreanDateShort(weekEnd(weekStart))}`;
      return { weekStart, name: range, range, diaryCount: counts.get(weekStart) ?? 0 };
    });
}

export type WeeklyBookStatus = "idle" | "loading" | "ready" | "failed";

type WeeklyBookStore = {
  book: WeeklyBook | null;
  status: WeeklyBookStatus;
  failure: WeeklyBookFailureCode | null;
  /** 화면에 들어올 때 — 서버가 고른 가장 최근 공책을 연다 */
  open: () => Promise<void>;
  selectWeek: (weekStart: string) => Promise<void>;
  reset: () => void;
};

// 공책을 빠르게 바꾸면 응답 순서가 뒤바뀔 수 있다 — 마지막 요청만 반영한다
let latest = 0;

export const useWeeklyBook = create<WeeklyBookStore>((set) => {
  const load = async (date: string | null) => {
    const token = ++latest;
    set({ status: "loading" });
    const result = await fetchWeeklyBook(date);
    if (token !== latest) return;
    if (result.ok) set({ book: result.data, status: "ready", failure: null });
    else set({ status: "failed", failure: result.code });
  };
  return {
    book: null,
    status: "idle",
    failure: null,
    open: () => load(null),
    selectWeek: (weekStart) => {
      set({ book: null });
      return load(weekStart);
    },
    reset: () => {
      latest += 1;
      set({ book: null, status: "idle", failure: null });
    },
  };
});
