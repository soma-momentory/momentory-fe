import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 걱정상자 — 맡겨둔 걱정 `/api/v1/worries` 두 갈래 (2026-10-13 · BE `feat/kept-worries`).
 *
 * ```
 * POST /api/v1/worries  201 WorryResponse              { content }
 * GET  /api/v1/worries  200 { worries: [WorryResponse] }  전부 · 최신순
 * ```
 *
 * **「잠시 맡겨둘게요」를 고른 걱정만** 보낸다 — 흘려보낸 걱정은 어디에도 남기지 않는다.
 * 속한 하루는 서버가 정한다(맡긴 순간의 04:00 경계 날짜). 본문은 일기와 같은 등급의
 * 사용자 글이라 계측에 넣지 않는다. **던지지 않는다** — `treasureApi.ts` 와 같은 결.
 */
export const WORRIES_PATH = "/api/v1/worries";

const TIMEOUT_MS = 8_000;

export type Worry = {
  id: string;
  /** 속한 하루 `YYYY-MM-DD` */
  date: string;
  content: string;
  /** 맡긴 시각(ISO) */
  createdAt: string;
};

export type WorryFailureCode =
  "unauthorized" | "no_session" | "network" | "server" | "malformed" | "unconfigured";

export type WorryResult<T> = { ok: true; data: T } | { ok: false; code: WorryFailureCode };

const mapError = (error: HttpError): WorryFailureCode => {
  switch (error.code) {
    case "unauthenticated":
      return "no_session";
    case "http":
      return error.status === 401 ? "unauthorized" : "server";
    default:
      return error.code;
  }
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** 서버 한 줄 → `Worry`. 모양이 어긋나면 `null` */
export const toWorry = (raw: unknown): Worry | null => {
  if (!isObject(raw)) return null;
  const { id, date, content, createdAt } = raw;
  if (typeof id !== "number" && typeof id !== "string") return null;
  if (typeof date !== "string" || typeof content !== "string" || typeof createdAt !== "string") {
    return null;
  }
  return { id: String(id), date, content, createdAt };
};

const toWorries = (raw: unknown): Worry[] | null => {
  if (!isObject(raw) || !Array.isArray(raw.worries)) return null;
  const list = raw.worries.map(toWorry);
  return list.every((w) => w != null) ? (list as Worry[]) : null;
};

const call = async <T>(
  method: "GET" | "POST",
  body: unknown,
  parse: (raw: unknown) => T | null,
): Promise<WorryResult<T>> => {
  const result = await authedRequest<unknown>(method, WORRIES_PATH, body, {
    timeoutMs: TIMEOUT_MS,
  });
  if (!result.ok) return { ok: false, code: mapError(result.error) };
  const data = parse(result.data);
  return data == null ? { ok: false, code: "malformed" } : { ok: true, data };
};

/** 걱정 하나를 맡겨 둔다 — 지금이 속한 하루에 더해진다 */
export const keepWorry = (content: string) => call("POST", { content }, toWorry);

/** 맡겨둔 걱정 전부(최신순) */
export const fetchWorries = () => call("GET", undefined, toWorries);
