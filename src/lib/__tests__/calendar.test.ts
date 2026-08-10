import {
  getCalendarPermissions,
  getCalendars,
  listEvents,
  requestCalendarPermissions,
} from "expo-calendar";

import {
  externalIdOf,
  getCalendarAccess,
  readDeviceEvents,
  requestCalendarAccess,
} from "@/lib/calendar";
import { SAMPLE_TODAY } from "@/lib/clock";

jest.mock("expo-calendar", () => ({
  EntityTypes: { EVENT: "event", REMINDER: "reminder" },
  getCalendarPermissions: jest.fn(),
  requestCalendarPermissions: jest.fn(),
  getCalendars: jest.fn(),
  listEvents: jest.fn(),
}));

const permissions = jest.mocked(getCalendarPermissions);
const requestPermissions = jest.mocked(requestCalendarPermissions);
const calendars = jest.mocked(getCalendars);
const events = jest.mocked(listEvents);

const allow = (over: Partial<{ granted: boolean; canAskAgain: boolean }> = {}) =>
  ({ granted: true, canAskAgain: true, ...over }) as never;

/** 기기 달력 하나. `isSynced` 는 Android 만 준다 */
const calendar = (id: string, over: Record<string, unknown> = {}) =>
  ({ id, title: `달력 ${id}`, allowsModifications: true, ...over }) as never;

const event = (over: Record<string, unknown> = {}) =>
  ({ id: "e1", title: "면접 스터디", startDate: `${SAMPLE_TODAY}T10:00:00`, ...over }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  permissions.mockResolvedValue(allow());
  calendars.mockResolvedValue([calendar("c1")]);
  events.mockResolvedValue([event()]);
});

describe("권한 — 다이얼로그를 함부로 띄우지 않는다", () => {
  it("이미 허용돼 있으면 다시 묻지 않는다", async () => {
    expect(await requestCalendarAccess()).toEqual({ granted: true, canAskAgain: true });
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("다시 물을 수 없으면 다이얼로그를 띄우지 않는다 — 아무 일도 없는 버튼을 만들지 않는다", async () => {
    permissions.mockResolvedValue(allow({ granted: false, canAskAgain: false }));

    expect(await requestCalendarAccess()).toEqual({ granted: false, canAskAgain: false });
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("아직 안 물었으면 묻는다", async () => {
    permissions.mockResolvedValue(allow({ granted: false, canAskAgain: true }));
    requestPermissions.mockResolvedValue(allow());

    expect((await requestCalendarAccess()).granted).toBe(true);
    expect(requestPermissions).toHaveBeenCalled();
  });

  it("네이티브가 던져도 던지지 않는다 — 거부로 접는다", async () => {
    permissions.mockRejectedValue(new Error("no native module"));

    expect(await getCalendarAccess()).toEqual({ granted: false, canAskAgain: false });
  });
});

describe("externalId — 화해가 기대는 키다", () => {
  it("같은 반복 일정의 다른 날은 다른 키다", () => {
    // 「매주 화요일 팀 회의」 — 두 OS 모두 회차가 같은 id 를 공유한다
    expect(externalIdOf("e1", "2026-07-27")).not.toBe(externalIdOf("e1", "2026-08-03"));
  });

  it("같은 회차는 다시 읽어도 같은 키다", () => {
    expect(externalIdOf("e1", "2026-07-27")).toBe(externalIdOf("e1", "2026-07-27"));
  });

  it("**`instanceId` 를 섞지 않는다** — Android 전용이고 expo 가 volatile 이라 적어 뒀다", async () => {
    // 같은 일정을 두 번 읽었는데 instanceId 만 달라진 상황
    events.mockResolvedValueOnce([event({ instanceId: "i-1" })]);
    const first = await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY);
    events.mockResolvedValueOnce([event({ instanceId: "i-2" })]);
    const second = await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY);

    // 키가 흔들리면 화해가 매번 지웠다 새로 만든다 — 감정·마침 기록이 날아간다
    expect(first[0]?.externalId).toBe(second[0]?.externalId);
  });
});

describe("읽어 오기", () => {
  it("권한이 없으면 부르지도 않는다 — 빈 목록이다", async () => {
    permissions.mockResolvedValue(allow({ granted: false }));

    expect(await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY)).toEqual([]);
    expect(calendars).not.toHaveBeenCalled();
  });

  it("일정 하나를 우리 모양으로 옮긴다 — 시간은 읽지 않는다", async () => {
    const [first, ...rest] = await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY);

    expect(rest).toHaveLength(0);
    expect(first).toEqual({
      externalId: `e1@${SAMPLE_TODAY}`,
      date: SAMPLE_TODAY,
      title: "면접 스터디",
    });
  });

  it("미리 알림이 아니라 일정만 본다 — reminder 는 iOS 전용이고 쓰지 않는다", async () => {
    await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY);

    expect(calendars).toHaveBeenCalledWith("event");
  });

  it("동기화되지 않은 달력은 거른다 — Android 에서 동작이 정의돼 있지 않다", async () => {
    calendars.mockResolvedValue([calendar("c1", { isSynced: false }), calendar("c2")]);

    await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY);

    expect(events).toHaveBeenCalledWith(["c2"], expect.any(Date), expect.any(Date));
  });

  it("읽을 달력이 하나도 없으면 조회하지 않는다", async () => {
    calendars.mockResolvedValue([]);

    expect(await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY)).toEqual([]);
    expect(events).not.toHaveBeenCalled();
  });

  it("제목이 없거나 공백뿐이면 버린다 — 홈에 빈 줄을 만들지 않는다", async () => {
    events.mockResolvedValue([event({ title: "   " }), event({ id: "e2", title: undefined })]);

    expect(await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY)).toEqual([]);
  });

  it("Date 로 와도 문자열로 와도 같게 읽는다", async () => {
    events.mockResolvedValue([event({ startDate: new Date(`${SAMPLE_TODAY}T10:00:00`) })]);

    expect((await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY))[0]?.date).toBe(SAMPLE_TODAY);
  });

  it("네이티브가 던져도 던지지 않는다 — 빈 목록이다", async () => {
    events.mockRejectedValue(new Error("boom"));

    expect(await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY)).toEqual([]);
  });
});

describe("하루 경계는 자정이 아니라 04:00 이다", () => {
  it("새벽 2시 일정은 「어제」에 붙는다", async () => {
    // 7/28 새벽 2시 = 우리 기준 7/27
    events.mockResolvedValue([event({ startDate: "2026-07-28T02:00:00" })]);

    const [first] = await readDeviceEvents("2026-07-27", "2026-07-27");
    expect(first?.date).toBe("2026-07-27");
    expect(first?.externalId).toBe("e1@2026-07-27");
  });

  it("그 일정을 놓치지 않으려고 앞뒤로 하루씩 넓게 조회한다", async () => {
    await readDeviceEvents("2026-07-27", "2026-07-27");

    const [, start, end] = events.mock.calls[0] ?? [];
    expect((start as Date).getDate()).toBe(26);
    expect((end as Date).getDate()).toBe(28);
  });

  it("넓게 읽되 범위 밖은 돌려주지 않는다", async () => {
    events.mockResolvedValue([
      event({ id: "before", startDate: "2026-07-26T10:00:00" }),
      event({ id: "inside", startDate: "2026-07-27T10:00:00" }),
      event({ id: "after", startDate: "2026-07-28T10:00:00" }),
    ]);

    const got = await readDeviceEvents("2026-07-27", "2026-07-27");
    expect(got.map((e) => e.title)).toHaveLength(1);
    expect(got[0]?.externalId).toBe("inside@2026-07-27");
  });

  it("망가진 날짜는 조용히 버린다", async () => {
    events.mockResolvedValue([event({ startDate: "언젠가" })]);
    expect(await readDeviceEvents(SAMPLE_TODAY, SAMPLE_TODAY)).toEqual([]);

    expect(await readDeviceEvents("어제", "오늘")).toEqual([]);
  });
});
