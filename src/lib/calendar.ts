import {
  EntityTypes,
  getCalendarPermissions,
  getCalendars,
  listEvents,
  requestCalendarPermissions,
  type ExpoCalendar,
  type ExpoCalendarEvent,
} from "expo-calendar";

import { dayFrom } from "@/lib/clock";

/**
 * 기기 캘린더 경계 — **`expo-calendar` 를 부르는 곳은 여기 하나다.**
 *
 * `notifications.ts`·`kakaoSdk.ts` 와 같은 자리다: 네이티브의 말을 우리 말로
 * 바꿔 주고 **던지지 않는다.** 캘린더는 앱의 본체가 아니라 회고 재료를 거드는
 * 것이라, 여기서 난 오류가 온보딩이나 홈을 멈추게 하면 안 된다 — 실패하면
 * 조용히 **빈 목록**이다(`RULES.md` 4).
 *
 * ⚠ **아직 서버로 가지 않는다**(2026-08-11). 계약에 `externalId`·`source`·`hidden`
 * 이 없어 올려도 앱을 열 때마다 같은 일정이 새로 쌓인다(`DISCUSSION.md` §1-4).
 * 지금은 **읽어 오는 것까지만**이고, 화해(reconcile)는 그 셋이 생긴 뒤다.
 *
 * ## 플랫폼별로 코드를 나누지 않는다 — 갈리는 것은 「의미」다
 *
 * 조회 함수는 두 OS 가 같다. 우리가 흡수해야 하는 차이는 넷이다:
 *
 * 1. **반복 일정의 키** — 아래 `externalIdOf` 주석이 정본이다
 * 2. **종일 일정·타임존** — 우리 하루는 자정이 아니라 **04:00 에 넘어간다**
 *    (`clock.ts`). 시작 시각을 `dayFrom` 으로 접어 날짜를 정하므로 새벽 2시
 *    일정은 「어제」에 붙는다. 그래서 조회는 앞뒤로 하루씩 넓게 잡는다
 * 3. **미리 알림(reminder)** — iOS 전용이고 쓰지 않는다. `EntityTypes.EVENT` 만 본다
 * 4. **동기화되지 않는 달력** — Android 는 `isSynced === false` 인 달력을 줄 수
 *    있고, 그 이벤트를 읽으면 동작이 정의돼 있지 않다(expo 문서). 걸러낸다
 *
 * `Platform.OS` 분기가 필요해지면 **이 파일 안에서만** 한다.
 */

/** 기기에서 읽어 온 일정 하나 — **스키마 `Schedule` 이 아니다.** 아직 우리 것이 아니다 */
export type DeviceEvent = {
  /**
   * 그 일정을 다시 알아보기 위한 키. 서버 계약이 생기면 이것이 `externalId` 가
   * 된다 — **앱을 열 때마다 같아야** 화해가 중복을 만들지 않는다.
   */
  externalId: string;
  /** `YYYY-MM-DD` · 04:00 경계로 접은 날짜 */
  date: string;
  /** 제목. **시간은 읽지 않는다** — `Schedule.time` 은 MVP 에서 항상 `null`(`09.md`) */
  title: string;
};

/** 권한 결과 — 화면은 「읽을 수 있는가」와 「다시 물을 수 있는가」만 알면 된다 */
export type CalendarAccess = {
  granted: boolean;
  /** 다시 물을 수 있다. `false` 면 설정에서 켜는 수밖에 없다 */
  canAskAgain: boolean;
};

const DENIED: CalendarAccess = { granted: false, canAskAgain: false };

const toAccess = (r: { granted: boolean; canAskAgain: boolean }): CalendarAccess => ({
  granted: r.granted,
  canAskAgain: r.canAskAgain,
});

/**
 * 지금 상태만 본다 — **다이얼로그를 띄우지 않는다.**
 *
 * `writeOnly` 를 주지 않으므로 **읽기까지 되는 권한**을 묻는다(iOS 17+ 는 「전체
 * 접근」과 「쓰기 전용」이 갈렸는데, 우리는 읽기만 하므로 쓰기 전용은 쓸모가 없다).
 */
export async function getCalendarAccess(): Promise<CalendarAccess> {
  try {
    return toAccess(await getCalendarPermissions());
  } catch {
    return DENIED;
  }
}

/**
 * 권한을 묻는다. **`09` 가 안내 카드를 보인 뒤**에만 부른다 — 시스템
 * 다이얼로그는 「허용/거부」만 물어서, 앞에 이유가 없으면 대부분 거부로 끝난다(`09.md`).
 *
 * 이미 거부됐고 다시 물을 수 없으면 **다이얼로그를 띄우지 않는다** — 아무 일도
 * 일어나지 않는 버튼이 되기 때문이다(알림에서 한 것과 같은 규칙).
 */
export async function requestCalendarAccess(): Promise<CalendarAccess> {
  const current = await getCalendarAccess();
  if (current.granted || !current.canAskAgain) return current;

  try {
    return toAccess(await requestCalendarPermissions());
  } catch {
    return DENIED;
  }
}

/**
 * 반복 일정의 이번 회차를 가리키는 키 — **`id` 에 날짜를 붙인다.**
 *
 * ⚠ **`instanceId` 를 쓰지 않는다.** Android 전용인 데다 expo 가 스스로
 * "volatile ID … 항상 같은 인스턴스를 가리킨다고 보장하지 않는다"고 적어 뒀다.
 * 앱을 열 때마다 값이 달라지면 화해가 **매번 지웠다 새로 만든다** — 그 일정에
 * 달린 감정·마침 기록이 함께 날아간다(`DISCUSSION.md` §1-4).
 *
 * 반복 일정은 두 OS 모두 회차들이 **같은 `id`** 를 공유하므로, 날짜를 붙이면
 * 「매주 화요일 팀 회의」의 이번 주와 다음 주가 서로 다른 일정이 된다 — 홈이
 * 각 날짜에 하나씩 그려야 하므로 이것이 맞는 단위다.
 */
export const externalIdOf = (eventId: string, date: string): string => `${eventId}@${date}`;

/** 문자열·Date 어느 쪽으로 와도 04:00 경계로 접은 날짜로 만든다 */
const dateOf = (startDate: ExpoCalendarEvent["startDate"]): string | null => {
  const at = startDate instanceof Date ? startDate : new Date(startDate);
  return Number.isNaN(at.getTime()) ? null : dayFrom(at);
};

/**
 * 읽어도 되는 달력만. Android 는 기기에 실제로 내려받지 않은 달력
 * (`isSynced === false`)을 줄 수 있고, 그 이벤트 조회는 동작이 정의돼 있지 않다.
 * 값이 없는 플랫폼(iOS)에서는 거르지 않는다.
 */
const isReadable = (calendar: ExpoCalendar) => calendar.isSynced !== false;

/**
 * 그 기간의 기기 일정. **던지지 않는다** — 권한이 없거나 조회가 실패하면 빈 배열이다.
 *
 * `from`·`to` 는 `YYYY-MM-DD` 이고 **양끝을 포함한다.** 04:00 경계 때문에 실제
 * 조회는 앞뒤로 하루씩 넓게 잡고 접은 날짜로 다시 걸러낸다 — 그러지 않으면
 * 새벽 1시 일정(우리 기준 「어제」)이 빠진다.
 */
export async function readDeviceEvents(from: string, to: string): Promise<DeviceEvent[]> {
  const access = await getCalendarAccess();
  if (!access.granted) return [];

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  start.setDate(start.getDate() - 1);
  end.setDate(end.getDate() + 1);

  try {
    const calendars = (await getCalendars(EntityTypes.EVENT)).filter(isReadable);
    if (calendars.length === 0) return [];

    const events = await listEvents(
      calendars.map((c) => c.id),
      start,
      end,
    );

    const out: DeviceEvent[] = [];
    for (const event of events) {
      const title = typeof event.title === "string" ? event.title.trim() : "";
      // 제목 없는 일정은 회고에 쓸 실마리가 없다 — 홈에 빈 줄을 만들지 않는다
      if (title.length === 0) continue;
      const date = dateOf(event.startDate);
      if (date == null || date < from || date > to) continue;
      out.push({ externalId: externalIdOf(event.id, date), date, title });
    }
    return out;
  } catch {
    return [];
  }
}
