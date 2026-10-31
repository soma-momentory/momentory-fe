import { captureAnalytics } from "@/features/analytics";
/**
 * 보관함 서버 경계 — 월별 일기·행동 카드 조회를 프론트 `Diary`/`ActionCard` 로 옮긴다.
 *
 * 조회: `GET /api/v1/diaries?year=&month=` · `GET /api/v1/action-cards?year=&month=`.
 * 쓰기: `DELETE /api/v1/diaries/{id}`(일기만 삭제) · `PUT /api/v1/action-cards/{id}/completion`
 * (「해봤어요」·되돌리기·느낀 점) · `PUT /api/v1/diaries/by-retrospect/{id}`(C6와 보관함의 본문 수정).
 * 보관함 본문 수정은 서버의 저장 성공을 기다린 뒤 로컬에 반영한다.
 *
 * 삭제는 **일기 id** 로 보낸다 — 회고를 막 끝낸 일기도 완료 턴 응답이 그 일기의 서버 id 를
 * 실어 주므로(`retro/data/retroApi.ts` 의 `ReplyDiary.diaryId`), store 가 저장 때부터 서버 id 를
 * 들고 있어 저장 직후에도 이 삭제가 서버에 닿는다.
 *
 * 이 파일은 `sampleAdapter.ts` 가 하던 **변환 역할**을 서버 응답 기준으로 대신한다.
 * store 와 화면은 `Diary`/`ActionCard` 의 모양만 알고, 서버 DTO 와의 차이는 전부
 * 여기서 흡수한다(`CLAUDE.md` 「BE 는 마지막에 붙인다」).
 *
 * 서버를 믿지 않는다 — `authedRequest` 는 형태를 보장하지 않으므로 **런타임에
 * 검사**하고(`retroApi.ts` 와 같은 결), 어긋난 항목은 그 줄만 버린다.
 *
 * ## 서버 DTO 와 다른 자리
 *
 * - `id`·`retrospectId` 는 `Long` → **문자열**로 바꾼다(스키마가 그렇다).
 * - 날짜는 별도 필드가 없고 `createdAt: Instant` 하나다 → **KST 04:00 하루 경계 기준
 *   날짜**로 접는다(아래 `kstDate`). 서버 월 조회도 같은 04:00 반열림 구간이라
 *   (`DayBoundary`) 같은 경계를 써야 달력 칸·월 묶음이 서버와 어긋나지 않는다.
 * - 감정은 `currentEmotion`·`scheduleEmotion` **두 소문자 키**다 → 프론트 감정
 *   태그 배열로 편다(아래 `EMOTION_BY_KEY`).
 * - 본문 이름이 다르다: `original` → `body`. **`reframed`(바바가 다시 본 오늘)는
 *   프론트에 띄우지 않는다**(2026-08-20 결정 — `original` 하나만 보이게) → `babaView`
 *   는 항상 `null` 이라 상세의 「바바가 함께 본 오늘」 면은 그려지지 않는다.
 * - 프론트에만 있는 `babaViewBasis`·`authoredBy`·`editedAt` 은 서버에 없어 기본값
 *   (`null`·`"baba"`·`null`)으로 둔다. `ordinal` 은 받아온 창 안에서 날짜순으로 매긴다.
 * - 행동 카드는 서버가 `diaryId` 를 주지 않는다 — 카드·일기가 **같은 `retrospectId`**
 *   로만 묶인다. 그래서 일기를 먼저 세우고 `retrospectId → diary.id` 로 조인해
 *   프론트의 `diaryId` 를 채운다. 짝을 못 찾은 카드는 버린다.
 */
import type { ActionCard, Diary } from "@/features/diary/model/types";
import { isEmotionId, type EmotionId } from "@/features/emotion/model/emotion";
import { DAY_BOUNDARY_HOUR } from "@/lib/clock";
import { authedRequest, type HttpError } from "@/lib/http";

const DIARIES_PATH = "/api/v1/diaries";
const ACTION_CARDS_PATH = "/api/v1/action-cards";

/** 짧은 조회다 — LLM 턴 기준(25초)을 쓰면 실패한 요청이 그만큼 화면을 잡는다 */
const ARCHIVE_TIMEOUT_MS = 8_000;

/**
 * 서버 감정 소문자 키 → 프론트 감정 id.
 *
 * ⚠ **BE `retrospect/Emotion.key()` · 프론트 `retro/model/retro.ts` 의
 * `EMOTION_KEYS` 와 같은 표다** — 일정 API 의 대문자 enum(`ANGRY_FRUSTRATED`)이
 * 아니다. 번호(`features/emotion` 의 `EMOTIONS`)가 바뀌면 이 표도 함께 고친다.
 * scheduleApi 처럼 자기 표를 두어 다른 feature 의 store 를 import 하지 않는다.
 */
const EMOTION_BY_KEY: Record<string, EmotionId> = {
  happy: 1,
  proud: 2,
  calm: 3,
  tired: 4,
  stuck: 5,
  lethargic: 6,
  anxious: 7,
  depressed: 8,
  angry: 9,
  frustrated: 10,
};

/** 소문자 키 → id. 모르는 키는 `null` — 이름을 지어내지 않는다 */
const emotionOf = (v: unknown): EmotionId | null => {
  if (typeof v !== "string") return null;
  const id = EMOTION_BY_KEY[v];
  return id != null && isEmotionId(id) ? id : null;
};

/** 한국시간(UTC+9, 서머타임 없음)의 자정 기준 오프셋 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * `Instant`(ISO) → 그 순간이 속한 **하루**의 KST 날짜 `"YYYY-MM-DD"`.
 *
 * **UTC 문자열 앞자르기가 아니다** — 그러면 한국시간 자정 전후에서 날짜가 하루
 * 어긋난다. 에폭에 +9h 를 더해 KST 벽시계로 옮긴 뒤 UTC 조각을 읽어, 기기
 * 타임존과 무관하게 KST 달력 날짜를 얻는다.
 *
 * **하루는 자정이 아니라 새벽 4:00 에 넘어간다**(`clock.ts` 의 `DAY_BOUNDARY_HOUR`)
 * — 그래서 KST 로 옮긴 뒤 경계 시각만큼 더 빼고 날짜를 읽는다. 새벽 1시에 남긴
 * 일기는 아직 「어제」다. 서버의 월·일 조회도 같은 04:00 경계를 쓰므로
 * (`DayBoundary`), 달력 칸·월 묶음이 서버와 어긋나지 않는다.
 */
const kstDate = (iso: string): string | null => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms + KST_OFFSET_MS - DAY_BOUNDARY_HOUR * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ── 런타임 검증 ──────────────────────────────────────────────────────────

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asString = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** `Long` id — 서버는 number 로 주지만 문자열도 받아 둔다 */
const asId = (v: unknown): string | null => {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.length > 0) return v;
  return null;
};

/**
 * `DiaryResponse` → `Diary`. 필수(id·retrospectId·original·createdAt·현재 감정)가
 * 어긋나면 `null`. `ordinal` 은 여기서 0 이고 창 전체를 모은 뒤 날짜순으로 매긴다.
 */
export const toDiary = (v: unknown): Diary | null => {
  if (!isObject(v)) return null;
  const id = asId(v.id);
  const retrospectId = asId(v.retrospectId);
  const body = asString(v.original);
  const createdAt = asString(v.createdAt);
  if (id == null || retrospectId == null || body == null || createdAt == null) return null;

  const date = kstDate(createdAt);
  if (date == null) return null;

  // 대표 감정(주 감정) — 달력 색·리포트가 쓴다.
  const start = emotionOf(v.primaryEmotion);

  // `emotions` 는 일기에서 드러난 감정 **전체**(서버 감정 태그). 상세에서 모두 보여준다.
  // 주 감정을 앞에 세우고 나머지 태그를 잇는다(중복·빈 값 접기). 옛 일기는 태그가 비어 주 감정만 남는다.
  const emotions: EmotionId[] = [];
  if (start != null) emotions.push(start);
  if (Array.isArray(v.emotions)) {
    for (const raw of v.emotions) {
      const e = emotionOf(raw);
      if (e != null && !emotions.includes(e)) emotions.push(e);
    }
  }

  return {
    id,
    date,
    body,
    // reframed 는 프론트에 띄우지 않는다 — original 하나만 보인다
    babaView: null,
    babaViewBasis: null,
    emotions,
    authoredBy: "baba",
    editedAt: null,
    ordinal: 0,
    retrospectId,
    storyEmotion: null,
    startEmotion: start,
    weather: asString(v.weather)?.trim() || null,
  };
};

/**
 * `ActionCardResponse` → `ActionCard`. `diaryId` 는 서버에 없어 `retrospectId →
 * diary.id` 맵으로 채운다 — 짝을 못 찾으면 `null`(그 카드는 버린다).
 */
export const toActionCard = (
  v: unknown,
  diaryIdByRetrospect: ReadonlyMap<string, string>,
): ActionCard | null => {
  if (!isObject(v)) return null;
  const id = asId(v.id);
  const retrospectId = asId(v.retrospectId);
  const situation = asString(v.situation);
  const createdAt = asString(v.createdAt);
  // v2 바람 카드는 작은 행동(targetAction)을 안 정할 수 있어 필수에서 뺀다 — 상황만 필수다.
  if (id == null || retrospectId == null || situation == null || createdAt == null) return null;

  const diaryId = diaryIdByRetrospect.get(retrospectId);
  if (diaryId == null) return null;

  const createdDate = kstDate(createdAt);
  if (createdDate == null) return null;

  // 바람 카드 필드 — 감정 탐색을 거친 카드만 채워진다. 안 거쳤으면 빈 값으로 둔다.
  const emotions: EmotionId[] = [];
  if (Array.isArray(v.emotions)) {
    for (const raw of v.emotions) {
      const e = emotionOf(raw);
      if (e != null && !emotions.includes(e)) emotions.push(e);
    }
  }
  const needs: string[] = Array.isArray(v.needs)
    ? v.needs
        .map((n) => (isObject(n) ? asString(n.word) : null))
        .filter((w): w is string => w != null)
    : [];

  return {
    id,
    diaryId,
    situation,
    emotions: emotions.slice(0, 2),
    needs: needs.slice(0, 2),
    desiredState: asString(v.desiredState),
    sentiment: v.sentiment === "positive" ? "positive" : "uncomfortable",
    targetAction: asString(v.targetAction),
    done: v.done === true,
    // 「해봤어요」 이후에만 채워진다 — 없으면 자리를 열지 않는다
    doneAt: asString(v.doneAt),
    reflection: asString(v.reflection),
    createdAt: createdDate,
  };
};

// ── 호출 ────────────────────────────────────────────────────────────────

/** 조회할 달 하나 */
export type ArchiveMonth = { year: number; month: number };

/** 한 창의 조회 결과 — 어긋난 항목은 버려진 뒤의 값이다 */
export type ArchiveData = { diaries: Diary[]; actionCards: ActionCard[] };

const asArray = (v: unknown, key: string): unknown[] => {
  if (!isObject(v) || !Array.isArray(v[key])) return [];
  return v[key];
};

const fetchMonth = async (
  path: string,
  { year, month }: ArchiveMonth,
  signal?: AbortSignal,
): Promise<{ ok: true; data: unknown } | { ok: false; error: HttpError }> => {
  const query = `${path}?year=${year}&month=${month}`;
  return authedRequest<unknown>("GET", query, undefined, {
    timeoutMs: ARCHIVE_TIMEOUT_MS,
    signal,
  });
};

/**
 * 여러 달을 한 번에 받아 한 벌의 `Diary`/`ActionCard` 로 세운다.
 *
 * - 일기와 카드를 달별로 **병렬** 조회한다.
 * - `retrospectId` 로 카드를 일기에 조인하려면 일기가 먼저 서야 하므로, 모은 뒤
 *   맵을 만들고 카드를 링크한다.
 * - `ordinal` 은 창 전체를 **날짜 오름차순**으로 매긴다(창 밖은 모른다).
 * - **한 요청이라도 성공하면 `ok`** — 못 받은 달은 비운 채 둔다. 전부 실패했을
 *   때만 `ok:false` 라, store 가 「가진 것을 지우지 않고」 다음에 다시 시도한다.
 */
export const loadArchive = async (
  months: readonly ArchiveMonth[],
  options?: { signal?: AbortSignal },
): Promise<{ ok: true; data: ArchiveData } | { ok: false }> => {
  const signal = options?.signal;

  const diaryResults = await Promise.all(months.map((m) => fetchMonth(DIARIES_PATH, m, signal)));
  const cardResults = await Promise.all(
    months.map((m) => fetchMonth(ACTION_CARDS_PATH, m, signal)),
  );

  const anyOk = diaryResults.some((r) => r.ok) || cardResults.some((r) => r.ok);
  if (!anyOk) return { ok: false };

  const diaries: Diary[] = [];
  for (const r of diaryResults) {
    if (!r.ok) continue;
    for (const raw of asArray(r.data, "diaries")) {
      const diary = toDiary(raw);
      if (diary != null) diaries.push(diary);
    }
  }

  // 창 전체 날짜순 → ordinal. 하루 한 벌이라 날짜가 곧 순서다(회고 「하루 한 번」)
  diaries.sort((a, b) => a.date.localeCompare(b.date));
  diaries.forEach((d, i) => {
    d.ordinal = i + 1;
  });

  const diaryIdByRetrospect = new Map<string, string>();
  for (const d of diaries) {
    if (d.retrospectId != null) diaryIdByRetrospect.set(d.retrospectId, d.id);
  }

  const actionCards: ActionCard[] = [];
  for (const r of cardResults) {
    if (!r.ok) continue;
    for (const raw of asArray(r.data, "actionCards")) {
      const card = toActionCard(raw, diaryIdByRetrospect);
      if (card != null) actionCards.push(card);
    }
  }

  return { ok: true, data: { diaries, actionCards } };
};

/**
 * 오늘이 속한 달부터 뒤로 `count` 개월의 조회 창.
 *
 * 서버에 「전체 목록」·가입일이 없어(프로필에 없다) 고정 창으로 뒤를 훑는다 —
 * 요청 수가 `count` 로 묶인다. 가입일/전체 조회가 생기면 이 창을 실제 범위로 바꾼다.
 */
export const monthsBackFrom = (today: string, count: number): ArchiveMonth[] => {
  const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const out: ArchiveMonth[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(y, m - 1 - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
};

// ── 쓰기 ────────────────────────────────────────────────────────────────

/** 실패 사유 — **코드**다. 화면 문구는 store 가 정한다(`scheduleApi.ts` 와 같은 결) */
export type DiaryWriteFailure =
  /** 401 — 서버가 이 토큰을 거부했다 */
  | "unauthorized"
  /** 보낼 토큰이 없어 요청하지 않았다(갱신 일시 실패가 섞인다) */
  | "no_session"
  /** 404 — 서버에 없는 항목 */
  | "not_found"
  /** 400 — 우리가 잘못 보냈다 */
  | "invalid_request"
  | "network"
  | "server"
  | "malformed"
  | "unconfigured";

export type DiaryWriteResult = { ok: true } | { ok: false; code: DiaryWriteFailure };

const mapWriteError = (error: HttpError): DiaryWriteFailure => {
  switch (error.code) {
    case "unconfigured":
      return "unconfigured";
    case "unauthenticated":
      // 보내지 않았다 — 401 과 다르다(`scheduleApi.ts` 의 같은 구분)
      return "no_session";
    case "network":
      return "network";
    case "malformed":
      return "malformed";
    case "http":
      if (error.status === 400) return "invalid_request";
      if (error.status === 401) return "unauthorized";
      if (error.status === 404) return "not_found";
      return "server";
  }
};

/**
 * **서버가 답했고 거부했다** — 이때만 화면을 되돌린다(`scheduleApi.ts` 의 규칙).
 * `network`·`unconfigured`·`no_session`·`unauthorized` 는 기기의 값을 그대로 둔다:
 * 요청이 나가지도 못했거나(앞의 셋), 곧 로그아웃으로 화면이 바뀌므로(401).
 */
export const serverRefusedWrite = (code: DiaryWriteFailure) =>
  code === "server" || code === "malformed" || code === "not_found" || code === "invalid_request";

/** 짧은 쓰기다 — 조회와 같은 타임아웃 */
const WRITE_TIMEOUT_MS = 8_000;

/** 일기 한 벌 삭제 — **일기만** 지운다(행동 카드·회고 세션은 남는다) */
export const deleteDiary = async (
  serverId: string,
  options?: { signal?: AbortSignal },
): Promise<DiaryWriteResult> => {
  const record = captureAnalytics();
  const result = await authedRequest<null>("DELETE", `${DIARIES_PATH}/${serverId}`, undefined, {
    timeoutMs: WRITE_TIMEOUT_MS,
    signal: options?.signal,
  });
  if (result.ok) record("diary_deleted", { diary_id: serverId });
  return result.ok ? { ok: true } : { ok: false, code: mapWriteError(result.error) };
};

/**
 * 「해봤어요」/되돌리기 + 느낀 점을 반영한다.
 *
 * `done=false`(되돌리기)면 서버가 해본 시각·느낀 점을 함께 비우므로 `reflection` 을 싣지
 * 않는다(싣으면 400). 응답 본문은 읽지 않는다 — store 가 이미 옵티미스틱하게 반영했고,
 * 여기서는 거부됐는지만 본다(`scheduleApi.ts` 의 `putCompletion` 과 같은 결).
 */
export const putActionCardCompletion = async (
  serverId: string,
  done: boolean,
  reflection: string | null,
  options?: { signal?: AbortSignal },
): Promise<DiaryWriteResult> => {
  const body = done ? { done: true, reflection } : { done: false };
  const result = await authedRequest<unknown>(
    "PUT",
    `${ACTION_CARDS_PATH}/${serverId}/completion`,
    body,
    { timeoutMs: WRITE_TIMEOUT_MS, signal: options?.signal },
  );
  return result.ok ? { ok: true } : { ok: false, code: mapWriteError(result.error) };
};

/**
 * 행동 카드 한 장 삭제 — 서버에서 지운다(`DELETE /api/v1/action-cards/{id}`).
 *
 * 회고를 막 끝낸 카드도 완료 응답이 준 서버 id(`actionCardId`)를 store 가 들고 있어, 그 id 로
 * 곧바로 지운다. 일기 삭제(`deleteDiary`)와 같은 결이다 — 예전엔 서버 삭제 계약이 없어 지운 id 를
 * 기기에 남겨 조회 때 걸렀는데, 이제 서버가 실제로 지운다.
 */
export const deleteActionCard = async (
  serverId: string,
  options?: { signal?: AbortSignal },
): Promise<DiaryWriteResult> => {
  const record = captureAnalytics();
  const result = await authedRequest<null>(
    "DELETE",
    `${ACTION_CARDS_PATH}/${serverId}`,
    undefined,
    { timeoutMs: WRITE_TIMEOUT_MS, signal: options?.signal },
  );
  if (result.ok) record("wish_card_deleted", { wish_card_id: serverId });
  return result.ok ? { ok: true } : { ok: false, code: mapWriteError(result.error) };
};

/** 서버가 준 id 인가 — 숫자 문자열이면 서버 항목이고, `*-local-*`·`*-sample-*` 은 아니다 */
export const isServerId = (id: string): boolean => /^\d+$/.test(id);

/**
 * 회고 완료 화면(C6)과 보관함 상세의 고치기 — 그 회고의 일기 **본문만** 서버에 갱신한다.
 *
 * 클라이언트는 일기 id 가 아니라 회고 세션 id(`retrospectId`)를 들고 있어 그 열쇠로 보낸다
 * (서버가 완료 때 만든 일기를 그 id 로 찾는다). 바바의 문장·감정은 건드리지 않는다.
 */
export const updateDiaryBody = async (
  retrospectId: string,
  original: string,
  options?: { signal?: AbortSignal },
): Promise<DiaryWriteResult> => {
  const record = captureAnalytics();
  const result = await authedRequest<unknown>(
    "PUT",
    `${DIARIES_PATH}/by-retrospect/${retrospectId}`,
    { original },
    { timeoutMs: WRITE_TIMEOUT_MS, signal: options?.signal },
  );
  if (result.ok) record("diary_updated", { retrospect_id: retrospectId });
  return result.ok ? { ok: true } : { ok: false, code: mapWriteError(result.error) };
};
