import { captureAnalytics } from "@/features/analytics";
import type { Track } from "@/features/analytics/client";
import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 회고 채팅 API 경계 (채팅흐름_v2) — `POST /api/v1/retrospect`(시작) · `POST …/{id}/messages`(턴).
 *
 * **대화는 서버가 주도한다.** 클라이언트는 `Reply` 의 *형태* 를 보고 무엇을 그릴지 정하고(자유 입력·
 * 선택지), 그 턴에 맞는 값을 되돌려보낸다(자유 텍스트 또는 선택지 번호들). 흐름·문안·일기·바람 카드는
 * 전부 서버가 만든다.
 *
 * v2: 시작 시 감정을 고르지 않는다(일기 작성부터). 슬라이더가 없어졌고, 행동 카드가 바람 카드로 바뀌었다.
 * 감정·바람은 최대 2개 선택이라 턴 요청은 `optionIds`(복수)로 보낸다.
 *
 * 서버 응답을 **런타임에 검사한다**(`toReply`).
 */

/**
 * 선택지 하나. `id` 는 1-base 번호 문자열 — 턴 요청의 `optionIds` 로 돌려보낸다. `input` 이 true 면
 * "직접 적기" 선지라, 고르면 텍스트 필드를 열고 `content` 로 돌려보낸다.
 */
export type ReplyOption = {
  id: string;
  label: string;
  description: string | null;
  hint: string | null;
  input: boolean;
};

/** 바람(욕구) 하나 — 단어 + 뜻(고정 목록 밖 직접 적기면 뜻 없음). */
export type ReplyNeed = { word: string; meaning: string | null };

/**
 * 바람 카드 — 감정 탐색을 거친 경우에만 온다(결정 ①로 기존 행동 카드 대체).
 *
 * `wishCardId` 는 완료 턴이 서버에 방금 저장한 카드의 id(문자열). store 에 넣어 두면 그 id 로
 * 「해봤어요」·느낀 점·삭제를 곧바로 보낼 수 있다. 비운 항목(모르겠어요·여기까지)은 null/빈 목록.
 */
export type ReplyWishCard = {
  wishCardId: string | null;
  situation: string;
  /** 확인된 감정 키(최대 2). 이름은 `features/emotion` 이 매핑한다 */
  emotions: string[];
  needs: ReplyNeed[];
  desiredState: string | null;
  smallAction: string | null;
  /** "uncomfortable" | "positive" — 항목 라벨 분기 */
  sentiment: string | null;
};

/**
 * 일기 — `diaryId` 는 완료 턴이 서버에 방금 저장한 일기의 id(문자열). store 에 넣어 두면 그 id 로
 * 삭제할 수 있다. 서버가 안 주면 `null`.
 */
export type ReplyDiary = {
  diaryId: string | null;
  diary: string;
  reframedDiary: string | null;
  /** 일기에서 드러난 감정 태그 키 — 저장 직후에도 화면이 바로 감정을 보여주게 함께 온다 */
  emotions: string[];
};

/** 한 턴의 서버 응답. 프론트는 이걸 보고 무엇을 그릴지 정한다 */
export type Reply = {
  text: string | null;
  phase: string;
  options: ReplyOption[] | null;
  wishCard: ReplyWishCard | null;
  diary: ReplyDiary | null;
  /**
   * 대화가 끝났다 — `phase==="complete"` 정상 종료, `phase==="ended"` 어뷰징 종료.
   * ⚠ 위기 안내(`safety_hold`)는 끝이 아니다(`done===false`) — 「이어서 얘기하기」로 잇는다.
   */
  done: boolean;
  safetyLevel: string | null;
};

/** phase 값 — 화면 분기용 */
export const PHASE_DIARY_CHAT = "diary_chat";
export const PHASE_EMOTION_EXPLORATION = "emotion_exploration";
export const PHASE_COMPLETE = "complete";
/** 어뷰징 종료 phase — 되돌릴 수 없다(나가는 길만) */
export const PHASE_ENDED = "ended";
/** 위기 안내 후 멈춘 phase — 「이어서 얘기하기」로 이어갈 수 있다(종결 아님) */
export const PHASE_SAFETY_HOLD = "safety_hold";

/**
 * 오늘의 일정 하나. 감정은 붙이지 않는다 — 채팅흐름_v2 는 대화로 알아간다.
 *
 * `id` 와 `completed` 는 서버가 쓴다:
 * - `id` — 회고가 만든 토픽을 그 일정에 잇는다(없으면 자유 텍스트로만 남아 집계가 끊긴다).
 *   목록에서 온 일정에만 있다. 서버가 소유권을 검증하므로 남의 id 는 무시된다.
 * - `completed` — 서버가 1턴 소재를 고를 때 **끝난 일을 먼저** 본다. 아직 안 한 일은 돌아볼
 *   거리가 없다. v2 는 마침에 감정을 묻지 않으므로 감정으로는 알 수 없어 따로 싣는다.
 */
export type StartScheduleItem = { name: string; id?: number; completed?: boolean };

export type StartInput = {
  /** 오늘의 일정. 비우면 '오늘 하루'를 돌아본다. 서버가 이 중 개인화 소재 하나를 고른다 */
  schedules: StartScheduleItem[];
  nickname?: string | null;
  interest?: string | null;
};

export type StartResponse = { sessionId: number; reply: Reply };

/** 이어서 할 회고의 지난 말 한 줄. 바바의 말에서 선택지 줄은 서버가 빼고 준다 */
export type ResumeMessage = { role: "assistant" | "user"; text: string };

/** 오늘 진행 중인 회고 — 지금까지의 대화와 마지막으로 받은 응답 */
export type CurrentRetro = { sessionId: number; messages: ResumeMessage[]; reply: Reply };

/** 자유 텍스트이거나 선택지 번호들(감정·바람 최대 2개). */
export type TurnInput = {
  content?: string;
  optionIds?: string[];
};

/**
 * 실패 사유 — **코드**다. 화면 문구는 store 가 정한다(같은 실패에 두 문구가 생기지 않게).
 */
export type RetroFailureCode =
  /** 400 — 우리가 잘못 보냈다 */
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
 * `notFound` 는 본문 코드 없는 404 를 무엇으로 볼 것인가다(요청마다 달라 밖에서 받는다).
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

const toStringArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === "string") out.push(item);
  }
  return out;
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
      input: item.input === true,
    });
  }
  return out;
};

const toNeeds = (v: unknown): ReplyNeed[] => {
  if (!Array.isArray(v)) return [];
  const out: ReplyNeed[] = [];
  for (const item of v) {
    if (!isObject(item)) continue;
    const word = asString(item.word);
    if (word == null) continue;
    out.push({ word, meaning: asString(item.meaning) });
  }
  return out;
};

const toWishCard = (v: unknown): ReplyWishCard | null => {
  if (!isObject(v)) return null;
  const situation = asString(v.situation);
  if (situation == null) return null;
  return {
    wishCardId: asId(v.wishCardId),
    situation,
    emotions: toStringArray(v.emotions),
    needs: toNeeds(v.needs),
    desiredState: asString(v.desiredState),
    smallAction: asString(v.smallAction),
    sentiment: asString(v.sentiment),
  };
};

const toDiary = (v: unknown): ReplyDiary | null => {
  if (!isObject(v)) return null;
  const diary = asString(v.diary);
  if (diary == null) return null;
  const emotions = Array.isArray(v.emotions)
    ? v.emotions.filter((e): e is string => typeof e === "string")
    : [];
  return { diaryId: asId(v.diaryId), diary, reframedDiary: asString(v.reframedDiary), emotions };
};

/**
 * 서버 응답 하나를 `Reply` 로 옮긴다 — **필수(phase·done)가 어긋나면 `null`**. 서버가
 * `@JsonInclude(NON_NULL)` 이라 없는 필드는 아예 오지 않는다.
 */
export const toReply = (v: unknown): Reply | null => {
  if (!isObject(v)) return null;
  const phase = asString(v.phase);
  if (phase == null) return null;
  if (typeof v.done !== "boolean") return null;

  const options = v.options === undefined ? null : toOptions(v.options);
  if (v.options !== undefined && options == null) return null;
  const wishCard = v.wishCard === undefined ? null : toWishCard(v.wishCard);
  if (v.wishCard !== undefined && wishCard == null) return null;
  const diary = v.diary === undefined ? null : toDiary(v.diary);
  if (v.diary !== undefined && diary == null) return null;

  return {
    text: asString(v.text),
    phase,
    options,
    wishCard,
    diary,
    done: v.done,
    safetyLevel: asString(v.safetyLevel),
  };
};

const toMessages = (v: unknown): ResumeMessage[] | null => {
  if (!Array.isArray(v)) return null;
  const out: ResumeMessage[] = [];
  for (const item of v) {
    if (!isObject(item)) return null;
    const text = asString(item.text);
    if ((item.role !== "assistant" && item.role !== "user") || text == null) return null;
    out.push({ role: item.role, text });
  }
  return out;
};

// ── 호출 ────────────────────────────────────────────────────────────────

/**
 * 회고 턴 타임아웃 — 서버가 Gemini 를 부르고 오므로 기본 조회(25초)보다 길게 잡는다.
 */
const RETRO_TIMEOUT_MS = 45_000;

/** 회고 세션을 만들고 첫 응답을 받는다 */
export async function startRetro(
  input: StartInput,
  options?: { signal?: AbortSignal },
): Promise<RetroResult<StartResponse>> {
  const record = captureAnalytics();
  const result = await authedRequest<unknown>("POST", RETROSPECT_PATH, input, {
    ...options,
    timeoutMs: RETRO_TIMEOUT_MS,
  });
  if (!result.ok) return trackedFailure(record, "start", mapError(result.error, "server"));

  if (!isObject(result.data)) return trackedFailure(record, "start", "malformed");
  const sessionId = result.data.sessionId;
  const reply = toReply(result.data.reply);
  if (typeof sessionId !== "number" || reply == null)
    return trackedFailure(record, "start", "malformed");
  record("retrospect_started", { retrospect_id: String(sessionId) }, String(sessionId));
  recordCompletion(record, sessionId, reply);
  return { ok: true, data: { sessionId, reply } };
}

/**
 * 오늘 진행 중인 회고를 찾는다 — 앱을 껐다 켜도 새 세션을 만들지 않고 이어서 하도록 시작 전에 묻는다.
 * 이어서 할 회고가 없으면(204) `data: null` 이다.
 */
export async function fetchCurrentRetro(options?: {
  signal?: AbortSignal;
}): Promise<RetroResult<CurrentRetro | null>> {
  const record = captureAnalytics();
  const result = await authedRequest<unknown>(
    "GET",
    `${RETROSPECT_PATH}/current`,
    undefined,
    options,
  );
  if (!result.ok) return { ok: false, code: mapError(result.error, "server") };
  if (result.data == null) return { ok: true, data: null };

  if (!isObject(result.data)) return { ok: false, code: "malformed" };
  const sessionId = result.data.sessionId;
  const messages = toMessages(result.data.messages);
  const reply = toReply(result.data.reply);
  if (typeof sessionId !== "number" || messages == null || reply == null)
    return { ok: false, code: "malformed" };
  record("retrospect_resumed", { retrospect_id: String(sessionId) }, String(sessionId));
  return { ok: true, data: { sessionId, messages, reply } };
}

/** 한 턴을 진행하고 다음 응답을 받는다 */
export async function sendTurn(
  sessionId: number,
  input: TurnInput,
  options?: { signal?: AbortSignal },
): Promise<RetroResult<Reply>> {
  const record = captureAnalytics();
  const result = await authedRequest<unknown>(
    "POST",
    `${RETROSPECT_PATH}/${sessionId}/messages`,
    input,
    { ...options, timeoutMs: RETRO_TIMEOUT_MS },
  );
  if (!result.ok)
    return trackedFailure(record, "turn", mapError(result.error, "session_not_found"));

  const reply = toReply(result.data);
  if (reply == null) return trackedFailure(record, "turn", "malformed");
  record("retrospect_turn_succeeded", {
    retrospect_id: String(sessionId),
    input_kind: input.content != null ? "text" : "selection",
  });
  recordCompletion(record, sessionId, reply);
  return { ok: true, data: reply };
}

function trackedFailure(
  record: Track,
  operation: "start" | "turn",
  code: RetroFailureCode,
): { ok: false; code: RetroFailureCode } {
  record("retrospect_request_failed", { operation, code });
  return { ok: false, code };
}

function recordCompletion(record: Track, sessionId: number, reply: Reply) {
  if (!reply.done || reply.phase !== PHASE_COMPLETE) return;
  const retrospect_id = String(sessionId);
  record("retrospect_completed", { retrospect_id }, retrospect_id);
  if (reply.wishCard?.wishCardId != null) {
    record(
      "wish_card_created",
      { retrospect_id, wish_card_id: reply.wishCard.wishCardId },
      reply.wishCard.wishCardId,
    );
  }
}
