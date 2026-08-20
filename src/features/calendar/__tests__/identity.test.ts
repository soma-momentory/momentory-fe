import { resolveCalendarEventIdentities } from "@/features/calendar/model/identity";
import type { CalendarEvent } from "@/lib/calendar";

const event = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  eventId: "series-ios",
  calendarId: "calendar-1",
  title: "회의 참석",
  start: new Date("2026-08-17T10:00:00"),
  end: null,
  allDay: false,
  originalStart: null,
  creationDate: null,
  isDetached: false,
  originalId: null,
  recurring: true,
  ...over,
});

describe("반복 회차 식별의 플랫폼 차이", () => {
  it("iOS 분리 회차는 같은 calendarId·creationDate의 반복 원본 id를 쓴다", () => {
    const created = new Date("2026-08-01T09:00:00");
    const original = event({ creationDate: created });
    const detached = event({
      eventId: "detached-ios",
      title: "회의 참석(수정)",
      start: new Date("2026-08-19T10:00:00"),
      originalStart: new Date("2026-08-19T10:00:00"),
      creationDate: created,
      isDetached: true,
      recurring: false,
    });

    expect(resolveCalendarEventIdentities([original, detached])[1]).toEqual({
      seriesId: "series-ios",
      originalStart: detached.originalStart,
    });
  });

  it("Android 분리 회차는 originalId를 우선한다", () => {
    const detached = event({
      eventId: "detached-android",
      originalId: "series-android",
      isDetached: true,
      recurring: false,
    });

    expect(resolveCalendarEventIdentities([detached])[0]?.seriesId).toBe("series-android");
  });

  it("iOS 부모 후보가 충돌하면 억지로 합치지 않고 현재 id를 쓴다", () => {
    const created = new Date("2026-08-01T09:00:00");
    const detached = event({ eventId: "detached", creationDate: created, isDetached: true });

    expect(
      resolveCalendarEventIdentities([
        event({ eventId: "series-a", creationDate: created }),
        event({ eventId: "series-b", creationDate: created }),
        detached,
      ])[2]?.seriesId,
    ).toBe("detached");
  });

  it("원본 신호가 없는 일반 일정은 기존 event id와 시작 시각을 그대로 쓴다", () => {
    const single = event({ eventId: "single", recurring: false });

    expect(resolveCalendarEventIdentities([single])[0]).toEqual({
      seriesId: "single",
      originalStart: single.start,
    });
  });
});
