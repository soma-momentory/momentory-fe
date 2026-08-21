import { expandCalendarEventByDate } from "@/features/calendar/model/expand";
import { makeExternalId } from "@/features/calendar/model/externalId";
import type { SyncRange } from "@/features/calendar/model/types";
import type { CalendarEvent } from "@/lib/calendar";

const RANGE: SyncRange = { from: "2026-07-01", to: "2026-09-30" };

const event = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  eventId: "e1",
  calendarId: "c1",
  title: "제주 여행",
  start: new Date("2026-08-05T10:00:00"),
  end: null,
  allDay: false,
  originalStart: null,
  creationDate: null,
  isDetached: false,
  originalId: null,
  recurring: false,
  ...over,
});

const datesOf = (e: CalendarEvent, range: SyncRange = RANGE) =>
  expandCalendarEventByDate(e, range).map((o) => o.date);

describe("하루짜리", () => {
  it("끝이 없으면 시작일 하나다", () => {
    expect(datesOf(event())).toEqual(["2026-08-05"]);
  });

  it("같은 날 안에서 끝나면 하나다", () => {
    expect(datesOf(event({ end: new Date("2026-08-05T12:00:00") }))).toEqual(["2026-08-05"]);
  });
});

describe("여러 날 걸친 일정 — 날짜마다 한 줄", () => {
  it("걸치는 날마다 한 줄이 된다 — 안 그러면 여행 3일차 홈이 빈다", () => {
    expect(
      datesOf(
        event({ start: new Date("2026-08-05T10:00:00"), end: new Date("2026-08-08T10:00:00") }),
      ),
    ).toEqual(["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"]);
  });

  it("달을 넘어도 이어진다 — 문자열 산술이 아니다", () => {
    expect(
      datesOf(
        event({ start: new Date("2026-07-30T10:00:00"), end: new Date("2026-08-02T10:00:00") }),
      ),
    ).toEqual(["2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"]);
  });

  it("끝이 시작보다 앞서면 하루짜리로 접는다 — 망가진 값에 매달리지 않는다", () => {
    expect(
      datesOf(
        event({ start: new Date("2026-08-05T10:00:00"), end: new Date("2026-07-20T10:00:00") }),
      ),
    ).toEqual(["2026-08-05"]);
  });
});

/**
 * 2026-08-14 실측: 하루짜리 `광복절`이 `08-15 ~ 08-16` 으로 왔다.
 * 보정하지 않으면 **모든 공휴일·생일·종일 일정이 하루씩 길어진다.**
 */
describe("종일 일정의 끝은 배타적이다", () => {
  // UTC 자정이 KST 09:00 으로 오는 실제 모양을 로컬 시각으로 흉내낸다
  const allDay = (start: string, end: string) =>
    event({ allDay: true, start: new Date(start), end: new Date(end) });

  it("하루짜리가 이틀이 되지 않는다", () => {
    expect(datesOf(allDay("2026-08-15T09:00:00", "2026-08-16T09:00:00"))).toEqual(["2026-08-15"]);
  });

  it("iOS 로컬 자정은 04:00 경계 때문에 전날로 밀리지 않는다", () => {
    expect(datesOf(allDay("2026-08-22T00:00:00", "2026-08-23T00:00:00"))).toEqual(["2026-08-22"]);
  });

  it("iOS 의 그날 23:59:59 표현도 하루짜리다", () => {
    expect(datesOf(allDay("2026-08-15T09:00:00", "2026-08-15T23:59:59"))).toEqual(["2026-08-15"]);
  });

  it("이틀짜리는 이틀이다", () => {
    expect(datesOf(allDay("2026-08-15T09:00:00", "2026-08-17T09:00:00"))).toEqual([
      "2026-08-15",
      "2026-08-16",
    ]);
  });

  it("사용자에게 보이는 날짜 수와 같다 — 8/5~8/10 이면 여섯 줄", () => {
    // 캘린더 앱에 8/5~8/10 으로 보이는 일정은 API 가 8/11 을 끝으로 준다
    expect(datesOf(allDay("2026-08-05T09:00:00", "2026-08-11T09:00:00"))).toHaveLength(6);
  });

  it("시각이 있는 일정에는 보정을 걸지 않는다", () => {
    // 자정을 넘겨 끝나는 일정 — 04:00 경계가 「어제」로 접으므로 하루짜리다
    expect(
      datesOf(
        event({ start: new Date("2026-08-05T22:00:00"), end: new Date("2026-08-06T01:00:00") }),
      ),
    ).toEqual(["2026-08-05"]);
  });
});

describe("창 밖으로는 만들지 않는다", () => {
  it("창 끝에서 잘린다 — 서버가 지우는 범위와 같아야 한다", () => {
    // 9/30~10/5 워크숍. 창이 9/30 에서 끝나면 9/30 한 줄만이다
    expect(
      datesOf(
        event({ start: new Date("2026-09-30T10:00:00"), end: new Date("2026-10-05T10:00:00") }),
      ),
    ).toEqual(["2026-09-30"]);
  });

  it("창보다 먼저 시작한 일정도 창 안 날짜는 나온다", () => {
    expect(
      datesOf(
        event({ start: new Date("2026-06-28T10:00:00"), end: new Date("2026-07-02T10:00:00") }),
      ),
    ).toEqual(["2026-07-01", "2026-07-02"]);
  });

  it("창에 아예 안 걸치면 빈 배열이다", () => {
    expect(datesOf(event({ start: new Date("2026-12-01T10:00:00") }))).toEqual([]);
    expect(datesOf(event({ start: new Date("2026-01-01T10:00:00") }))).toEqual([]);
  });

  it("끝 날짜가 망가져 멀리 있어도 창을 넘지 않는다", () => {
    const got = datesOf(
      event({ start: new Date("2026-09-29T10:00:00"), end: new Date("2999-01-01T10:00:00") }),
    );

    expect(got).toEqual(["2026-09-29", "2026-09-30"]);
  });
});

describe("04:00 하루 경계 · 로컬 날짜", () => {
  it("새벽 2시 일정은 「어제」에 붙는다", () => {
    expect(datesOf(event({ start: new Date("2026-08-06T02:00:00") }))).toEqual(["2026-08-05"]);
  });

  it("자정 일정이 UTC 변환으로 하루 밀리지 않는다", () => {
    // `2026-08-05 00:00` 로컬 → 04:00 경계로 「8/4」. UTC 로 바꿔 8/4 가 되는 것과는 다른 이유다
    expect(datesOf(event({ start: new Date(2026, 7, 5, 0, 0, 0) }))).toEqual(["2026-08-04"]);
    // 04:00 을 넘기면 그날이다
    expect(datesOf(event({ start: new Date(2026, 7, 5, 4, 0, 0) }))).toEqual(["2026-08-05"]);
  });
});

describe("원본과의 관계를 잃지 않는다", () => {
  it("모든 회차가 같은 `eventId`·`calendarId` 를 들고 있다", () => {
    const got = expandCalendarEventByDate(
      event({ start: new Date("2026-08-05T10:00:00"), end: new Date("2026-08-07T10:00:00") }),
      RANGE,
    );

    expect(got.map((o) => o.eventId)).toEqual(["e1", "e1", "e1"]);
    expect(got.map((o) => o.calendarId)).toEqual(["c1", "c1", "c1"]);
    expect(got.map((o) => o.title)).toEqual(["제주 여행", "제주 여행", "제주 여행"]);
  });

  it("이동된 반복 회차는 화면 날짜가 바뀌어도 원래 날짜로 같은 키를 만든다", () => {
    const moved = event({
      eventId: "detached",
      start: new Date("2026-08-06T10:00:00"),
      originalStart: new Date("2026-08-05T10:00:00"),
      isDetached: true,
    });

    const [got] = expandCalendarEventByDate(moved, RANGE, {
      seriesId: "series",
      originalStart: moved.originalStart!,
    });

    expect(got?.date).toBe("2026-08-06");
    expect(got?.externalId).toBe(
      makeExternalId({ calendarId: "c1", eventId: "series", date: "2026-08-05" }),
    );
  });

  it("회차마다 `externalId` 가 다르고, 그 값이 생성기와 일치한다", () => {
    const got = expandCalendarEventByDate(
      event({ start: new Date("2026-08-05T10:00:00"), end: new Date("2026-08-06T10:00:00") }),
      RANGE,
    );

    expect(new Set(got.map((o) => o.externalId)).size).toBe(2);
    expect(got[0]?.externalId).toBe(
      makeExternalId({ calendarId: "c1", eventId: "e1", date: "2026-08-05" }),
    );
  });
});
