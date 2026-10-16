import { toAllowedLink, type InboxLink } from "@/features/notifications/model/links";
import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 알림함 — BE `dev` d77d023 계약 기준. 운영 배포는 미확인이다.
 *
 * 경로 넷과 응답 모양을 `NotificationController`·DTO·OpenAPI 테스트와 대조했다.
 * FE `docs/api/openapi.json` 은 아직 이전 스냅샷이다. 실행 중인 BE의 생성 OpenAPI와
 * 실제 응답은 배포 후 별도로 대조한다.
 *
 * ```
 * GET   /api/v1/notifications?cursor=<opaque>&size=20   200 { items: Notification[], nextCursor: string|null }
 * GET   /api/v1/notifications/unread                    200 { hasUnread: boolean }
 * PATCH /api/v1/notifications/{id}/read                 204
 * POST  /api/v1/notifications/read  { ids: string[] }   204   (1~50개 · 적힌 ID 만)
 *
 * Notification { id: "int64 문자열", type: 열린 문자열, title, body, createdAt: ISO,
 *                readAt: ISO|null, link: "/내부/경로"|null }
 * ```
 *
 * - **던지지 않는다** — 전부 `{ ok, code }` 로 닫는다(선례 `meApi.ts`).
 * - **숫자를 받지 않는다** — 미확인은 `hasUnread` 불리언 하나다(`RULES.md` 4).
 * - **읽음의 단위는 ID 뿐이다** — 「모두 읽음」 · 시각 경계는 계약에 두지 않는다(계획 §5.2 MF-1A).
 * - 모든 요청은 시작한 사용자 ID를 `authedRequest`에 전달한다. 토큰 조회 중 계정이 바뀌면 보내지 않는다.
 * - 제목 · 본문 · `link` 를 로그 · 계측에 남기지 않는다(`CONTRIBUTING.md` 「로그·계측에도 남기지 않는 것」).
 */
const BASE_PATH = "/api/v1/notifications";

/** 한 쪽의 기본 크기와 상한 — 상한은 `POST /read` 한 번의 상한과 같다 */
export const INBOX_PAGE_SIZE = 20;
export const INBOX_MAX_BATCH = 50;

/** 이름표를 고르는 데만 쓴다. 모르는 `type` 도 항목이다 — `other` 로 남는다 */
export type InboxKind = "notice" | "news" | "critical" | "other";

export type InboxNotification = {
  id: string;
  /** 서버 값 그대로(열린 문자열) — 새 유형이 와도 버리지 않는다 */
  type: string;
  kind: InboxKind;
  title: string;
  /** 평문. 없거나 `null` 이면 빈 문자열 */
  body: string;
  /** ISO 8601 — 발행 시각 */
  createdAt: string;
  /**
   * 읽은(또는 읽음으로 간주된) 시각. **판정은 서버 몫이다** — 가입 전 `CRITICAL_NOTICE` 는
   * 서버가 가입 시각을 넣어 보낸다(NB-3). FE 는 `null` 인지만 본다.
   */
  readAt: string | null;
  /** 허용 목록을 통과한 내부 경로만. 아니면 `null` — 항목은 남고 누를 곳이 없다 */
  link: InboxLink | null;
};

export type InboxPage = { items: InboxNotification[]; nextCursor: string | null };

/**
 * 실패 사유 — 화면이 할 수 있는 일이 다르지 않아 넷으로 접는다. 문구는 여기서 정하지 않는다.
 *
 * - `unauthenticated` — 보낼 토큰이 없었거나 서버가 401 로 거부했다. **세션을 내리는 것은
 *   `auth` 몫이다** — 여기서는 사유만 말한다(그 판정은 `GET /users/me` 의 401 하나가 한다)
 * - `network` — 서버에 닿지 못했다(시간 초과 포함). 주소가 비어 있는 경우도 여기 둔다
 * - `server` — 4xx · 5xx(`404 NOTIFICATION_NOT_FOUND` · `400 INVALID_CURSOR` 포함)
 * - `malformed` — 2xx 인데 모양이 다르거나, 보낼 수 없는 요청(50개 초과)이다
 */
export type InboxFailureCode = "unauthenticated" | "network" | "server" | "malformed";

export type InboxResult<T> = { ok: true; data: T } | { ok: false; code: InboxFailureCode };

const mapError = (error: HttpError): InboxFailureCode => {
  switch (error.code) {
    case "unauthenticated":
      return "unauthenticated";
    case "unconfigured":
    case "network":
      return "network";
    case "malformed":
      return "malformed";
    case "http":
      return error.status === 401 ? "unauthenticated" : "server";
  }
};

// ── 런타임 검증 ──────────────────────────────────────────────────────────

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** ISO 8601 날짜-시각으로 읽히는 문자열만 — 「2026-10-15」처럼 시각이 없는 값은 받지 않는다 */
const isIsoDateTime = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));

/** int64 최댓값 — 자릿수가 같으면 문자열 비교가 곧 크기 비교다 */
const INT64_MAX = "9223372036854775807";

/**
 * 계약의 `id` 는 「int64 문자열」이다 — 앞자리 0 없는 음이 아닌 10진 정수이고 int64 를 넘지 않는다.
 * `Number` 로 바꾸지 않는다(2^53 을 넘으면 값이 바뀐다)
 */
const isInt64String = (v: unknown): v is string =>
  typeof v === "string" &&
  /^(0|[1-9]\d*)$/.test(v) &&
  (v.length < INT64_MAX.length || (v.length === INT64_MAX.length && v <= INT64_MAX));

const KINDS: Record<string, InboxKind> = {
  NOTICE: "notice",
  NEWS: "news",
  CRITICAL_NOTICE: "critical",
};

/**
 * 항목 하나. 깨졌으면 `null` — **그 항목만 버린다.**
 *
 * 목록 전체를 실패로 만들지 않는 이유: 운영자가 DB 에 넣은 한 줄이 어긋났다고 나머지
 * 공지까지 「불러오지 못했어요」가 되면, 사용자는 멀쩡한 소식을 하나도 못 보고 원인도
 * 알 수 없다. 버린 항목은 읽음으로 보낼 수도 없어(목록에 없다) 서버에 미확인으로 남는다 —
 * 점이 남는 쪽으로 틀리는 것이 맞다(꺼진 점이 미확인을 숨기는 것보다 낫다).
 */
export const toInboxNotification = (v: unknown): InboxNotification | null => {
  if (!isObject(v)) return null;
  if (!isInt64String(v.id)) return null;
  if (typeof v.type !== "string") return null;
  if (typeof v.title !== "string" || v.title.trim().length === 0) return null;
  if (!isIsoDateTime(v.createdAt)) return null;

  // 본문은 비어도 된다(0~500자). 문자열도 null 도 아니면 계약 위반이다
  if (v.body != null && typeof v.body !== "string") return null;
  // `readAt` 은 **필수**(`null` 또는 시각)다. 빠진 것을 `null` 로 읽으면 미확인으로 판정돼
  // 읽음 요청에 실린다 — 서버가 무엇을 뜻했는지 모르는 항목은 버린다
  if (!("readAt" in v)) return null;
  if (v.readAt !== null && !isIsoDateTime(v.readAt)) return null;

  return {
    id: v.id,
    type: v.type,
    kind: KINDS[v.type] ?? "other",
    title: v.title,
    body: typeof v.body === "string" ? v.body : "",
    createdAt: v.createdAt,
    readAt: typeof v.readAt === "string" ? v.readAt : null,
    // 허용 밖 · 외부 URL 은 링크만 떨어진다 — 항목은 남는다
    link: toAllowedLink(v.link),
  };
};

/**
 * 본문의 틀(`items` 배열 · `nextCursor`)이 깨지면 `null` — 그때는 목록 전체가 `malformed` 다.
 * `nextCursor` 는 **필수**(`null` 또는 문자열)다 — 빠지면 「끝」인지 「잘렸는지」 알 수 없다
 */
export const toInboxPage = (v: unknown): InboxPage | null => {
  if (!isObject(v) || !Array.isArray(v.items)) return null;
  if (!("nextCursor" in v)) return null;
  const cursor = v.nextCursor;
  if (cursor !== null && typeof cursor !== "string") return null;

  const items: InboxNotification[] = [];
  for (const raw of v.items) {
    const item = toInboxNotification(raw);
    if (item != null) items.push(item);
  }
  // 빈 문자열 커서는 「다음이 없다」와 구별할 수 없다 — 없는 것으로 읽는다
  return { items, nextCursor: typeof cursor === "string" && cursor.length > 0 ? cursor : null };
};

/** `{ hasUnread: boolean }` **만**. 숫자 · `"true"` · 누락은 `null`(규칙 4 — 개수를 받지 않는다) */
export const toHasUnread = (v: unknown): boolean | null =>
  isObject(v) && typeof v.hasUnread === "boolean" ? v.hasUnread : null;

const clampSize = (size: number | undefined): number => {
  if (size == null || !Number.isFinite(size)) return INBOX_PAGE_SIZE;
  return Math.min(INBOX_MAX_BATCH, Math.max(1, Math.floor(size)));
};

// ── 호출 ────────────────────────────────────────────────────────────────

/** 최신순 한 쪽. `cursor` 는 서버가 준 그대로(불투명) 돌려보낸다 */
export async function fetchNotifications(
  expectedUserId: number,
  params: { cursor?: string | null; size?: number } = {},
): Promise<InboxResult<InboxPage>> {
  const query = [`size=${clampSize(params.size)}`];
  if (params.cursor != null && params.cursor.length > 0) {
    query.push(`cursor=${encodeURIComponent(params.cursor)}`);
  }
  const result = await authedRequest<unknown>("GET", `${BASE_PATH}?${query.join("&")}`, undefined, {
    expectedUserId,
  });
  if (!result.ok) return { ok: false, code: mapError(result.error) };

  const page = toInboxPage(result.data);
  return page == null ? { ok: false, code: "malformed" } : { ok: true, data: page };
}

/** 이 사용자에게 보이는 미확인이 있는가 — 점 하나의 근거 */
export async function fetchUnread(expectedUserId: number): Promise<InboxResult<boolean>> {
  const result = await authedRequest<unknown>("GET", `${BASE_PATH}/unread`, undefined, {
    expectedUserId,
  });
  if (!result.ok) return { ok: false, code: mapError(result.error) };

  const hasUnread = toHasUnread(result.data);
  return hasUnread == null ? { ok: false, code: "malformed" } : { ok: true, data: hasUnread };
}

/** 항목 하나를 읽음으로 — 2xx 면 성공(본문은 보지 않는다 · 멱등) */
export async function markNotificationRead(
  id: string,
  expectedUserId: number,
): Promise<InboxResult<null>> {
  const result = await authedRequest<unknown>(
    "PATCH",
    `${BASE_PATH}/${encodeURIComponent(id)}/read`,
    undefined,
    { expectedUserId },
  );
  return result.ok ? { ok: true, data: null } : { ok: false, code: mapError(result.error) };
}

/**
 * **적힌 ID 만** 읽음으로. 빈 배열이면 보내지 않고 성공이다(보낼 것이 없다).
 *
 * 50개를 넘으면 **보내지 않고** `malformed` 로 닫는다 — 나누는 것은 호출부(`inbox.ts`)
 * 몫이다. 여기서 몰래 나누면 일부만 성공했을 때 결과 하나로 말할 수 없다.
 */
export async function markNotificationsRead(
  ids: readonly string[],
  expectedUserId: number,
): Promise<InboxResult<null>> {
  if (ids.length === 0) return { ok: true, data: null };
  if (ids.length > INBOX_MAX_BATCH) return { ok: false, code: "malformed" };

  const result = await authedRequest<unknown>(
    "POST",
    `${BASE_PATH}/read`,
    { ids: [...ids] },
    {
      expectedUserId,
    },
  );
  return result.ok ? { ok: true, data: null } : { ok: false, code: mapError(result.error) };
}
