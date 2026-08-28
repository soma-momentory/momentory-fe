import type { EmotionId } from "@/features/emotion/model/emotion";
import type { Schedule } from "@/features/home/model/types";
import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 오늘 일정 — `/api/v1/schedules` 다섯 갈래 (`docs/api/openapi.json`).
 *
 * ```
 * GET    /api/v1/schedules?date=YYYY-MM-DD   200 { schedules: [ScheduleResponse] }
 * POST   /api/v1/schedules                   201 ScheduleResponse   { date, title }
 * DELETE /api/v1/schedules/{id}              204
 * PUT    /api/v1/schedules/{id}/completion   200 { scheduleId, completed, emotion }
 * ```
 *
 * ```
 * PATCH  /api/v1/schedules/order            200   { date, scheduleIds }
 * ```
 *
 * ```
 * PATCH  /api/v1/schedules/{id}             200 ScheduleResponse   { date, title }
 * ```
 *
 * **계약을 다 쓴다** — 순서(`/order`)는 끌기 손잡이(`PLAN.md` D10)가, 제목 수정은
 * 하단 입력 바의 편집 모드(D11)가 부른다. 둘 다 2026-08-14 에 붙었다.
 *
 * **화면은 서버 모양을 보지 않는다.** 여기서 스키마 `Schedule`(`model/types.ts`)로
 * 옮기고, 어긋나는 자리는 아래에 전부 적었다 — 나중에 계약이 바뀌면 고칠 곳이
 * 이 파일 하나다.
 *
 * ## 서버와 화면 모양이 다른 것
 *
 * | 스키마 필드  | 서버 | 여기서                                              |
 * | ------------ | ---- | --------------------------------------------------- |
 * | `source`     | 대문자 enum | 화면의 소문자 enum 으로 바꾼다              |
 * | `externalId` | 없다        | 화면에서 원본 id를 쓰지 않아 `null`로 둔다   |
 * | `hidden`     | boolean     | 그대로 옮긴다                                |
 * | `doneAt`     | 없다 | 항상 `null` — 마친 **시각**을 서버가 돌려주지 않는다 |
 *
 * `time` 은 MVP 가 항상 `null` 이라 어긋남이 아니다(`12-e` 에 시간 입력이 없다).
 *
 * ## 감정은 배열이 아니라 하나다
 *
 * 스키마는 `emotions: int[]`(0~2개 권장, 상한 없음)인데 서버는 `emotion` 하나에
 * nullable 이다. **타입은 배열로 두고 실제로 0~1개만 담는다** — 서버가 배열을
 * 받게 되면 화면이 아니라 이 파일과 store 만 바뀐다.
 * 기록: `docs/PRODUCT.md` 「상류와 차이」.
 */
export const SCHEDULES_PATH = "/api/v1/schedules";

/** 짧은 조회·쓰기다. LLM 턴 기준(25초)을 쓰면 실패한 요청이 그만큼 화면을 잡는다 */
export const SCHEDULES_TIMEOUT_MS = 8_000;

/**
 * 감정 id(1~10) → 일정 API 의 감정 코드 (채팅흐름_v2 긍정→부정 재번호).
 *
 * ⚠ **회고의 `EMOTION_KEYS` 와 다르다.** 서버 안에 감정 enum 이 두 벌 있고
 * (`retrospect/Emotion` 소문자 키 · `schedule/ScheduleEmotion` 대문자 enum) 이름이 갈린다.
 * ⚠ **스케줄 enum 은 아직 `화남·답답함`을 합친 `ANGRY_FRUSTRATED` 한 값이다**(BE 스케줄 감정은
 * 미분리). 그래서 v2 로 분리한 화남(9)·답답함(10)을 **둘 다 `ANGRY_FRUSTRATED` 로 보낸다**. 되돌릴
 * 때는 대표로 화남(9)으로 매핑한다(아래 override). 스케줄 감정 분리는 별도 후속 작업.
 */
export const SCHEDULE_EMOTIONS: Record<EmotionId, string> = {
  1: "HAPPY",
  2: "PROUD",
  3: "CALM",
  4: "TIRED",
  5: "STUCK",
  6: "LETHARGIC",
  7: "ANXIOUS",
  8: "DEPRESSED",
  9: "ANGRY_FRUSTRATED",
  10: "ANGRY_FRUSTRATED",
};

const EMOTION_IDS: Record<string, EmotionId> = Object.fromEntries(
  Object.entries(SCHEDULE_EMOTIONS).map(([id, code]) => [code, Number(id) as EmotionId]),
);
// 화남(9)·답답함(10)이 같은 코드라 반전 시 충돌한다 — 대표를 화남(9)으로 확정한다.
EMOTION_IDS.ANGRY_FRUSTRATED = 9;

/** 실패 사유 — **코드**다. 화면 문구는 여기서 만들지 않는다 */
export type ScheduleFailureCode =
  /** 401 — 서버가 이 토큰을 거부했다 */
  | "unauthorized"
  /** 보낼 토큰이 없어 요청하지 않았다 (갱신 일시 실패가 여기 섞인다) */
  | "no_session"
  /** 404 — 서버에 없는 일정이다. 다른 기기에서 지웠을 수 있다 */
  | "not_found"
  | "network"
  | "server"
  | "malformed"
  | "unconfigured";

export type ScheduleResult<T> = { ok: true; data: T } | { ok: false; code: ScheduleFailureCode };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const mapError = (error: HttpError): ScheduleFailureCode => {
  switch (error.code) {
    case "unconfigured":
      return "unconfigured";
    case "unauthenticated":
      // 보내지 않았다 — 401 과 다르다(`meApi.ts`·`optionsApi.ts` 의 같은 구분)
      return "no_session";
    case "network":
      return "network";
    case "malformed":
      return "malformed";
    case "http":
      if (error.status === 401) return "unauthorized";
      if (error.status === 404) return "not_found";
      return "server";
  }
};

// ── 런타임 검증 ──────────────────────────────────────────────────────────

const asText = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

/** 서버 감정 코드 → id. 모르는 코드는 **버린다** — 이름을 지어내지 않는다 */
const toEmotions = (v: unknown): EmotionId[] => {
  if (typeof v !== "string") return [];
  const id = EMOTION_IDS[v];
  return id == null ? [] : [id];
};

const toSource = (v: unknown): Schedule["source"] | null => {
  if (v === "MANUAL") return "manual";
  if (v === "CALENDAR") return "calendar";
  return null;
};

/**
 * `ScheduleResponse` → 스키마 `Schedule`. **id 는 문자열로 바꾼다** — 스키마가
 * 그렇고, 아웃박스가 붙으면 클라이언트가 만드는 ULID 가 이 자리에 온다.
 * 어긋난 항목은 `null` 이고, 목록에서는 그 줄만 버린다.
 */
export const toSchedule = (v: unknown): Schedule | null => {
  if (!isObject(v)) return null;
  const { id, date, title } = v;
  if (typeof id !== "number" && typeof id !== "string") return null;
  const day = asText(date);
  const name = asText(title);
  const source = toSource(v.source);
  if (day == null || name == null || source == null || typeof v.hidden !== "boolean") return null;

  return {
    id: String(id),
    date: day,
    title: name,
    time: null,
    source,
    externalId: null,
    done: v.completed === true,
    doneAt: null,
    emotions: toEmotions(v.emotion),
    hidden: v.hidden,
  };
};

/**
 * 목록. **서버가 `displayOrder` 순으로 준다**(`ScheduleService` 의 `OrderBy`)
 * 므로 여기서 다시 정렬하지 않는다 — 배열 순서가 곧 화면 순서다.
 * 어긋난 줄은 버리고 나머지를 살린다.
 */
const toSchedules = (v: unknown): Schedule[] | null => {
  if (!isObject(v) || !Array.isArray(v.schedules)) return null;
  return v.schedules.map(toSchedule).filter((s): s is Schedule => s != null);
};

// ── 호출 ────────────────────────────────────────────────────────────────

const call = async <T>(
  method: "GET" | "POST" | "PUT" | "PATCH",
  path: string,
  body: unknown,
  parse: (v: unknown) => T | null,
): Promise<ScheduleResult<T>> => {
  const result = await authedRequest<unknown>(method, path, body, {
    timeoutMs: SCHEDULES_TIMEOUT_MS,
  });
  if (!result.ok) return { ok: false, code: mapError(result.error) };
  const data = parse(result.data);
  return data == null ? { ok: false, code: "malformed" } : { ok: true, data };
};

/** 그날의 일정 전부. **던지지 않는다** */
export const fetchSchedules = (date: string): Promise<ScheduleResult<Schedule[]>> =>
  call("GET", `${SCHEDULES_PATH}?date=${encodeURIComponent(date)}`, undefined, toSchedules);

/**
 * 기간 조회 — 보관함이 한 달을 통째로 받는다(`GET /schedules/period?from&to`).
 * 하루치(`fetchSchedules`)와 **같은 `{ schedules }` 모양**이라 `toSchedules` 를
 * 그대로 쓴다. **던지지 않는다** — 실패는 부르는 쪽이 빈 목록으로 흡수한다.
 */
export const fetchSchedulesInPeriod = (
  from: string,
  to: string,
): Promise<ScheduleResult<Schedule[]>> =>
  call(
    "GET",
    `${SCHEDULES_PATH}/period?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    undefined,
    toSchedules,
  );

/** `12-e` 직접 추가 — **제목 하나만** 보낸다. 서버가 순서를 끝에 붙여 돌려준다 */
export const createSchedule = (date: string, title: string): Promise<ScheduleResult<Schedule>> =>
  call("POST", SCHEDULES_PATH, { date, title }, toSchedule);

/**
 * `12-c` 「이 일정 삭제」. **돌려받을 것이 없다**(`204`) — 그래서 본문을 보지
 * 않는다. `call` 은 `null` 을 「모양이 어긋났다」로 읽으므로 여기만 따로 닫는다.
 */
export const deleteSchedule = async (id: string): Promise<ScheduleResult<true>> => {
  const result = await authedRequest<unknown>(
    "DELETE",
    `${SCHEDULES_PATH}/${encodeURIComponent(id)}`,
    undefined,
    { timeoutMs: SCHEDULES_TIMEOUT_MS },
  );
  return result.ok ? { ok: true, data: true } : { ok: false, code: mapError(result.error) };
};

/** 가져온 일정은 캘린더 원본을 지우지 않고 Momentory 홈에서만 감춘다. */
export const patchScheduleVisibility = (
  id: string,
  hidden: boolean,
): Promise<ScheduleResult<true>> =>
  call("PATCH", `${SCHEDULES_PATH}/${encodeURIComponent(id)}/visibility`, { hidden }, () => true);

/**
 * 제목 수정 — `12-c` 편집 모드. **날짜도 함께 보낸다**(`ScheduleRequest` 가 둘 다
 * 필수). 날짜는 그날 그대로라 옮기는 뜻이 아니다.
 */
export const patchScheduleTitle = (
  id: string,
  date: string,
  title: string,
): Promise<ScheduleResult<Schedule>> =>
  call("PATCH", `${SCHEDULES_PATH}/${encodeURIComponent(id)}`, { date, title }, toSchedule);

/**
 * 순서. **그날의 id 를 원하는 차례대로 통째로 보낸다**(`ScheduleOrderRequest`) —
 * 「몇 번째로 옮겼다」가 아니라 결과 목록이라, 두 번 눌러도 마지막 것이 이긴다.
 *
 * ⚠ **서버 id 는 정수다.** 방금 만들어 아직 서버 id 를 못 받은 줄(임시 id)이
 * 섞여 있으면 보낼 수 없다 — 호출부가 그때는 부르지 않는다(`day.ts` `moveSchedule`).
 */
export const patchScheduleOrder = (
  date: string,
  scheduleIds: number[],
): Promise<ScheduleResult<true>> =>
  call("PATCH", `${SCHEDULES_PATH}/order`, { date, scheduleIds }, () => true);

/**
 * 마침·감정. **서버가 둘을 묶어 놨다** — `completed=false` 인데 감정을 보내면
 * 400 이고, 마침을 끄면 서버가 감정을 지운다(`Schedule.changeCompletion`).
 * 그 규칙을 store 가 지키고 여기서는 보낼 수 있는 모양만 만든다.
 */
export const putCompletion = (
  id: string,
  completed: boolean,
  emotion: EmotionId | null,
): Promise<ScheduleResult<{ completed: boolean; emotions: EmotionId[] }>> =>
  call(
    "PUT",
    `${SCHEDULES_PATH}/${encodeURIComponent(id)}/completion`,
    { completed, emotion: completed && emotion != null ? SCHEDULE_EMOTIONS[emotion] : null },
    (v) =>
      isObject(v) && typeof v.completed === "boolean"
        ? { completed: v.completed, emotions: toEmotions(v.emotion) }
        : null,
  );
