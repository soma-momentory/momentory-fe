import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 회고 채팅 API 경계 — `POST /api/v1/retrospect`(시작) · `POST …/{id}/messages`(턴).
 *
 * **대화는 서버가 주도한다.** 클라이언트는 `Reply` 의 *형태* 를 보고 무엇을 그릴지
 * 정하고(텍스트·선택지·슬라이더), 그 턴에 맞는 값 하나만 되돌려보낸다. 흐름·문안·
 * 방향·일기는 전부 서버가 만든다 — 그래서 옛 `FOLLOW_UPS`·`DRAFT_DEMO` 하드코딩이
 * 여기로 대체됐다.
 *
 * **phase 가 아니라 형태로 분기한다.** 같은 `script` phase 에서도 텍스트 질문·선택지·
 * 측정이 번갈아 나온다 — `options` 가 있으면 선택, `ui==="measure"` 면 슬라이더,
 * `done` 이면 종료다.
 *
 * 서버 응답을 **런타임에 검사한다**(`toReply`) — `fetch` 는 형태를 보장하지 않고,
 * 대충 단언하면 필드가 빠진 200 이 그대로 화면에 오른다.
 */

/**
 * 선택지 하나. `id` 는 1-base 번호 문자열 — 턴 요청의 `optionId` 로 돌려보낸다.
 *
 * `hint` 는 화면 배지용 맥락 한 줄(예: "지난 비슷한 상황에서 정한 행동"). `input` 이 true 면
 * "직접 입력" 옵션이라, 고르면 텍스트 필드를 열고 `optionId` 대신 `content` 로 돌려보낸다.
 */
export type ReplyOption = {
  id: string;
  label: string;
  description: string | null;
  hint: string | null;
  input: boolean;
};

/** 슬라이더 하나. `id` 는 measure 필드 키 — 턴 요청 `measures` 의 키로 돌려보낸다 */
export type ReplyMeasure = { id: string; label: string; min: number; max: number };

/**
 * 행동 카드 — 방향에 따라 없을 수 있다(짧은 기록형 등).
 *
 * `actionCardId` 는 완료 턴이 서버에 방금 저장한 카드의 id(문자열 · 일기 `diaryId` 와 같은 결).
 * 이 값을 store 에 넣어 두면 다음 조회를 기다리지 않고 그 id 로 「해봤어요」·느낀 점·삭제를
 * 곧바로 서버에 보낼 수 있다. 서버가 안 주면(옛 서버 등) `null`.
 */
export type ReplyActionCard = {
  actionCardId: string | null;
  situation: string;
  action: string;
  detail: string | null;
  createdDate: string | null;
};

/**
 * 일기 — 짧은 기록형은 `reframedDiary` 가 없어 한 면만 그린다.
 *
 * `diaryId` 는 완료 턴이 서버에 방금 저장한 일기의 id(문자열). 이 값을 그대로 store 에 넣어
 * 두면 다음 조회를 기다리지 않고 그 id 로 삭제할 수 있다. 서버가 안 주면(옛 서버 등) `null`.
 */
export type ReplyDiary = { diaryId: string | null; diary: string; reframedDiary: string | null };

/** 한 턴의 서버 응답. 프론트는 이걸 보고 무엇을 그릴지 정한다 */
export type Reply = {
  text: string | null;
  phase: string;
  options: ReplyOption[] | null;
  /** `"measure"` 면 슬라이더를 띄운다 */
  ui: string | null;
  measures: ReplyMeasure[] | null;
  actionCard: ReplyActionCard | null;
  diary: ReplyDiary | null;
  /** 대화가 끝났다 — `diary` 가 있으면 정상 종료, 없으면 안전 중단(`phase==="ended"`) */
  done: boolean;
  safetyLevel: string | null;
};

/** `ui` 값 — 슬라이더를 띄워야 한다는 신호 */
export const UI_MEASURE = "measure";
/** 안전 중단으로 끝난 phase */
export const PHASE_ENDED = "ended";

export type StartScheduleItem = { name: string; emotion: string };

export type StartInput = {
  /** 오늘의 일정(각 감정 태그 포함). 비우면 현재 감정 하나로 '오늘 하루'를 돌아본다 */
  schedules: StartScheduleItem[];
  /** 현재 감정 키(9종). 필수 */
  currentEmotion: string;
  nickname?: string | null;
  interest?: string | null;
};

export type StartResponse = { sessionId: number; reply: Reply };

/** 셋 중 그 턴에 맞는 하나만 채워 보낸다 */
export type TurnInput = {
  content?: string;
  optionId?: string;
  /** 측정 턴에서만. 슬라이더 id → 0~10 값 */
  measures?: Record<string, number>;
};

/**
 * 실패 사유 — **코드**다. 화면 문구는 store 가 정한다(같은 실패에 두 문구가 생기지 않게).
 */
export type RetroFailureCode =
  /** 400 — 우리가 잘못 보냈다(감정 키 오류 등) */
  | "invalid_request"
  /** 409 — 오늘 이미 회고를 마쳤다(하루 한 번 가드) */
  | "already_today"
  /** 404 — 세션이 없거나 남의 것 */
  | "session_not_found"
  /** 401 · 토큰 없음 — 세션 만료 */
  | "unauthenticated"
  /** 요청이 서버에 닿지 못했다 */
  | "network"
  /** 5xx · 알 수 없는 상태 */
  | "server"
  /** 200 인데 형태가 계약과 다르다 */
  | "malformed"
  /** API 주소가 설정되지 않았다 */
  | "unconfigured";

export type RetroResult<T> = { ok: true; data: T } | { ok: false; code: RetroFailureCode };

const RETROSPECT_PATH = "/api/v1/retrospect";

/** 서버가 본문에 실어 주는 오류 코드 → 우리 사유. 상태 코드보다 이쪽이 정확하다 */
const BODY_CODES: Record<string, RetroFailureCode> = {
  INVALID_REQUEST: "invalid_request",
  ALREADY_RETROSPECTED_TODAY: "already_today",
  RETROSPECT_SESSION_NOT_FOUND: "session_not_found",
  AUTHENTICATION_REQUIRED: "unauthenticated",
};

const readBodyCode = (body: unknown): RetroFailureCode | null => {
  if (typeof body !== "object" || body === null) return null;
  const { code } = body as { code?: unknown };
  return typeof code === "string" ? (BODY_CODES[code] ?? null) : null;
};

/**
 * http 계층 오류 → 회고 사유. 본문 코드가 있으면 그것을, 없으면 상태 코드로 접는다.
 *
 * `notFound` 는 **본문 코드 없는 404 를 무엇으로 볼 것인가**다 — 요청마다 다르기
 * 때문에 밖에서 받는다. 세션을 지목한 요청(`sendTurn`)의 404 는 정말 그 세션이
 * 없는 것이지만, **시작 요청에는 지목할 세션이 없다** — 거기서 온 404 는 세션이
 * 아니라 서버 쪽 문제(엔드포인트 부재·경로 오타)다. 그걸 `session_not_found` 로
 * 접으면 「처음부터 다시 시작해 주세요」라고 안내해 놓고 다시 시작해도 같은 자리에
 * 서게 된다 — 사용자가 할 수 있는 일이 없는데 할 일을 시키는 문구가 된다.
 */
const mapError = (error: HttpError, notFound: RetroFailureCode): RetroFailureCode => {
  switch (error.code) {
    case "unconfigured":
      return "unconfigured";
    case "unauthenticated":
      return "unauthenticated";
    case "network":
      return "network";
    case "malformed":
      return "malformed";
    case "http": {
      const fromBody = readBodyCode(error.body);
      if (fromBody != null) return fromBody;
      if (error.status === 400) return "invalid_request";
      if (error.status === 401) return "unauthenticated";
      if (error.status === 404) return notFound;
      return "server";
    }
  }
};

// ── 런타임 검증 ──────────────────────────────────────────────────────────

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const asString = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** 서버 `Long` id → 문자열. 숫자·비어 있지 않은 문자열만 받고 나머지는 `null` */
const asId = (v: unknown): string | null => {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.length > 0) return v;
  return null;
};

const toOptions = (v: unknown): ReplyOption[] | null => {
  if (!Array.isArray(v)) return null;
  const out: ReplyOption[] = [];
  for (const item of v) {
    if (!isObject(item)) return null;
    const id = asString(item.id);
    const label = asString(item.label);
    if (id == null || label == null) return null;
    out.push({
      id,
      label,
      description: asString(item.description),
      hint: asString(item.hint),
      // 서버는 "직접 입력" 옵션에만 input:true 를 싣는다(NON_NULL) — 없으면 보통 옵션
      input: item.input === true,
    });
  }
  return out;
};

const toMeasures = (v: unknown): ReplyMeasure[] | null => {
  if (!Array.isArray(v)) return null;
  const out: ReplyMeasure[] = [];
  for (const item of v) {
    if (!isObject(item)) return null;
    const id = asString(item.id);
    const label = asString(item.label);
    if (id == null || label == null) return null;
    if (typeof item.min !== "number" || typeof item.max !== "number") return null;
    out.push({ id, label, min: item.min, max: item.max });
  }
  return out;
};

const toActionCard = (v: unknown): ReplyActionCard | null => {
  if (!isObject(v)) return null;
  const situation = asString(v.situation);
  const action = asString(v.action);
  if (situation == null || action == null) return null;
  return {
    actionCardId: asId(v.actionCardId),
    situation,
    action,
    detail: asString(v.detail),
    createdDate: asString(v.createdDate),
  };
};

const toDiary = (v: unknown): ReplyDiary | null => {
  if (!isObject(v)) return null;
  const diary = asString(v.diary);
  if (diary == null) return null;
  return { diaryId: asId(v.diaryId), diary, reframedDiary: asString(v.reframedDiary) };
};

/**
 * 서버 응답 하나를 `Reply` 로 옮긴다 — **필수(phase·done)가 어긋나면 `null`**.
 * 서버가 `@JsonInclude(NON_NULL)` 이라 없는 필드는 아예 오지 않는다 — 그래서
 * 나머지는 있으면 검사하고 없으면 `null` 로 둔다.
 */
export const toReply = (v: unknown): Reply | null => {
  if (!isObject(v)) return null;
  const phase = asString(v.phase);
  if (phase == null) return null;
  if (typeof v.done !== "boolean") return null;

  // 있는데 형태가 어긋난 것은 받지 않는다 — 없는 것(undefined)과 구분한다
  const options = v.options === undefined ? null : toOptions(v.options);
  if (v.options !== undefined && options == null) return null;
  const measures = v.measures === undefined ? null : toMeasures(v.measures);
  if (v.measures !== undefined && measures == null) return null;
  const actionCard = v.actionCard === undefined ? null : toActionCard(v.actionCard);
  if (v.actionCard !== undefined && actionCard == null) return null;
  const diary = v.diary === undefined ? null : toDiary(v.diary);
  if (v.diary !== undefined && diary == null) return null;

  return {
    text: asString(v.text),
    phase,
    options,
    ui: asString(v.ui),
    measures,
    actionCard,
    diary,
    done: v.done,
    safetyLevel: asString(v.safetyLevel),
  };
};

// ── 호출 ────────────────────────────────────────────────────────────────

/**
 * 회고 턴 타임아웃 — 서버가 Gemini 를 부르고 오므로 기본 조회(25초)보다 길게 잡는다.
 * 로컬·혼잡 시 한 턴이 25초를 넘겨 "연결이 불안정" 으로 끊기던 것을 늘려 흡수한다.
 * 무한 대기는 입력칸이 영영 잠기는 것과 같아 상한은 둔다.
 */
const RETRO_TIMEOUT_MS = 45_000;

/** 회고 세션을 만들고 첫 응답을 받는다 */
export async function startRetro(
  input: StartInput,
  options?: { signal?: AbortSignal },
): Promise<RetroResult<StartResponse>> {
  const result = await authedRequest<unknown>("POST", RETROSPECT_PATH, input, {
    ...options,
    timeoutMs: RETRO_TIMEOUT_MS,
  });
  // 아직 세션이 없다 — 여기서의 404 는 서버가 이 길을 열어두지 않았다는 뜻이다
  if (!result.ok) return { ok: false, code: mapError(result.error, "server") };

  if (!isObject(result.data)) return { ok: false, code: "malformed" };
  const sessionId = result.data.sessionId;
  const reply = toReply(result.data.reply);
  if (typeof sessionId !== "number" || reply == null) return { ok: false, code: "malformed" };
  return { ok: true, data: { sessionId, reply } };
}

/** 한 턴을 진행하고 다음 응답을 받는다 */
export async function sendTurn(
  sessionId: number,
  input: TurnInput,
  options?: { signal?: AbortSignal },
): Promise<RetroResult<Reply>> {
  const result = await authedRequest<unknown>(
    "POST",
    `${RETROSPECT_PATH}/${sessionId}/messages`,
    input,
    { ...options, timeoutMs: RETRO_TIMEOUT_MS },
  );
  if (!result.ok) return { ok: false, code: mapError(result.error, "session_not_found") };

  const reply = toReply(result.data);
  if (reply == null) return { ok: false, code: "malformed" };
  return { ok: true, data: reply };
}
