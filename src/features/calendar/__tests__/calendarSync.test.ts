import { syncCalendarSnapshot } from "@/features/calendar/data/calendarSyncApi";
import { readSyncState, writeSyncState } from "@/features/calendar/data/syncStateStore";
import { useCalendarSync } from "@/features/calendar/model/calendarSync";
import type { CalendarSyncState } from "@/features/calendar/model/types";
import { readCalendarEvents, type CalendarEvent } from "@/lib/calendar";
import { fixedClock, setClock, SampleClock } from "@/lib/clock";

jest.mock("@/lib/calendar", () => ({ readCalendarEvents: jest.fn() }));
jest.mock("@/features/calendar/data/calendarSyncApi", () => ({ syncCalendarSnapshot: jest.fn() }));
jest.mock("@/features/calendar/data/syncStateStore", () => ({
  readSyncState: jest.fn(),
  writeSyncState: jest.fn(),
  clearSyncState: jest.fn(),
}));

const read = jest.mocked(readCalendarEvents);
const send = jest.mocked(syncCalendarSnapshot);
const loadState = jest.mocked(readSyncState);
const saveState = jest.mocked(writeSyncState);

const USER = 7;

const event = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  eventId: "e1",
  calendarId: "c1",
  title: "캡스톤 팀미팅",
  start: new Date("2026-08-05T10:00:00"),
  end: null,
  allDay: false,
  ...over,
});

/** 그 실행이 실제로 보낸 스냅샷 */
const sentSnapshot = (call = 0) => send.mock.calls[call] ?? [];

beforeEach(() => {
  jest.clearAllMocks();
  // 2026-08-14 → 창은 7/1 ~ 9/30
  setClock(fixedClock("2026-08-14T10:00:00"));
  useCalendarSync.getState().reset();

  read.mockResolvedValue({ ok: true, events: [event()] });
  loadState.mockResolvedValue(null);
  saveState.mockResolvedValue();
  send.mockResolvedValue({ ok: true, data: { created: 1, updated: 0, deleted: 0 } });
});

afterAll(() => setClock(SampleClock));

describe("cold start — 처음엔 무조건 올린다", () => {
  it("저장된 상태가 없으면 화해한다", async () => {
    const outcome = await useCalendarSync.getState().sync(USER);

    expect(outcome).toEqual({ kind: "synced", created: 1, updated: 0, deleted: 0 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("**`dirty` 를 보지 않는다** — 앱이 꺼져 있는 동안의 변경은 읽어야만 안다", async () => {
    // 옵저버가 없으니 dirty 는 false 인데, 그래도 읽고 올린다
    expect(useCalendarSync.getState().dirty).toBe(false);

    await useCalendarSync.getState().sync(USER);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("정해진 창으로 읽는다 — 이전 달 1일 ~ 다음 달 말일", async () => {
    await useCalendarSync.getState().sync(USER);

    expect(read).toHaveBeenCalledWith("2026-07-01", "2026-09-30");
    expect(sentSnapshot()[0]).toEqual({ from: "2026-07-01", to: "2026-09-30" });
  });

  it("성공한 뒤에 해시를 저장한다", async () => {
    await useCalendarSync.getState().sync(USER);

    const [userId, state] = saveState.mock.calls[0] ?? [];
    expect(userId).toBe(USER);
    expect((state as CalendarSyncState).range).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect((state as CalendarSyncState).hash).toHaveLength(32);
  });
});

describe("해시가 같으면 서버를 부르지 않는다", () => {
  it("두 번째 실행은 조회만 하고 끝난다", async () => {
    await useCalendarSync.getState().sync(USER);
    const saved = saveState.mock.calls[0]?.[1] as CalendarSyncState;

    loadState.mockResolvedValue(saved);
    send.mockClear();

    expect(await useCalendarSync.getState().sync(USER)).toEqual({ kind: "unchanged" });
    expect(send).not.toHaveBeenCalled();
  });

  it("기기 조회 자체는 건너뛰지 않는다 — 그래야 변경을 알 수 있다", async () => {
    await useCalendarSync.getState().sync(USER);
    loadState.mockResolvedValue(saveState.mock.calls[0]?.[1] as CalendarSyncState);
    read.mockClear();

    await useCalendarSync.getState().sync(USER);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("일정이 바뀌면 다시 올린다", async () => {
    await useCalendarSync.getState().sync(USER);
    loadState.mockResolvedValue(saveState.mock.calls[0]?.[1] as CalendarSyncState);

    read.mockResolvedValue({ ok: true, events: [event({ title: "캡스톤 팀미팅(변경)" })] });
    send.mockClear();

    expect((await useCalendarSync.getState().sync(USER)).kind).toBe("synced");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("**범위가 밀리면 내용이 같아도 다시 올린다** — 새 달을 놓치지 않는다", async () => {
    await useCalendarSync.getState().sync(USER);
    loadState.mockResolvedValue(saveState.mock.calls[0]?.[1] as CalendarSyncState);

    // 9월이 됐다 → 창이 8/1 ~ 10/31 로 밀린다
    setClock(fixedClock("2026-09-01T10:00:00"));
    send.mockClear();

    expect((await useCalendarSync.getState().sync(USER)).kind).toBe("synced");
    expect(sentSnapshot()[0]).toEqual({ from: "2026-08-01", to: "2026-10-31" });
  });
});

/**
 * ⛔ 이 묶음이 제일 중요하다. 못 읽은 것을 「0건」으로 보내면 서버가 그 범위를
 * 통째로 지운다 — 거기 붙은 감정·마침 기록까지 함께.
 */
describe("못 읽었으면 아무것도 보내지 않는다", () => {
  it("권한이 꺼져 있으면 보내지 않는다", async () => {
    read.mockResolvedValue({ ok: false, reason: "denied" });

    expect(await useCalendarSync.getState().sync(USER)).toEqual({ kind: "denied" });
    expect(send).not.toHaveBeenCalled();
    expect(saveState).not.toHaveBeenCalled();
  });

  it("조회가 실패해도 보내지 않는다", async () => {
    read.mockResolvedValue({ ok: false, reason: "failed" });

    expect(await useCalendarSync.getState().sync(USER)).toEqual({ kind: "unreadable" });
    expect(send).not.toHaveBeenCalled();
    expect(saveState).not.toHaveBeenCalled();
  });

  it("진짜 0건은 보낸다 — 그 범위를 전부 지운 사용자가 있다", async () => {
    read.mockResolvedValue({ ok: true, events: [] });

    expect((await useCalendarSync.getState().sync(USER)).kind).toBe("synced");
    expect(sentSnapshot()[1]).toEqual([]);
  });
});

describe("전송이 실패하면 해시를 저장하지 않는다", () => {
  it("저장했다면 다음 실행이 「같으니 건너뛴다」로 읽는다", async () => {
    send.mockResolvedValue({ ok: false, error: { code: "network" } });

    expect(await useCalendarSync.getState().sync(USER)).toEqual({ kind: "failed" });
    expect(saveState).not.toHaveBeenCalled();
  });

  it("다음 실행이 다시 보낸다", async () => {
    send.mockResolvedValueOnce({ ok: false, error: { code: "network" } });
    await useCalendarSync.getState().sync(USER);

    send.mockResolvedValue({ ok: true, data: { created: 1, updated: 0, deleted: 0 } });
    expect((await useCalendarSync.getState().sync(USER)).kind).toBe("synced");
    expect(saveState).toHaveBeenCalledTimes(1);
  });
});

describe("겹쳐 부르지 않는다", () => {
  it("돌고 있으면 두 번째는 `busy` 다", async () => {
    let release: () => void = () => {};
    read.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ ok: true, events: [event()] });
      }),
    );

    const first = useCalendarSync.getState().sync(USER);
    const second = await useCalendarSync.getState().sync(USER);
    release();
    await first;

    expect(second).toEqual({ kind: "busy" });
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe("서버로 가는 것은 셋뿐이다", () => {
  it("`calendarId`·`eventId` 가 실리지 않는다", async () => {
    await useCalendarSync.getState().sync(USER);

    const events = sentSnapshot()[1] as { externalId: string; date: string; title: string }[];
    expect(Object.keys(events[0] ?? {}).sort()).toEqual(["date", "externalId", "title"]);
  });

  it("여러 날 걸친 일정은 날짜 수만큼 실린다", async () => {
    read.mockResolvedValue({
      ok: true,
      events: [event({ end: new Date("2026-08-08T10:00:00") })],
    });

    await useCalendarSync.getState().sync(USER);

    const events = sentSnapshot()[1] as { date: string }[];
    expect(events.map((e) => e.date)).toEqual([
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
    ]);
  });

  it("다일 일정의 기간이 바뀌면 스냅샷이 통째로 갈린다 — 줄 하나씩 고치지 않는다", async () => {
    read.mockResolvedValue({
      ok: true,
      events: [event({ end: new Date("2026-08-08T10:00:00") })],
    });
    await useCalendarSync.getState().sync(USER);
    loadState.mockResolvedValue(saveState.mock.calls[0]?.[1] as CalendarSyncState);
    send.mockClear();

    // 8/5~8/8 → 8/7~8/10 으로 옮겼다
    read.mockResolvedValue({
      ok: true,
      events: [
        event({ start: new Date("2026-08-07T10:00:00"), end: new Date("2026-08-10T10:00:00") }),
      ],
    });
    await useCalendarSync.getState().sync(USER);

    const events = sentSnapshot()[1] as { date: string }[];
    expect(events.map((e) => e.date)).toEqual([
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
    ]);
    // 8/5·8/6 은 목록에 없다 → 서버가 그 범위에서 지운다
    expect(events.some((e) => e.date === "2026-08-05")).toBe(false);
  });
});
