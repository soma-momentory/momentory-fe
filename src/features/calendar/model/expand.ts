import { makeExternalId } from "@/features/calendar/model/externalId";
import type { Occurrence, SyncRange } from "@/features/calendar/model/types";
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
 * ⚠ **종일 일정의 `end` 는 「다음 날 자정」이다**(exclusive end). 2026-08-14 실측:
 * 하루짜리 `광복절`이 `08-15T00:00Z ~ 08-16T00:00Z` 로 왔다. 24시간을 빼지 않으면
 * **모든 공휴일·생일·종일 일정이 하루씩 길어진다.**
 *
 * 시각이 있는 일정은 빼지 않는다 — 끝 시각 자체가 마지막 순간이고, 자정을 넘긴
 * 일정은 `dayFrom` 이 04:00 경계로 알아서 접는다(새벽 1시에 끝나면 「어제」다).
 *
 * `while (cursor <= end)` 를 원본 `end` 로 그냥 돌리면 안 되는 이유가 이것이다.
 */
const lastDateOf = (event: CalendarEvent, first: string): string => {
  if (event.end == null) return first;
  const last = dayFrom(event.allDay ? new Date(event.end.getTime() - DAY_MS) : event.end);
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
 * 날짜는 전부 `dayFrom` 을 지난다 → **사용자 로컬 기준 `YYYY-MM-DD`** 다.
 * UTC 로 바꾸지 않으므로 `2026-08-05 00:00 KST` 가 8/4 로 밀리지 않는다.
 */
export const expandCalendarEventByDate = (event: CalendarEvent, range: SyncRange): Occurrence[] => {
  const first = dayFrom(event.start);
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
        eventId: event.eventId,
        date,
      }),
      date,
      title: event.title,
      calendarId: event.calendarId,
      eventId: event.eventId,
    });
  }
  return out;
};
