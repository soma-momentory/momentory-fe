import {
  fetchWeeklyReport,
  toWeeklyReport,
  WEEKLY_REPORT_PATH,
} from "@/features/report/data/weeklyReportApi";
import { authedRequest } from "@/lib/http";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

/**
 * 주간 리포트 계약의 **경계**를 고정한다(`docs/api/openapi.json` ·
 * `/api/v1/reports/weekly`). 리포트는 셈이 전부인 화면이라 「일부만 맞는 리포트」가
 * 성립하지 않는다 — 어긋난 응답은 **부분 복구하지 않고 통째로 버린다.**
 */
const raw = {
  startDate: "2026-08-17",
  endDate: "2026-08-23",
  dailyMoods: [
    { date: "2026-08-17", emotion: "tired" }, // 4
    { date: "2026-08-18", emotion: "calm" }, // 3
    { date: "2026-08-19", emotion: null },
    { date: "2026-08-20", emotion: "calm" },
    { date: "2026-08-21", emotion: "angry" }, // 9
    { date: "2026-08-22", emotion: null },
    { date: "2026-08-23", emotion: "calm" },
  ],
  dominantEmotion: "calm",
  moodMessage: "이번 주에는 평온한 마음을 가장 많이 느꼈어요. 그 환경을 이어가 보세요.",
  scheduleTotalCount: 12,
  scheduleCompletedCount: 9,
  actionCardCreatedCount: 5,
  actionCardCompletedCount: 3,
  needs: [
    { word: "휴식", count: 2 },
    { word: "연결", count: 1 },
  ],
  practicedWishes: [
    { action: "30분 산책하기", needs: ["휴식"] },
    { action: null, needs: ["연결"] },
  ],
  diaryCount: 5,
};

describe("WeeklyReportResponse → WeeklyReport", () => {
  it("감정 키를 id 로 옮기고 기록 없는 날은 null 로 남긴다", () => {
    const report = toWeeklyReport(raw);

    expect(report?.days.map((d) => d.emotion)).toEqual([4, 3, null, 3, 9, null, 3]);
    expect(report?.dominantEmotion).toBe(3);
  });

  it("셈과 날짜를 그대로 옮긴다", () => {
    const report = toWeeklyReport(raw);

    expect(report?.startDate).toBe("2026-08-17");
    expect(report?.endDate).toBe("2026-08-23");
    expect(report?.scheduleTotal).toBe(12);
    expect(report?.scheduleCompleted).toBe(9);
    expect(report?.actionCardCreated).toBe(5);
    expect(report?.actionCardCompleted).toBe(3);
    expect(report?.diaryCount).toBe(5);
  });

  it("찾은 바람과 실천한 것을 그대로 옮긴다", () => {
    const report = toWeeklyReport(raw);

    expect(report?.needs).toEqual([
      { word: "휴식", count: 2 },
      { word: "연결", count: 1 },
    ]);
    expect(report?.practicedWishes).toEqual([
      { action: "30분 산책하기", needs: ["휴식"] },
      { action: null, needs: ["연결"] },
    ]);
  });

  it("바람 자리가 없는 옛 응답도 리포트로 선다 — 그 카드만 빈다", () => {
    // 서버에 필드가 없던 시절의 응답이다. 셈은 그대로 맞으므로 한 주를 통째로 버릴 이유가 없다
    const { needs, practicedWishes, ...legacy } = raw;
    const report = toWeeklyReport(legacy);

    expect(report).not.toBeNull();
    expect(report?.needs).toEqual([]);
    expect(report?.practicedWishes).toEqual([]);
    expect(report?.diaryCount).toBe(5);
  });

  it("모양이 어긋난 바람 한 알약만 버린다 — 나머지는 그대로 선다", () => {
    const report = toWeeklyReport({
      ...raw,
      needs: [{ word: "휴식", count: 2 }, { word: "", count: 1 }, { word: "연결", count: -1 }, 7],
    });

    expect(report?.needs).toEqual([{ word: "휴식", count: 2 }]);
  });

  it("빈 바람 단어는 실천 줄에서도 버린다 — 빈 이름을 적지 않는다", () => {
    const report = toWeeklyReport({
      ...raw,
      practicedWishes: [{ action: "  ", needs: ["휴식", " ", 3] }],
    });

    expect(report?.practicedWishes).toEqual([{ action: null, needs: ["휴식"] }]);
  });

  it("모르는 감정 키는 버린다 — 이름을 지어내지 않는다", () => {
    const report = toWeeklyReport({
      ...raw,
      dailyMoods: [{ ...raw.dailyMoods[0], emotion: "nostalgic" }, ...raw.dailyMoods.slice(1)],
      dominantEmotion: "nostalgic",
    });

    expect(report?.days[0]?.emotion).toBeNull();
    expect(report?.dominantEmotion).toBeNull();
  });

  it("일곱 칸이 아니면 통째로 어긋남이다 — 몇 칸만 버리면 요일이 밀린다", () => {
    expect(toWeeklyReport({ ...raw, dailyMoods: raw.dailyMoods.slice(0, 6) })).toBeNull();
    expect(
      toWeeklyReport({ ...raw, dailyMoods: [...raw.dailyMoods, { date: "2026-08-24" }] }),
    ).toBeNull();
    // 한 칸의 날짜가 없으면 그 칸이 어느 요일인지 알 수 없다
    expect(toWeeklyReport({ ...raw, dailyMoods: [{}, ...raw.dailyMoods.slice(1)] })).toBeNull();
  });

  it("셈이 하나라도 어긋나면 0 으로 메우지 않고 버린다", () => {
    expect(toWeeklyReport({ ...raw, scheduleCompletedCount: null })).toBeNull();
    expect(toWeeklyReport({ ...raw, diaryCount: -1 })).toBeNull();
    expect(toWeeklyReport({ ...raw, actionCardCreatedCount: "5" })).toBeNull();
  });

  it("멘트가 없으면 비운다 — 대신 쓸 문장을 지어내지 않는다", () => {
    expect(toWeeklyReport({ ...raw, moodMessage: undefined })?.moodMessage).toBe("");
  });
});

describe("fetchWeeklyReport", () => {
  beforeEach(() => jest.clearAllMocks());

  it("보고 있는 주의 날짜를 query 로 보낸다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: raw });

    await fetchWeeklyReport("2026-08-17");

    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      `${WEEKLY_REPORT_PATH}?date=2026-08-17`,
      undefined,
      expect.anything(),
    );
  });

  it("보낼 세션이 없으면 401 과 구분해 닫는다", async () => {
    mockedRequest.mockResolvedValue({ ok: false, error: { code: "unauthenticated" } });
    await expect(fetchWeeklyReport("2026-08-17")).resolves.toEqual({
      ok: false,
      code: "no_session",
    });

    mockedRequest.mockResolvedValue({
      ok: false,
      error: { code: "http", status: 401, body: null },
    });
    await expect(fetchWeeklyReport("2026-08-17")).resolves.toEqual({
      ok: false,
      code: "unauthorized",
    });
  });

  it("2xx 인데 모양이 어긋나면 성공으로 치지 않는다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: { ...raw, dailyMoods: [] } });

    await expect(fetchWeeklyReport("2026-08-17")).resolves.toEqual({
      ok: false,
      code: "malformed",
    });
  });
});
