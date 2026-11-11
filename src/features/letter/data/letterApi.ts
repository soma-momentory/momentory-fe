import { authedRequest } from "@/lib/http";

/**
 * 바바의 편지 — BE `feat/baba-letter`(PR 1)의 `/api/v1/letters` · `/users/me/letter-time`.
 *
 * ```
 * GET  /letters               200 { letters: [{ id, date, isNew, openedAt|null }] }   편지를 만들지 않는다
 * GET  /letters/{date}        200 Letter · 404 LETTER_NOT_FOUND                      못 만든 편지면 그 자리에서 만든다(최대 8초)
 * POST /letters/{id}/open     204
 * PUT  /letters/{id}/action   { position|null, whenLabel, scheduleId, remindAt } → 200 Letter
 * PUT  /users/me/letter-time  { letterTime "HH:mm", notificationEnabled } → 200 · 409 ONBOARDING_REQUIRED
 * ```
 *
 * `GET /letters/current` 는 쓰지 않는다 — 홈 아이콘은 목록 첫 칸으로 점을 달고, 누르면 그 날짜를 연다.
 * 실패 사유를 나누지 않는다 — 화면은 무엇이 틀렸든 한 줄만 보여 준다(`RULES.md` 4).
 */
export type LetterStatus = "READY" | "FALLBACK" | "QUIET";
export type LetterActionSource = "CATALOG" | "FALLBACK";

export type LetterAction = {
  position: number;
  /** 연결표의 승인 제목 그대로 */
  title: string;
  source: LetterActionSource;
  chosen: boolean;
  whenLabel: string | null;
  scheduleId: string | null;
  /** ISO-8601. 없으면 알림 없이 */
  remindAt: string | null;
};

export type Letter = {
  id: string;
  /** 출처 일기의 날짜 — 편지는 그다음 날 아침에 받는다 */
  date: string;
  status: LetterStatus;
  /** 사용자가 한 말 그대로. 조용한 편지 · 원문 대조 탈락이면 `null` */
  quote: string | null;
  insight: string;
  tonightQuestion: string | null;
  actions: LetterAction[];
  /** 조용한 편지에만 있다 */
  helplines: string[];
  isNew: boolean;
  openedAt: string | null;
};

export type LetterSummary = Pick<Letter, "id" | "date" | "isNew" | "openedAt">;

export type ChooseActionInput = {
  position: number | null;
  whenLabel: string | null;
  scheduleId: string | null;
  remindAt: string | null;
};

type Result<T> = { ok: true; data: T } | { ok: false };

/** 목록은 편지를 만들지 않아 금방 온다. 날짜별 조회는 서버가 8초까지 만들 수 있어 넉넉히 둔다 */
const LIST_TIMEOUT_MS = 8_000;
const LETTER_TIMEOUT_MS = 15_000;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const idOf = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? String(v) : null);
const textOrNull = (v: unknown) => (typeof v === "string" && v.trim().length > 0 ? v : null);
const STATUSES: readonly string[] = ["READY", "FALLBACK", "QUIET"];
const SOURCES: readonly string[] = ["CATALOG", "FALLBACK"];

export const toSummary = (v: unknown): LetterSummary | null => {
  if (!isObject(v)) return null;
  const id = idOf(v.id);
  if (id == null || !isDate(v.date)) return null;
  return { id, date: v.date, isNew: v.isNew === true, openedAt: textOrNull(v.openedAt) };
};

const toAction = (v: unknown): LetterAction | null => {
  if (!isObject(v)) return null;
  if (typeof v.position !== "number" || typeof v.title !== "string") return null;
  if (typeof v.source !== "string" || !SOURCES.includes(v.source)) return null;
  return {
    position: v.position,
    title: v.title,
    source: v.source as LetterActionSource,
    chosen: v.chosen === true,
    whenLabel: textOrNull(v.whenLabel),
    scheduleId: idOf(v.scheduleId),
    remindAt: textOrNull(v.remindAt),
  };
};

/** 모르는 상태 · 본문 없는 편지는 통째로 버린다 — 빈 종이를 그리지 않는다 */
export const toLetter = (v: unknown): Letter | null => {
  const summary = toSummary(v);
  if (summary == null || !isObject(v)) return null;
  if (typeof v.status !== "string" || !STATUSES.includes(v.status)) return null;
  if (typeof v.insight !== "string" || v.insight.trim().length === 0) return null;
  const actions = Array.isArray(v.actions) ? v.actions.map(toAction) : [];
  return {
    ...summary,
    status: v.status as LetterStatus,
    quote: textOrNull(v.quote),
    insight: v.insight,
    tonightQuestion: textOrNull(v.tonightQuestion),
    actions: actions.filter((a): a is LetterAction => a != null),
    helplines: Array.isArray(v.helplines)
      ? v.helplines.filter((h): h is string => typeof h === "string")
      : [],
  };
};

export async function fetchLetters(expectedUserId?: number): Promise<Result<LetterSummary[]>> {
  const result = await authedRequest<unknown>("GET", "/api/v1/letters", undefined, {
    timeoutMs: LIST_TIMEOUT_MS,
    expectedUserId,
  });
  if (!result.ok || !isObject(result.data) || !Array.isArray(result.data.letters)) {
    return { ok: false };
  }
  const letters = result.data.letters.map(toSummary);
  return { ok: true, data: letters.filter((l): l is LetterSummary => l != null) };
}

export async function fetchLetter(date: string): Promise<Result<Letter>> {
  const result = await authedRequest<unknown>("GET", `/api/v1/letters/${date}`, undefined, {
    timeoutMs: LETTER_TIMEOUT_MS,
  });
  const letter = result.ok ? toLetter(result.data) : null;
  return letter == null ? { ok: false } : { ok: true, data: letter };
}

/** 열람 기록 — 실패해도 다음에 열 때 다시 보낸다(서버는 처음 값만 남긴다) */
export async function markLetterOpened(id: string): Promise<boolean> {
  const result = await authedRequest<null>("POST", `/api/v1/letters/${id}/open`);
  return result.ok;
}

/** 고르기 실패 중 「해 본 일이라 잠김」(409 `LETTER_ACTION_LOCKED`)만 따로 알린다 — 화면이 고정 표시로 바꾼다 */
export async function chooseLetterAction(
  id: string,
  input: ChooseActionInput,
): Promise<{ ok: true; data: Letter } | { ok: false; locked: boolean }> {
  const result = await authedRequest<unknown>("PUT", `/api/v1/letters/${id}/action`, {
    ...input,
    scheduleId: input.scheduleId == null ? null : Number(input.scheduleId),
  });
  if (!result.ok) {
    const { error } = result;
    const locked =
      error.code === "http" &&
      error.status === 409 &&
      isObject(error.body) &&
      error.body.code === "LETTER_ACTION_LOCKED";
    return { ok: false, locked };
  }
  const letter = toLetter(result.data);
  return letter == null ? { ok: false, locked: false } : { ok: true, data: letter };
}

export async function saveLetterTime(
  letterTime: string,
  notificationEnabled: boolean,
): Promise<boolean> {
  const result = await authedRequest<unknown>("PUT", "/api/v1/users/me/letter-time", {
    letterTime,
    notificationEnabled,
  });
  return result.ok;
}
