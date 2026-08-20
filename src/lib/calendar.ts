import {
  EntityTypes,
  getCalendarPermissions,
  getCalendars,
  listEvents,
  requestCalendarPermissions,
  type ExpoCalendar,
  type ExpoCalendarEvent,
} from "expo-calendar";

/**
 * 기기 캘린더 경계 — **`expo-calendar` 를 부르는 곳은 여기 하나다.**
 *
 * `notifications.ts`·`kakaoSdk.ts` 와 같은 자리다: 네이티브의 말을 우리 말로
 * 바꿔 준다. 캘린더는 앱의 본체가 아니라 회고 재료를 거드는 것이라, 여기서 난
 * 오류가 온보딩이나 홈을 멈추게 하면 안 된다 — **던지지 않는다**(`RULES.md` 4).
 *
 * ## 여기가 하는 것 / 하지 않는 것
 *
 * **한다**: 권한 · 달력 목록 · 범위 조회 · **어느 달력을 읽을지 판정**(플랫폼 신호).
 *
 * **하지 않는다**: 날짜별 펼치기 · 중복 접기 · `externalId` 생성 · 정렬.
 * 그건 플랫폼과 무관한 우리 규칙이라 `src/features/calendar/model/` 에 있다.
 * 여기서는 **기기 이벤트를 있는 그대로**(펼치기 전) 돌려준다.
 *
 * ## ⛔ 「못 읽었다」와 「0건이다」를 절대 같은 값으로 돌려주지 않는다
 *
 * 화해(reconcile)는 **보낸 목록에 없는 일정을 지운다.** 조회 실패를 빈 목록으로
 * 뭉개면 권한이 꺼진 순간 **서버의 3개월치가 통째로 지워진다** — 거기 붙은 감정·
 * 마침 기록까지 함께. 그래서 반환은 `{ ok }` 로 갈린다
 * (`docs/CALENDAR-PROBE.md` 「결정」 §10).
 *
 * ## 플랫폼별로 코드를 나누지 않는다 — 갈리는 것은 「의미」다
 *
 * 조회 함수는 두 OS 가 같다. 우리가 흡수해야 하는 차이는 셋이다:
 *
 * 1. **미리 알림(reminder)** — iOS 전용이고 쓰지 않는다. `EntityTypes.EVENT` 만 본다
 * 2. **분류 신호가 플랫폼마다 다르다** — `accessLevel`·`isVisible`·`isSynced` 는
 *    Android 만 준다. 없는 쪽에서는 **거르지 않는다**(아래 `isMine`)
 * 3. **04:00 하루 경계** — 새벽 2시 일정은 「어제」에 붙으므로 조회를 **앞뒤로
 *    하루씩 넓게** 잡는다. 접는 것은 부르는 쪽 몫이다
 *
 * `Platform.OS` 분기가 필요해지면 **이 파일 안에서만** 한다.
 */

/**
 * 기기에서 읽어 온 일정 하나 — **아직 펼치기 전의 원본이다.**
 *
 * 스키마 `Schedule` 이 아니고, 서버로 가는 모양도 아니다. 여러 날에 걸친
 * 일정이라면 여기서는 **여전히 하나**이고, 날짜별로 갈리는 것은
 * `expandCalendarEventByDate` 를 지난 뒤다.
 */
export type CalendarEvent = {
  /** 기기 이벤트 id. **반복 일정의 회차들이 이 값을 공유한다**(실측) */
  eventId: string;
  /** 어느 달력에서 왔나 — `externalId` 를 가르고 중복을 접는 데 쓴다. **서버로 가지 않는다** */
  calendarId: string;
  /** 다듬은 제목. 빈 것은 여기서 이미 빠졌다 */
  title: string;
  start: Date;
  /**
   * 끝. 값이 없으면 `null` 이고 부르는 쪽이 하루짜리로 본다.
   *
   * ⚠ 종일 일정은 Android 에서 다음 날 시작 시각(배타적), iOS 실기기에서 그날
   * 23:59:59로 왔다. 보정은 `expandCalendarEventByDate` 가 한다.
   */
  end: Date | null;
  allDay: boolean;
  /** 반복 시리즈의 회차가 원래 시작하던 시각. 수정·이동 뒤에도 회차 키를 지키는 데 쓴다 */
  originalStart: Date | null;
  /** iOS 에서 분리 회차를 원래 시리즈와 잇는 보조 신호. 서버로 보내지 않는다 */
  creationDate: Date | null;
  /** 반복 시리즈에서 따로 수정된 회차인가(iOS) */
  isDetached: boolean;
  /** 분리 회차가 속한 원본 반복 이벤트 id(Android) */
  originalId: string | null;
  /** 원본에 반복 규칙이 있는가. iOS 분리 회차의 부모 후보를 가릴 때만 쓴다 */
  recurring: boolean;
};

/**
 * 조회 결과. **실패와 0건이 갈린다** — 위 ⛔ 문단이 이 타입이 존재하는 이유다.
 *
 * `denied` 는 권한이 없는 것이고 `failed` 는 네이티브·인자 문제다. 부르는 쪽이
 * 둘을 다르게 다룰 일은 아직 없지만, 화해가 **어느 쪽이든 보내지 않는다**는 것만은
 * 같아야 한다.
 */
export type CalendarReadResult =
  { ok: true; events: CalendarEvent[] } | { ok: false; reason: "denied" | "failed" };

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

/** 문자열·Date 어느 쪽으로 와도 `Date` 로. 망가진 값은 `null` */
const toDate = (value: ExpoCalendarEvent["startDate"] | undefined): Date | null => {
  if (value == null) return null;
  const at = value instanceof Date ? value : new Date(value);
  return Number.isNaN(at.getTime()) ? null : at;
};

/**
 * 우리가 **쓸 수 없는** 접근 수준. 실측값은 소문자다(`"read"`·`"owner"`).
 * `CalendarAccessLevel` enum 을 값으로 들고 오지 않는 이유는, 네이티브가 주는 것이
 * 결국 이 문자열이고 enum 객체는 버전을 탄다.
 */
const UNWRITABLE_ACCESS = new Set(["read", "freebusy", "none"]);

/**
 * **내가 만든 일정이 들어 있는 달력인가** — 공휴일·구독·생일 달력을 여기서 뺀다.
 *
 * 2026-08-14 실측: 1년치 80건 중 46건(58%)이 공휴일 달력이었다. 그대로 두면
 * 홈에 「광복절」이 뜬다.
 *
 * ⚠ **블랙리스트다. 화이트리스트가 아니다.** 「이건 구독 달력이다」가 확실할 때만 뺀다.
 * 「이건 개인 달력이다」를 증명하려 들면 신호가 비는 플랫폼에서 **사용자 일정이 통째로
 * 사라진다** — 실제로 측정 중에 `source.type` 화이트리스트가 사용자 본인의
 * `Samsung Calendar`(`com.osp.app.signin`)를 날렸다.
 *
 * 그래서 아래는 전부 **「값이 있고, 그 값이 명확히 아니라고 말할 때만」** 뺀다.
 * 값이 없는 플랫폼(iOS 는 뒤의 셋이 없다)에서는 `undefined !== false` 라 그냥 통과한다.
 */
const isMine = (calendar: ExpoCalendar) => {
  // 기기에 실제로 내려받지 않은 달력 — 그 이벤트 조회는 동작이 정의돼 있지 않다(expo 문서)
  if (calendar.isSynced === false) return false;
  // 주 신호 · 두 OS 공통 — 내가 고칠 수 없는 달력이면 내가 적은 일정도 아니다
  if (calendar.allowsModifications === false) return false;
  // 같은 것을 다른 각도에서(Android). 실측에서는 위와 정확히 같은 6개를 잡았지만,
  // 한쪽이 비는 플랫폼이 있을 수 있으므로 둘 다 본다
  if (UNWRITABLE_ACCESS.has(String(calendar.accessLevel ?? "").toLowerCase())) return false;
  // 성격이 다른 신호 — 자동 판정이 아니라 **사용자가 캘린더 앱에서 이미 내린 결정**이다
  if (calendar.isVisible === false) return false;
  return true;
};

/**
 * 취소된 일정만 뺀다. **뒤집어서 「`confirmed` 만 남긴다」로 쓰면 안 된다** —
 * 실측에서 삼성·로컬 달력이 `status` 를 `null` 로 줬다(23건 중 14건). 뒤집으면
 * 사용자 본인 일정이 통째로 사라진다.
 */
const isCanceled = (event: ExpoCalendarEvent) =>
  String(event.status ?? "").toLowerCase() === "canceled";

/** `YYYY-MM-DD` 인가 — 망가진 인자가 조회에 들어가지 않게 막는다 */
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * 그 기간에 걸치는 기기 일정. **던지지 않는다** — 실패는 `{ ok: false }` 다.
 *
 * `from`·`to` 는 `YYYY-MM-DD` 다. 04:00 경계 때문에 실제 조회는 **앞뒤로 하루씩
 * 넓게** 잡는다 — 그러지 않으면 새벽 1시 일정(우리 기준 「어제」)이 빠진다.
 * 넓게 읽은 것을 창 안으로 접는 일은 `expandCalendarEventByDate` 가 한다.
 *
 * **여러 날에 걸친 일정은 여기서 여전히 하나다.**
 */
export async function readCalendarEvents(from: string, to: string): Promise<CalendarReadResult> {
  if (!isDate(from) || !isDate(to) || from > to) return { ok: false, reason: "failed" };

  const access = await getCalendarAccess();
  if (!access.granted) return { ok: false, reason: "denied" };

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, reason: "failed" };
  }
  start.setDate(start.getDate() - 1);
  end.setDate(end.getDate() + 1);

  try {
    const calendars = (await getCalendars(EntityTypes.EVENT)).filter(isMine);
    // 읽을 달력이 하나도 없는 것은 **실패가 아니다** — 전부 구독 달력인 기기가 있다
    if (calendars.length === 0) return { ok: true, events: [] };

    const raw = await listEvents(
      calendars.map((c) => c.id),
      start,
      end,
    );

    const events: CalendarEvent[] = [];
    for (const event of raw) {
      const title = typeof event.title === "string" ? event.title.trim() : "";
      // 제목 없는 일정은 회고에 쓸 실마리가 없다 — 홈에 빈 줄을 만들지 않는다
      if (title.length === 0) continue;
      if (isCanceled(event)) continue;

      const at = toDate(event.startDate);
      if (at == null) continue;

      events.push({
        eventId: String(event.id),
        calendarId: String(event.calendarId ?? ""),
        title,
        start: at,
        end: toDate(event.endDate),
        allDay: event.allDay === true,
        originalStart: toDate(event.originalStartDate),
        creationDate: toDate(event.creationDate),
        isDetached: event.isDetached === true,
        originalId:
          typeof event.originalId === "string" && event.originalId.length > 0
            ? event.originalId
            : null,
        recurring: event.recurrenceRule != null,
      });
    }
    return { ok: true, events };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
