import type { Diary } from "@/features/diary/model/types";
import { parseWeeklyBook, type WeeklyBook } from "@/features/report/data/weeklyBookApi";
import {
  bookPages,
  closingLines,
  diaryButtonLabel,
  notebookOptions,
  weekdayOf,
} from "@/features/report/model/weeklyBook";
import { clock } from "@/lib/clock";

const book = (over: Partial<WeeklyBook> = {}): WeeklyBook => ({
  startDate: "2026-10-25",
  endDate: "2026-10-31",
  newest: true,
  diaryCount: 4,
  detailed: true,
  tone: "NORMAL",
  helpResources: [],
  days: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-10-${25 + i}`,
    written: i === 3,
    emotion: i === 3 ? 6 : null,
  })),
  restCount: 0,
  coverLine: "표지",
  review: "글",
  goodWords: "좋은 말",
  okLine: null,
  words: [{ date: "2026-10-26", label: null, fromLetter: false, text: "내가 쓴 말" }],
  emotions: [{ emotion: 6, count: 3, events: ["면접"] }],
  okMoments: [{ date: "2026-10-25", emotion: 2, event: null, tasks: [], betterRest: null }],
  rest: { total: 1, better: 1, same: 0, unsure: 0, places: [], soFar: null },
  done: { completedCount: 2, perDay: [1, 1, 0, 0, 0, 0, 0], linked: [] },
  ...over,
});

describe("공책의 장", () => {
  it("재료가 있으면 시안 순서대로 모두 열리고 마지막은 인사다", () => {
    expect(bookPages(book())).toEqual([
      "review",
      "words",
      "feelEvents",
      "okMoments",
      "restMoods",
      "done",
      "closing",
    ]);
  });

  it("재료가 없는 장은 건너뛴다", () => {
    const pages = bookPages(
      book({
        review: null,
        words: [],
        okMoments: [],
        rest: { total: 0, better: 0, same: 0, unsure: 0, places: [], soFar: null },
        done: { completedCount: 0, perDay: [0, 0, 0, 0, 0, 0, 0], linked: [] },
      }),
    );
    expect(pages).toEqual(["feelEvents", "closing"]);
  });

  it("위기 주는 바바의 말과 인사만 둔다 — 힘든 감정을 세어 보이지 않는다", () => {
    expect(bookPages(book({ tone: "CRISIS" }))).toEqual(["review", "closing"]);
  });

  it("일기 3일 미만인 주는 안쪽 장이 없다", () => {
    expect(bookPages(book({ detailed: false }))).toEqual([]);
  });
});

describe("마지막 인사", () => {
  it("가장 최근 공책은 지난 주 · 활기차게", () => {
    expect(closingLines(book())).toEqual([
      "지난 주도 고생 많았어요",
      "이번 주도 활기차게 보내 봐요!",
    ]);
  });
  it("예전 공책에는 지난 주라고 쓰지 않는다", () => {
    expect(closingLines(book({ newest: false })).join()).not.toContain("지난 주");
  });
  it("쉼터를 다섯 번 넘게 찾은 주에는 활기차게를 쓰지 않는다", () => {
    expect(closingLines(book({ restCount: 4 })).join()).toContain("활기차게");
    expect(closingLines(book({ restCount: 5 })).join()).toContain("편안하기를");
    expect(closingLines(book({ restCount: 5, newest: false })).join()).toContain("오늘은");
  });
  it("힘든 주에는 활기차게를 쓰지 않는다", () => {
    expect(closingLines(book({ tone: "HARD" })).join()).not.toContain("활기차게");
  });
  it("위기 주에는 아무것도 권하지 않는다", () => {
    const lines = closingLines(book({ tone: "CRISIS" })).join();
    expect(lines).not.toContain("활기차게");
    expect(lines).not.toContain("고생");
  });
});

describe("요일과 버튼", () => {
  it("서버 날짜의 요일을 읽는다", () => {
    expect(weekdayOf("2026-10-25")).toBe("일");
    expect(weekdayOf("2026-10-28")).toBe("수");
  });
  it("일기 1편은 그 요일, 2편은 이틀치", () => {
    expect(diaryButtonLabel(book({ diaryCount: 1 }))).toBe("수요일 일기 보기");
    expect(diaryButtonLabel(book({ diaryCount: 2 }))).toBe("이틀치 일기 보기");
  });
});

describe("예전 공책 목록", () => {
  it("끝난 주만 최근 순으로, 일기 수와 함께 둔다", () => {
    jest.spyOn(clock, "today").mockReturnValue("2026-11-04");
    const diary = (date: string) => ({ id: date, date }) as unknown as Diary;
    const options = notebookOptions([
      diary("2026-11-02"),
      diary("2026-10-26"),
      diary("2026-10-28"),
      diary("2026-10-14"),
    ]);
    expect(options.map((o) => [o.weekStart, o.diaryCount])).toEqual([
      ["2026-10-25", 2],
      ["2026-10-11", 1],
    ]);
    jest.restoreAllMocks();
  });
});

describe("응답 읽기", () => {
  const raw = {
    startDate: "2026-10-25",
    endDate: "2026-10-31",
    newest: true,
    diaryCount: 1,
    detailed: false,
    tone: "HARD",
    helpResources: [],
    days: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-10-${25 + i}`,
      written: i === 0,
      emotion: i === 0 ? "calm" : null,
    })),
    restCount: 2,
    coverLine: "표지",
    words: [{ date: "2026-10-25", label: null, fromLetter: false, text: "말" }, { date: "x" }],
    emotions: [
      { emotion: "calm", count: 1, events: ["저녁"] },
      { emotion: "없는감정", count: 1, events: [] },
    ],
    okMoments: [
      {
        date: "2026-10-25",
        emotion: "calm",
        event: null,
        tasks: ["장보기"],
        betterRest: "BODY_RELEASE",
      },
    ],
    rest: {
      total: 1,
      better: 1,
      same: 0,
      unsure: 0,
      places: [
        { content: "새쉼터", total: 1 },
        { content: "WISH", total: 1, better: 1 },
      ],
      soFar: null,
    },
    done: { completedCount: 1, perDay: [1, 0, 0, 0, 0, 0, 0], linked: [] },
  };

  it("모르는 감정 · 쉼터 · 빈 말은 그 줄만 버린다", () => {
    const parsed = parseWeeklyBook(raw);
    expect(parsed?.tone).toBe("HARD");
    expect(parsed?.days[0]?.emotion).toBe(2);
    expect(parsed?.words).toHaveLength(1);
    expect(parsed?.emotions).toHaveLength(1);
    expect(parsed?.okMoments[0]?.betterRest).toBe("body_release");
    expect(parsed?.rest.places.map((p) => p.content)).toEqual(["wish"]);
  });

  it("12종 키를 번호로 옮기고, 옛 10종 키도 12종으로 받아낸다", () => {
    const parsed = parseWeeklyBook({
      ...raw,
      emotions: [
        { emotion: "sorry", count: 2, events: [] },
        { emotion: "affection", count: 1, events: [] },
        // 서버가 넘어가기 전의 응답 — 답답함 → 분노(7) · 무기력 → 지침(12)
        { emotion: "frustrated", count: 1, events: [] },
        { emotion: "lethargic", count: 1, events: [] },
      ],
    });
    expect(parsed?.emotions.map((e) => e.emotion)).toEqual([11, 4, 7, 12]);
  });

  it("일곱 칸이 아니거나 표지 문장이 없으면 어긋남이다", () => {
    expect(parseWeeklyBook({ ...raw, days: [] })).toBeNull();
    expect(parseWeeklyBook({ ...raw, coverLine: undefined })).toBeNull();
    expect(parseWeeklyBook(null)).toBeNull();
  });
});
