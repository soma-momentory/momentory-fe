import { authedRequest } from "@/lib/http";

import {
  fetchWeeklyHappiness,
  saveWeeklyHappiness,
  toEntriesBody,
  toWeeklyHappinessWeek,
} from "@/features/rest/data/weeklyHappinessApi";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

/** 서버 계약의 경계 — BE `WeeklyHappinessController`(2026-11-06) */
describe("주간 행복 — 서버 모양", () => {
  const raw = {
    weekStart: "2026-11-01",
    entries: [
      { category: "FOOD", content: "마라탕" },
      { category: "REST", content: "자기 전에 음악 듣기" },
    ],
    firstWeekStart: "2026-10-18",
  };

  it("칸 이름을 화면 키로 바꿔 한 주를 세운다", () => {
    expect(toWeeklyHappinessWeek(raw)).toEqual({
      weekStart: "2026-11-01",
      entries: { food: "마라탕", rest: "자기 전에 음악 듣기" },
      firstWeekStart: "2026-10-18",
    });
  });

  it("적은 주가 없으면 firstWeekStart 는 null 이다", () => {
    expect(toWeeklyHappinessWeek({ ...raw, entries: [], firstWeekStart: null })).toEqual({
      weekStart: "2026-11-01",
      entries: {},
      firstWeekStart: null,
    });
  });

  it("모르는 칸은 버리고, 모양이 어긋나면 null", () => {
    expect(
      toWeeklyHappinessWeek({ ...raw, entries: [{ category: "WEATHER", content: "맑음" }] })
        ?.entries,
    ).toEqual({});
    expect(toWeeklyHappinessWeek({ ...raw, weekStart: 3 })).toBeNull();
    expect(toWeeklyHappinessWeek({ ...raw, entries: [{ category: "FOOD" }] })).toBeNull();
  });

  it("보낼 때는 화면 순서대로 · 빈칸과 공백만은 빼고 · 끝 공백은 잘라 보낸다", () => {
    expect(toEntriesBody({ rest: "  음악 ", food: "마라탕", place: "   ", moment: "" })).toEqual({
      entries: [
        { category: "FOOD", content: "마라탕" },
        { category: "REST", content: "음악" },
      ],
    });
  });
});

describe("주간 행복 — 호출", () => {
  beforeEach(() => mockedRequest.mockReset());

  it("한 주를 그 일요일로 읽는다", async () => {
    mockedRequest.mockResolvedValue({
      ok: true,
      data: { weekStart: "2026-10-25", entries: [], firstWeekStart: null },
    });
    await expect(fetchWeeklyHappiness("2026-10-25")).resolves.toMatchObject({ ok: true });
    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/weekly-happiness?weekStart=2026-10-25",
      undefined,
      expect.objectContaining({ timeoutMs: expect.any(Number) }),
    );
  });

  it("이번 주를 통째로 남긴다", async () => {
    mockedRequest.mockResolvedValue({
      ok: true,
      data: {
        weekStart: "2026-11-01",
        entries: [{ category: "FOOD", content: "마라탕" }],
        firstWeekStart: "2026-11-01",
      },
    });
    await expect(saveWeeklyHappiness("2026-11-01", { food: "마라탕" })).resolves.toMatchObject({
      ok: true,
      week: { entries: { food: "마라탕" } },
    });
    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/weekly-happiness/2026-11-01",
      { entries: [{ category: "FOOD", content: "마라탕" }] },
      expect.objectContaining({ timeoutMs: expect.any(Number) }),
    );
  });

  it("지난 주라 거절되면 past_week · 그 밖의 실패는 failed — 던지지 않는다", async () => {
    mockedRequest.mockResolvedValueOnce({
      ok: false,
      error: { code: "http", status: 400, body: { code: "WEEKLY_HAPPINESS_PAST_WEEK" } },
    });
    await expect(saveWeeklyHappiness("2026-10-25", { food: "떡볶이" })).resolves.toEqual({
      ok: false,
      code: "past_week",
    });

    mockedRequest.mockResolvedValueOnce({ ok: false, error: { code: "network" } });
    await expect(saveWeeklyHappiness("2026-11-01", {})).resolves.toEqual({
      ok: false,
      code: "failed",
    });

    mockedRequest.mockResolvedValueOnce({ ok: true, data: { nope: true } });
    await expect(fetchWeeklyHappiness("2026-11-01")).resolves.toEqual({
      ok: false,
      code: "failed",
    });
  });
});
