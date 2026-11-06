import { authedRequest } from "@/lib/http";

import { fetchAllDiaryDates } from "@/features/diary/data/diaryApi";
import { archiveWindowStart, countRecordedDays } from "@/features/my/model/recordedDays";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

/**
 * 마이 「일기 N일 기록」은 **전체 기간**이다(2026-11-06). 기기 store 는 최근 12개월뿐이라
 * 그보다 오래된 날짜를 서버 `GET /api/v1/diaries/all` 에서 더한다.
 */
describe("countRecordedDays — 기기 창 + 서버의 창 밖 날짜", () => {
  const windowStart = "2025-12-01";

  it("서버를 못 받았으면 기기 store 만 센다 — 지금까지와 같은 값", () => {
    expect(
      countRecordedDays({
        localDates: ["2026-11-01", "2026-11-02"],
        localLoaded: true,
        serverDates: null,
        windowStart,
      }),
    ).toBe(2);
  });

  it("창보다 오래된 서버 날짜를 더한다 — 오래 쓴 사용자가 덜 세지 않는다", () => {
    expect(
      countRecordedDays({
        localDates: ["2026-11-01"],
        localLoaded: true,
        serverDates: ["2024-03-02", "2025-11-30", "2026-11-01"],
        windowStart,
      }),
    ).toBe(3);
  });

  it("창 안의 서버 날짜는 쓰지 않는다 — 방금 지운 일기는 서버에 아직 남아 있을 수 있다", () => {
    // 2026-10-05 는 기기에서 지웠지만 되돌리기 창이 닫히기 전이라 서버에는 아직 있다
    expect(
      countRecordedDays({
        localDates: ["2026-11-01"],
        localLoaded: true,
        serverDates: ["2026-10-05", "2026-11-01"],
        windowStart,
      }),
    ).toBe(1);
  });

  it("같은 날 두 편은 하루다", () => {
    expect(
      countRecordedDays({
        localDates: ["2026-11-01", "2026-11-01"],
        localLoaded: true,
        serverDates: ["2024-01-01", "2024-01-01"],
        windowStart,
      }),
    ).toBe(2);
  });

  it("store 가 아직 서버에서 채워지지 않았으면 서버 날짜를 창과 상관없이 쓴다", () => {
    expect(
      countRecordedDays({
        localDates: ["2026-11-06"],
        localLoaded: false,
        serverDates: ["2026-10-05", "2024-01-01"],
        windowStart,
      }),
    ).toBe(3);
  });
});

describe("archiveWindowStart — useDiary.load() 와 같은 12개월 창의 첫날", () => {
  it("이번 달을 포함해 12개월 전의 1일", () => {
    expect(archiveWindowStart("2026-11-06")).toBe("2025-12-01");
  });

  it("연초에도 해를 넘겨 거슬러 간다", () => {
    expect(archiveWindowStart("2026-01-31")).toBe("2025-02-01");
  });
});

describe("fetchAllDiaryDates — GET /api/v1/diaries/all", () => {
  beforeEach(() => mockedRequest.mockReset());

  const diary = (id: number, createdAt: string) => ({
    id,
    retrospectId: null,
    original: "본문",
    createdAt,
  });

  it("전체 목록을 부르고 날짜만 중복 없이 오름차순으로 돌려준다", async () => {
    mockedRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        diaries: [
          diary(3, "2026-11-01T12:00:00Z"),
          diary(2, "2026-11-01T13:00:00Z"),
          diary(1, "2024-03-02T12:00:00Z"),
        ],
      },
    } as never);

    await expect(fetchAllDiaryDates()).resolves.toEqual(["2024-03-02", "2026-11-01"]);
    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/diaries/all",
      undefined,
      expect.objectContaining({ timeoutMs: expect.any(Number) }),
    );
  });

  it("어긋난 항목 하나는 버리고 나머지를 센다", async () => {
    mockedRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { diaries: [{ id: 9 }, diary(1, "2025-05-05T12:00:00Z")] },
    } as never);

    await expect(fetchAllDiaryDates()).resolves.toEqual(["2025-05-05"]);
  });

  it("실패하거나 모양이 어긋나면 null — 던지지 않는다", async () => {
    mockedRequest.mockResolvedValueOnce({ ok: false, error: { kind: "network" } } as never);
    await expect(fetchAllDiaryDates()).resolves.toBeNull();

    mockedRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { items: [] } } as never);
    await expect(fetchAllDiaryDates()).resolves.toBeNull();
  });
});
