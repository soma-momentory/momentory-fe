import {
  getCalendarPermissions,
  getCalendars,
  listEvents,
  requestCalendarPermissions,
} from "expo-calendar";

import {
  getCalendarAccess,
  readCalendarEvents,
  requestCalendarAccess,
  type CalendarReadResult,
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

/** 기기 달력 하나. `isSynced`·`accessLevel`·`isVisible` 은 Android 만 준다 */
const calendar = (id: string, over: Record<string, unknown> = {}) =>
  ({ id, title: `달력 ${id}`, allowsModifications: true, ...over }) as never;

const event = (over: Record<string, unknown> = {}) =>
  ({
    id: "e1",
    calendarId: "c1",
    title: "면접 스터디",
    startDate: `${SAMPLE_TODAY}T10:00:00`,
    ...over,
  }) as never;

/** `ok: true` 를 확인하고 목록을 꺼낸다 — 실패면 테스트가 거기서 죽는 편이 낫다 */
const eventsOf = (result: CalendarReadResult) => {
  if (!result.ok) throw new Error(`읽기 실패: ${result.reason}`);
  return result.events;
};

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

/**
 * ⛔ 이 묶음이 이 파일에서 제일 중요하다. 실패를 빈 목록으로 뭉개면 화해가
 * 서버의 3개월치를 지운다 — 거기 붙은 감정·마침 기록까지 함께.
 */
describe("「못 읽었다」와 「0건이다」는 절대 같은 값이 아니다", () => {
  it("권한이 없으면 `denied` 다 — 빈 목록이 아니다", async () => {
    permissions.mockResolvedValue(allow({ granted: false }));

    expect(await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY)).toEqual({
      ok: false,
      reason: "denied",
    });
    expect(calendars).not.toHaveBeenCalled();
  });

  it("네이티브가 던지면 `failed` 다 — 빈 목록이 아니다", async () => {
    events.mockRejectedValue(new Error("boom"));

    expect(await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY)).toEqual({
      ok: false,
      reason: "failed",
    });
  });

  it("망가진 인자는 `failed` 다", async () => {
    expect(await readCalendarEvents("어제", "오늘")).toEqual({ ok: false, reason: "failed" });
    expect(await readCalendarEvents("2026-09-01", "2026-07-01")).toEqual({
      ok: false,
      reason: "failed",
    });
    expect(events).not.toHaveBeenCalled();
  });

  it("읽을 달력이 없는 것은 **성공한 0건**이다 — 전부 구독 달력인 기기가 있다", async () => {
    calendars.mockResolvedValue([]);

    expect(await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY)).toEqual({ ok: true, events: [] });
    expect(events).not.toHaveBeenCalled();
  });

  it("일정이 하나도 없는 것도 **성공한 0건**이다", async () => {
    events.mockResolvedValue([]);

    expect(await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY)).toEqual({ ok: true, events: [] });
  });
});

describe("읽어 오기 — 펼치기 전의 원본을 준다", () => {
  it("기기 일정을 우리 모양으로 옮긴다", async () => {
    const [first] = eventsOf(await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY));

    expect(first).toEqual({
      eventId: "e1",
      calendarId: "c1",
      title: "면접 스터디",
      start: new Date(`${SAMPLE_TODAY}T10:00:00`),
      end: null,
      allDay: false,
    });
  });

  it("여러 날 걸친 일정도 **여기서는 하나다** — 펼치기는 다음 겹의 일이다", async () => {
    events.mockResolvedValue([
      event({ startDate: "2026-07-27T10:00:00", endDate: "2026-07-30T10:00:00" }),
    ]);

    expect(eventsOf(await readCalendarEvents("2026-07-27", "2026-07-31"))).toHaveLength(1);
  });

  it("미리 알림이 아니라 일정만 본다 — reminder 는 iOS 전용이고 쓰지 않는다", async () => {
    await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY);

    expect(calendars).toHaveBeenCalledWith("event");
  });

  it("제목이 없거나 공백뿐이면 버린다 — 홈에 빈 줄을 만들지 않는다", async () => {
    events.mockResolvedValue([event({ title: "   " }), event({ id: "e2", title: undefined })]);

    expect(eventsOf(await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY))).toEqual([]);
  });

  it("망가진 시작 시각은 조용히 버린다", async () => {
    events.mockResolvedValue([event({ startDate: "언젠가" })]);

    expect(eventsOf(await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY))).toEqual([]);
  });

  it("04:00 경계 때문에 앞뒤로 하루씩 넓게 조회한다", async () => {
    await readCalendarEvents("2026-07-27", "2026-07-27");

    const [, start, end] = events.mock.calls[0] ?? [];
    expect((start as Date).getDate()).toBe(26);
    expect((end as Date).getDate()).toBe(28);
  });
});

/** 2026-08-14 Android 실측 — 1년치 80건 중 46건(58%)이 공휴일 달력이었다 */
describe("공휴일·구독 달력을 거른다 — 블랙리스트다", () => {
  const readIds = () => (events.mock.calls[0]?.[0] ?? []) as string[];

  it("고칠 수 없는 달력은 읽지 않는다 — 주 신호이고 두 OS 공통이다", async () => {
    calendars.mockResolvedValue([calendar("c1", { allowsModifications: false }), calendar("c2")]);

    await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY);
    expect(readIds()).toEqual(["c2"]);
  });

  it("`accessLevel` 이 read·freebusy·none 이면 읽지 않는다 — Android", async () => {
    calendars.mockResolvedValue([
      calendar("holiday", { accessLevel: "read" }),
      calendar("free", { accessLevel: "freebusy" }),
      calendar("mine", { accessLevel: "owner" }),
    ]);

    await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY);
    expect(readIds()).toEqual(["mine"]);
  });

  it("사용자가 캘린더 앱에서 끈 달력은 읽지 않는다 — 이미 내려진 결정이다", async () => {
    // 실측의 「가족」 달력 — owner 인데 꺼져 있다
    calendars.mockResolvedValue([calendar("family", { isVisible: false }), calendar("c2")]);

    await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY);
    expect(readIds()).toEqual(["c2"]);
  });

  it("동기화되지 않은 달력은 거른다 — Android 에서 동작이 정의돼 있지 않다", async () => {
    calendars.mockResolvedValue([calendar("c1", { isSynced: false }), calendar("c2")]);

    await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY);
    expect(readIds()).toEqual(["c2"]);
  });

  it("신호가 없으면 거르지 않는다 — iOS 에서 사용자 일정이 통째로 사라지면 안 된다", async () => {
    // accessLevel·isVisible·isSynced 는 Android 전용이라 iOS 에선 undefined 다
    calendars.mockResolvedValue([calendar("ios")]);

    await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY);
    expect(readIds()).toEqual(["ios"]);
  });
});

describe("취소된 일정만 뺀다 — 뒤집으면 안 된다", () => {
  it("`canceled` 는 버린다", async () => {
    events.mockResolvedValue([event({ status: "canceled" })]);

    expect(eventsOf(await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY))).toEqual([]);
  });

  it("`status` 가 없어도 남긴다 — 삼성·로컬 달력은 이 값을 주지 않는다(실측 14/23)", async () => {
    events.mockResolvedValue([event({ status: null }), event({ id: "e2", status: "confirmed" })]);

    expect(eventsOf(await readCalendarEvents(SAMPLE_TODAY, SAMPLE_TODAY))).toHaveLength(2);
  });
});
