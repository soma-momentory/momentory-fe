import type { Schedule } from "@/features/home/model/types";
import { fetchLetters, toLetter, toSummary } from "@/features/letter/data/letterApi";
import {
  daysAfterBucket,
  hasUnreadLetter,
  keepWords,
  receivedLabel,
  remindAtOf,
  useLetters,
  whenChoices,
} from "@/features/letter/model/letter";

jest.mock("@/features/letter/data/letterApi", () => ({
  ...jest.requireActual("@/features/letter/data/letterApi"),
  fetchLetters: jest.fn(),
  markLetterOpened: jest.fn(async () => true),
}));

/** BE `LetterResponse` 그대로의 모양 */
const SERVER_LETTER = {
  id: 12,
  date: "2026-10-26",
  status: "READY",
  quote: "발표 전에 손이 계속 떨렸어요",
  insight: "떨렸던 건 그만큼 잘하고 싶었기 때문이었을지도 몰라요.",
  tonightQuestion: "오늘 밤엔 발표 뒤 마음부터 물어볼게요.",
  actions: [
    { position: 0, title: "5분 동안 숨 고르기", source: "CATALOG", chosen: false },
    {
      position: 1,
      title: "점심 뒤 한 바퀴 걷기",
      source: "FALLBACK",
      chosen: true,
      whenLabel: "점심 뒤",
      scheduleId: null,
      remindAt: "2026-10-27T03:30:00Z",
    },
    { position: 2, title: "모르는 출처", source: "MYSTERY", chosen: false },
  ],
  helplines: [],
  isNew: true,
  openedAt: null,
};

const schedule = (id: string, over: Partial<Schedule> = {}): Schedule => ({
  id,
  date: "2026-10-27",
  title: `일정 ${id}`,
  time: null,
  source: "manual",
  externalId: null,
  done: false,
  doneAt: null,
  emotions: [],
  hidden: false,
  ...over,
});

describe("응답 검증 — 서버를 믿지 않는다", () => {
  it("편지 한 통을 화면 모양으로 옮기고, 모르는 출처의 작은 일은 버린다", () => {
    const letter = toLetter(SERVER_LETTER);

    expect(letter).toMatchObject({ id: "12", date: "2026-10-26", status: "READY" });
    expect(letter?.actions.map((a) => a.position)).toEqual([0, 1]);
    expect(letter?.actions[1]).toMatchObject({ chosen: true, whenLabel: "점심 뒤" });
  });

  it("모르는 상태 · 빈 본문이면 통째로 버린다 — 빈 종이를 그리지 않는다", () => {
    expect(toLetter({ ...SERVER_LETTER, status: "GENERATING" })).toBeNull();
    expect(toLetter({ ...SERVER_LETTER, insight: " " })).toBeNull();
    expect(toSummary({ id: 1, date: "어제", isNew: true })).toBeNull();
  });
});

describe("홈 아이콘의 점", () => {
  it("가장 최근 편지가 새것이고 안 열었을 때만", () => {
    const fresh = { id: "2", date: "2026-10-26", isNew: true, openedAt: null };

    expect(hasUnreadLetter([fresh])).toBe(true);
    expect(hasUnreadLetter([{ ...fresh, openedAt: "2026-10-27T00:00:00Z" }])).toBe(false);
    expect(hasUnreadLetter([{ ...fresh, isNew: false }])).toBe(false);
    expect(hasUnreadLetter(null)).toBe(false);
  });
});

describe("날짜", () => {
  it("편지는 일기 다음 날 아침에 받는다", () => {
    expect(receivedLabel("2026-10-31")).toBe("11월 1일 아침");
  });

  it("days_after 는 받은 날 0 · 그다음 날 1 · 그 뒤 2+", () => {
    expect(daysAfterBucket("2026-10-26", "2026-10-27")).toBe("0");
    expect(daysAfterBucket("2026-10-26", "2026-10-28")).toBe("1");
    expect(daysAfterBucket("2026-10-26", "2026-11-02")).toBe("2+");
  });
});

describe("「언제」 칩", () => {
  const today = "2026-10-27";

  it("남은 일정 둘 → 점심 뒤 · 퇴근길 · 자기 전 → 알림 없이", () => {
    const choices = whenChoices(new Date(2026, 9, 27, 9, 0), today, [
      schedule("1", { title: "팀 회의" }),
      schedule("2", { done: true }),
      schedule("3", { hidden: true }),
      schedule("4"),
      schedule("5"),
    ]);

    expect(choices.map((c) => c.label)).toEqual([
      "팀 회의 끝나고",
      "일정 4 끝나고",
      "점심 뒤",
      "퇴근길",
      "자기 전",
      "알림 없이",
    ]);
    // 일정에는 시각이 없다 — 알림 없이 「언제」만 남긴다
    expect(choices[0]).toMatchObject({ kind: "schedule", time: null, scheduleId: "1" });
  });

  it("지난 시각은 뺀다", () => {
    const choices = whenChoices(new Date(2026, 9, 27, 19, 0), today, []);

    expect(choices.map((c) => c.label)).toEqual(["자기 전", "알림 없이"]);
  });

  it("긴 일정 제목은 서버 상한(30자) 안으로 자른다", () => {
    const [chip] = whenChoices(new Date(2026, 9, 27, 9, 0), today, [
      schedule("1", { title: "가".repeat(40) }),
    ]);

    expect(chip!.label.length).toBeLessThanOrEqual(30);
  });

  it("칩의 알림 시각은 오늘 그 시각이다", () => {
    const lunch = whenChoices(new Date(2026, 9, 27, 9, 0), today, [])[0]!;

    expect(remindAtOf(lunch, today)).toEqual(new Date(2026, 9, 27, 12, 30));
  });
});

describe("어절 단위 줄바꿈", () => {
  it("어절 안 글자 사이에만 단어 결합 문자를 넣고 띄어쓰기는 그대로 둔다", () => {
    const kept = keepWords("새 아침을 맞이했군요.");

    expect(kept.split(" ")).toHaveLength(3);
    expect(kept.split(" ")[2]).toBe("맞\u2060이\u2060했\u2060군\u2060요\u2060.");
    expect(kept.replace(/\u2060/g, "")).toBe("새 아침을 맞이했군요.");
  });

  it("줄바꿈 · 연속 공백도 그대로 둔다", () => {
    expect(keepWords("가나\n다  라").replace(/\u2060/g, "")).toBe("가나\n다  라");
  });
});

describe("편지 목록 store", () => {
  it("열람보다 먼저 출발한 목록 응답이 늦게 와도 방금 연 편지의 점을 되살리지 않는다", async () => {
    const stale = { id: "2", date: "2026-10-26", isNew: true, openedAt: null };
    useLetters.setState({ userId: 7, summaries: [stale], letters: {} });
    useLetters.getState().markOpened(stale);
    jest.mocked(fetchLetters).mockResolvedValue({ ok: true, data: [stale] });

    await useLetters.getState().refresh();

    expect(hasUnreadLetter(useLetters.getState().summaries)).toBe(false);
  });
});
