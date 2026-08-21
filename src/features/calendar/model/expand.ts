import { makeExternalId } from "@/features/calendar/model/externalId";
import type { Occurrence, SyncRange } from "@/features/calendar/model/types";
import type { CalendarEventIdentity } from "@/features/calendar/model/identity";
import type { CalendarEvent } from "@/lib/calendar";
import { dayFrom } from "@/lib/clock";

/**
 * 기기 일정 하나를 **날짜별 회차 여러 개**로 편다.
 *
 * ```
 * 기기 캘린더                    →   Momentory
 * "제주 여행" 8/5 ~ 8/11(배타)       8/5 · 8/6 · 8/7 · 8/8 · 8/9 · 8/10
 * ```
 *
 * **왜 하루 단위인가** — 홈은 `date = 오늘` 로 하루치를 꺼낸다. 8/7 줄이 없으면
 * 여행 3일차 홈이 빈다. 그리고 **감정과 마침 표시가 줄마다 붙는다** — 한 줄이면
 * 2일차 감정과 3일차 감정을 따로 남길 수 없다. 회고가 하루 단위인 이상 일정도
 * 하루 단위여야 한다.
 *
 * **반복 일정은 여기서 할 일이 없다** — `listEvents` 가 규칙이 아니라 **회차**를
 * 준다(「매주 화요일」이 아니라 7/7·7/14·7/21 로 온다). 그래서 이 함수는 반복을
 * 모르고, 서버도 모른다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 종일 일정은 시각이 아니라 캘린더의 **날짜 자체**다.
 *
 * iOS 는 종일 일정을 로컬 자정으로 줄 수 있다. 여기에 Momentory 의 04:00 경계를
 * 적용하면 `8/22 00:00` 이 `8/21` 로 접힌다. Android 의 UTC 자정(KST 09:00)과
 * 표현은 달라도, 두 플랫폼 모두 기기 로컬 달력 날짜를 읽으면 같은 날이 된다.
 */
const calendarDayFrom = (at: Date): string =>
  `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;

const eventDayFrom = (at: Date, allDay: boolean): string =>
  allDay ? calendarDayFrom(at) : dayFrom(at);

/** 하루 뒤. 문자열 산술을 하지 않는다 — 월말·윤년이 걸린다 */
const nextDay = (date: string): string => {
  // 정오를 쓴다 — 04:00 경계에서 멀어 어느 쪽으로도 접히지 않는다
  const at = new Date(`${date}T12:00:00`);
  at.setDate(at.getDate() + 1);
  return dayFrom(at);
};

/**
 * 그 일정이 **사용자 눈에 걸쳐 보이는 마지막 날.**
 *
 * ⚠ Android 의 종일 `end` 는 시작과 같은 시각의 다음 날(exclusive), iOS 실기기는
 * 그날 23:59:59 로 왔다. 시작·끝의 시각이 같을 때만 하루를 빼고, 그 밖에는 끝에서
 * 1ms만 뺀다. 무조건 24시간을 빼면 iOS 일정은 하루 짧아진다.
 *
 * 시각이 있는 일정은 빼지 않는다 — 끝 시각 자체가 마지막 순간이고, 자정을 넘긴
 * 일정은 `dayFrom` 이 04:00 경계로 알아서 접는다(새벽 1시에 끝나면 「어제」다).
 *
 * `while (cursor <= end)` 를 원본 `end` 로 그냥 돌리면 안 되는 이유가 이것이다.
 */
const lastDateOf = (event: CalendarEvent, first: string): string => {
  if (event.end == null) return first;
  const sameTimeOfDay =
    event.start.getHours() === event.end.getHours() &&
    event.start.getMinutes() === event.end.getMinutes() &&
    event.start.getSeconds() === event.end.getSeconds() &&
    event.start.getMilliseconds() === event.end.getMilliseconds();
  const allDayEnd = new Date(event.end.getTime() - (sameTimeOfDay ? DAY_MS : 1));
  const last = eventDayFrom(event.allDay ? allDayEnd : event.end, event.allDay);
  // 끝이 시작보다 앞서면(망가진 값) 하루짜리로 접는다
  return last < first ? first : last;
};

/**
 * `range` 안에 들어오는 회차만 만든다.
 *
 * **범위 밖을 만들지 않는 것이 중요하다** — 서버는 `[from, to]` 안에서 목록에 없는
 * 캘린더 일정을 지운다. 창 밖 날짜를 섞어 보내면 서버가 지우는 범위와 우리가 보는
 * 범위가 어긋난다.
 *
 * 반복 횟수도 창 길이로 묶인다 — 작년부터 이어지는 일정이든 끝 날짜가 망가져
 * 멀리 있든, 루프가 `range` 를 넘지 않는다.
 *
 * 날짜는 전부 사용자 로컬 기준 `YYYY-MM-DD` 다. 시각 일정만 `dayFrom` 의 04:00
 * 경계를 지나고, 종일 일정은 캘린더에 표시된 날짜를 그대로 쓴다.
 */
const dayNumber = (date: string): number => {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
};

const shiftDay = (date: string, amount: number): string => {
  const shifted = new Date((dayNumber(date) + amount) * DAY_MS);
  return shifted.toISOString().slice(0, 10);
};

export const expandCalendarEventByDate = (
  event: CalendarEvent,
  range: SyncRange,
  identity: CalendarEventIdentity = {
    seriesId: event.originalId ?? event.eventId,
    originalStart: event.originalStart ?? event.start,
  },
): Occurrence[] => {
  const first = eventDayFrom(event.start, event.allDay);
  const originalFirst = eventDayFrom(identity.originalStart, event.allDay);
  const last = lastDateOf(event, first);
  if (last < range.from || first > range.to) return [];

  const out: Occurrence[] = [];
  for (
    let date = first < range.from ? range.from : first;
    date <= last && date <= range.to;
    date = nextDay(date)
  ) {
    out.push({
      externalId: makeExternalId({
        calendarId: event.calendarId,
        eventId: identity.seriesId,
        date: shiftDay(originalFirst, dayNumber(date) - dayNumber(first)),
      }),
      date,
      title: event.title,
      calendarId: event.calendarId,
      eventId: identity.seriesId,
    });
  }
  return out;
};
