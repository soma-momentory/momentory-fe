import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 소원 빌기 `/api/v1/wishes` (2026-11-04 · BE `feat/wish-pond`).
 *
 * ```
 * GET    /pond               연못 — 남의 소원 최대 10장 · 적으면 바바의 소원으로 채운다
 * POST   /rules-agreement    이용 규칙 동의
 * POST   /review             심사 { content } — 아무것도 저장하지 않는다
 * POST   /                   띄우기 { content, reviewToken } — 심사가 준 글과 표 그대로
 * GET    /mine               내 소원
 * POST   /{id}/join          같이 빌기
 * POST   /{id}/report        신고 · DELETE 는 되돌리기
 * DELETE /{id}               내 소원 지우기
 * PUT    /{id}/outcome       지나간 소원에 답하기
 * ```
 *
 * 소원 글은 일기와 같은 등급의 사용자 글이라 계측에 넣지 않는다. **던지지 않는다.**
 */
export const WISHES_PATH = "/api/v1/wishes";

const TIMEOUT_MS = 8_000;
/** 심사는 서버가 AI 를 8초까지 기다린다 */
const REVIEW_TIMEOUT_MS = 12_000;

export type WishAuthor = "user" | "baba";

export type PondWish = {
  id: number;
  content: string;
  daysLeft: number;
  light: boolean;
  joined: boolean;
  author: WishAuthor;
};

export type WishPond = {
  rulesAgreed: boolean;
  postedToday: boolean;
  hasFloatingWish: boolean;
  floatingCount: number;
  wishes: PondWish[];
};

export type WishReview =
  | { result: "pass" | "edited"; content: string; reviewToken: string }
  | { result: "rejected"; message: string }
  | { result: "crisis" };

export type FloatingWish = {
  id: number;
  content: string;
  daysLeft: number;
  joinedByOthers: boolean;
};

export type WishOutcome = "came_true" | "not_yet";

export type PastWish = {
  id: number;
  content: string;
  endReason: "expired" | "reported";
  outcome: WishOutcome | null;
};

export type MyWishes = { floating: FloatingWish[]; past: PastWish[] };

export type WishFailureCode =
  | "rules_required"
  | "daily_limit"
  | "not_found"
  | "unavailable"
  | "unauthorized"
  | "no_session"
  | "network"
  | "server"
  | "malformed"
  | "unconfigured";

export type WishResult<T> = { ok: true; data: T } | { ok: false; code: WishFailureCode };

const mapError = (error: HttpError): WishFailureCode => {
  switch (error.code) {
    case "unauthenticated":
      return "no_session";
    case "http":
      switch (error.status) {
        case 401:
          return "unauthorized";
        case 403:
          return "rules_required";
        case 404:
          return "not_found";
        case 409:
          return "daily_limit";
        case 503:
          return "unavailable";
        default:
          return "server";
      }
    default:
      return error.code;
  }
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const toPondWish = (raw: unknown): PondWish | null => {
  if (!isObject(raw)) return null;
  const { id, content, daysLeft, light, joined, author } = raw;
  if (typeof id !== "number" || typeof content !== "string" || typeof daysLeft !== "number") {
    return null;
  }
  if (author !== "USER" && author !== "BABA") return null;
  return {
    id,
    content,
    daysLeft,
    light: light === true,
    joined: joined === true,
    author: author === "BABA" ? "baba" : "user",
  };
};

const toPond = (raw: unknown): WishPond | null => {
  if (!isObject(raw) || !Array.isArray(raw.wishes)) return null;
  const wishes = raw.wishes.map(toPondWish);
  if (!wishes.every((w) => w != null)) return null;
  return {
    rulesAgreed: raw.rulesAgreed === true,
    postedToday: raw.postedToday === true,
    hasFloatingWish: raw.hasFloatingWish === true,
    floatingCount: typeof raw.floatingCount === "number" ? raw.floatingCount : wishes.length,
    wishes: wishes as PondWish[],
  };
};

const toReview = (raw: unknown): WishReview | null => {
  if (!isObject(raw)) return null;
  const { result, content, reviewToken, message } = raw;
  if (result === "CRISIS") return { result: "crisis" };
  if (result === "REJECTED") {
    return typeof message === "string" ? { result: "rejected", message } : null;
  }
  if ((result === "PASS" || result === "EDITED") && typeof content === "string") {
    return typeof reviewToken === "string"
      ? { result: result === "PASS" ? "pass" : "edited", content, reviewToken }
      : null;
  }
  return null;
};

const toFloating = (raw: unknown): FloatingWish | null => {
  if (!isObject(raw)) return null;
  const { id, content, daysLeft, joinedByOthers } = raw;
  if (typeof id !== "number" || typeof content !== "string" || typeof daysLeft !== "number") {
    return null;
  }
  return { id, content, daysLeft, joinedByOthers: joinedByOthers === true };
};

const toPast = (raw: unknown): PastWish | null => {
  if (!isObject(raw)) return null;
  const { id, content, endReason, outcome } = raw;
  if (typeof id !== "number" || typeof content !== "string") return null;
  return {
    id,
    content,
    endReason: endReason === "REPORTED" ? "reported" : "expired",
    outcome: outcome === "CAME_TRUE" ? "came_true" : outcome === "NOT_YET" ? "not_yet" : null,
  };
};

const toMine = (raw: unknown): MyWishes | null => {
  if (!isObject(raw) || !Array.isArray(raw.floating) || !Array.isArray(raw.past)) return null;
  const floating = raw.floating.map(toFloating);
  const past = raw.past.map(toPast);
  if (!floating.every((w) => w != null) || !past.every((w) => w != null)) return null;
  return { floating: floating as FloatingWish[], past: past as PastWish[] };
};

const call = async <T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body: unknown,
  parse: (raw: unknown) => T | null,
  timeoutMs = TIMEOUT_MS,
): Promise<WishResult<T>> => {
  const result = await authedRequest<unknown>(method, `${WISHES_PATH}${path}`, body, { timeoutMs });
  if (!result.ok) return { ok: false, code: mapError(result.error) };
  const data = parse(result.data);
  return data == null ? { ok: false, code: "malformed" } : { ok: true, data };
};

const done = (): true => true;

export const fetchPond = () => call("GET", "/pond", undefined, toPond);

export const agreeWishRules = () => call("POST", "/rules-agreement", undefined, done);

export const reviewWish = (content: string) =>
  call("POST", "/review", { content }, toReview, REVIEW_TIMEOUT_MS);

export const postWish = (content: string, reviewToken: string) =>
  call("POST", "", { content, reviewToken }, toFloating);

export const fetchMyWishes = () => call("GET", "/mine", undefined, toMine);

export const joinWish = (id: number) => call("POST", `/${id}/join`, undefined, done);

export const reportWish = (id: number) => call("POST", `/${id}/report`, undefined, done);

export const undoReportWish = (id: number) => call("DELETE", `/${id}/report`, undefined, done);

export const deleteWish = (id: number) => call("DELETE", `/${id}`, undefined, done);

export const answerWish = (id: number, outcome: WishOutcome) =>
  call(
    "PUT",
    `/${id}/outcome`,
    { outcome: outcome === "came_true" ? "CAME_TRUE" : "NOT_YET" },
    done,
  );
