import type { CalendarEvent } from "@/lib/calendar";

/** 날짜별 회차 키를 만들 때 필요한, 플랫폼 차이를 걷어낸 최소 식별 정보 */
export type CalendarEventIdentity = {
  seriesId: string;
  originalStart: Date;
};

const creationKey = (event: CalendarEvent): string | null =>
  event.creationDate == null
    ? null
    : `${event.calendarId}\u0000${event.creationDate.getTime()}`;

/**
 * iOS 와 Android 가 분리된 반복 회차를 다르게 표현하는 간극을 여기서만 흡수한다.
 *
 * - Android: `originalId` 가 원본 반복 이벤트를 직접 가리킨다.
 * - iOS: 분리 회차에는 원본 id 가 없지만, 실기기에서 원본 시리즈와
 *   `calendarId + creationDate` 가 같았다. 같은 키의 반복 원본이 하나로 확정될 때만
 *   그 id 를 쓴다. 애매하면 추측하지 않고 현재 event id 로 되돌아간다.
 * - 두 OS 모두 `originalStart` 가 있으면 이동 전 회차 날짜를 키로 쓴다.
 */
export const resolveCalendarEventIdentities = (
  events: readonly CalendarEvent[],
): CalendarEventIdentity[] => {
  const iosParents = new Map<string, string | null>();

  for (const event of events) {
    if (event.isDetached || !event.recurring) continue;
    const key = creationKey(event);
    if (key == null) continue;

    const found = iosParents.get(key);
    if (found === undefined) iosParents.set(key, event.eventId);
    else if (found !== event.eventId) iosParents.set(key, null);
  }

  return events.map((event) => {
    const iosParent = event.isDetached ? iosParents.get(creationKey(event) ?? "") : null;
    return {
      seriesId: event.originalId ?? iosParent ?? event.eventId,
      originalStart: event.originalStart ?? event.start,
    };
  });
};
