/**
 * 캘린더 동기화의 말 — **세 겹으로 갈린다.**
 *
 * ```
 * CalendarEvent   기기가 준 것        (src/lib/calendar.ts)  「8/1~8/5 제주 여행」 하나
 *      ↓ expandCalendarEventByDate
 * Occurrence      날짜별로 편 것                              8/1 · 8/2 · 8/3 · 8/4 넷
 *      ↓ normalizeOccurrences
 * SyncEvent       서버로 가는 것                              같은 넷에서 `calendarId` 를 뗀 것
 * ```
 *
 * 겹을 나누는 이유는 **서버로 가는 것이 가장 좁아야** 하기 때문이다 —
 * `09.md` 안내 카드가 약속하는 것은 「일정 제목」뿐이라, 달력 이름·계정·id 가
 * 서버에 남으면 안내가 거짓이 된다(`CALENDAR-PROBE.md` 「결정」 §5).
 */

/** 동기화가 맞춰보는 기간. **삭제가 이 범위에 묶인다** — 밖은 손대지 않는다 */
export type SyncRange = {
  /** `YYYY-MM-DD` · 포함 */
  from: string;
  /** `YYYY-MM-DD` · 포함 */
  to: string;
};

/**
 * 날짜 하나에 놓인 일정 하나. **기기 이벤트 하나가 여기서는 여러 개가 될 수 있다.**
 *
 * `calendarId`·`eventId` 는 **접기와 검증에만 쓰고 서버로 가지 않는다**(위 주석).
 */
export type Occurrence = {
  /** 이 회차의 키. `makeExternalId` 가 만든 불투명 문자열 */
  externalId: string;
  /** `YYYY-MM-DD` · 04:00 경계로 접은 **사용자 로컬** 날짜 */
  date: string;
  title: string;
  /** 서로 다른 달력이 같은 일정을 들고 있는지 가리는 데 쓴다 */
  calendarId: string;
  /** 원본 기기 이벤트와 이어 보기 위한 값 — 디버깅·검증용 */
  eventId: string;
};

/** 서버로 가는 모양 — **이 셋이 전부다** */
export type SyncEvent = {
  externalId: string;
  date: string;
  title: string;
};

/**
 * 한 번의 화해가 다루는 전부. **`range` 와 `hash` 는 한 몸이다** —
 * 창이 달마다 밀리므로 해시만 비교하면 「범위가 바뀐 것」과 「내용이 바뀐 것」을
 * 구별할 수 없다(`CALENDAR-PROBE.md` 「결정」 §9 · 요청 §9).
 */
export type CalendarSnapshot = {
  range: SyncRange;
  events: SyncEvent[];
  hash: string;
};

/**
 * 기기에 눕는 동기화 상태. **서버 화해가 성공한 뒤에만** 갱신된다 —
 * 먼저 저장하면 전송이 실패했는데 다음 실행이 「같으니 건너뛴다」로 읽는다.
 */
export type CalendarSyncState = {
  range: SyncRange;
  hash: string;
  /** ISO 8601. **변경 판단에 쓰지 않는다** — 디버깅·상태 확인용이다 */
  lastSyncAt: string;
};
