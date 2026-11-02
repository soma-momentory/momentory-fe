/**
 * `expo-calendar` 심 — 권한은 허용, 기기 캘린더는 **비어 있다**(달력 0개 · 일정 0건).
 * 앱이 쓰는 것(`src/lib/calendar.ts`)만 있다.
 *
 * ⚠ 달력이 0개면 앱은 「읽을 달력이 없다 = 0건」으로 보고 서버에 화해(`POST /schedules/sync`)를
 * 보낼 수 있다 — 가짜 서버는 그 빈 목록으로 데이터 세트의 일정을 지우지 않아야 한다.
 */
export enum EntityTypes {
  EVENT = "event",
  REMINDER = "reminder",
}

const GRANTED = {
  status: "granted" as const,
  granted: true,
  canAskAgain: true,
  expires: "never" as const,
};

export async function getCalendarPermissions() {
  return GRANTED;
}

export async function requestCalendarPermissions() {
  return GRANTED;
}

export async function getCalendarPermissionsAsync() {
  return GRANTED;
}

export async function requestCalendarPermissionsAsync() {
  return GRANTED;
}

export async function getCalendars(_entityType?: EntityTypes): Promise<never[]> {
  return [];
}

export async function getCalendarsAsync(_entityType?: EntityTypes): Promise<never[]> {
  return [];
}

export async function listEvents(
  _calendarIds: readonly string[],
  _start: Date,
  _end: Date,
): Promise<never[]> {
  return [];
}

export async function getEventsAsync(
  _calendarIds: readonly string[],
  _start: Date,
  _end: Date,
): Promise<never[]> {
  return [];
}
