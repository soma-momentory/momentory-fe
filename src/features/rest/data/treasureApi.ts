import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 오늘의 보물함 — `/api/v1/treasures` 두 갈래 (2026-10-05 · BE `feat/treasures`).
 *
 * ```
 * POST /api/v1/treasures                 201 TreasureResponse   { content }
 * GET  /api/v1/treasures?date=YYYY-MM-DD 200 { treasures: [TreasureResponse] }  그날 · 담은 순서
 * GET  /api/v1/treasures                 200 { treasures: [TreasureResponse] }  전부 · 최신순
 * ```
 *
 * 속한 하루는 **서버가 정한다**(담은 순간의 04:00 경계 날짜) — 앱은 날짜를 보내지 않는다.
 * 본문은 일기와 같은 등급의 사용자 글이다 — 계측에 넣지 않는다(`docs/ANALYTICS.md`).
 * **던지지 않는다** — 실패는 코드로 닫는다(`scheduleApi.ts` 와 같은 결).
 */
export const TREASURES_PATH = "/api/v1/treasures";

/** 짧은 조회 · 쓰기다 — LLM 턴 기준(25초)을 쓰면 실패가 그만큼 화면을 잡는다 */
const TIMEOUT_MS = 8_000;

export type Treasure = {
  id: string;
  /** 속한 하루 `YYYY-MM-DD` */
  date: string;
  content: string;
  /** 담은 시각(ISO) */
  createdAt: string;
};

export type TreasureFailureCode =
  "unauthorized" | "no_session" | "network" | "server" | "malformed" | "unconfigured";

export type TreasureResult<T> = { ok: true; data: T } | { ok: false; code: TreasureFailureCode };

const mapError = (error: HttpError): TreasureFailureCode => {
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

/** 서버 한 줄 → `Treasure`. 모양이 어긋나면 `null` */
export const toTreasure = (raw: unknown): Treasure | null => {
  if (!isObject(raw)) return null;
  const { id, date, content, createdAt } = raw;
  if (typeof id !== "number" && typeof id !== "string") return null;
  if (typeof date !== "string" || typeof content !== "string" || typeof createdAt !== "string") {
    return null;
  }
  return { id: String(id), date, content, createdAt };
};

const toTreasures = (raw: unknown): Treasure[] | null => {
  if (!isObject(raw) || !Array.isArray(raw.treasures)) return null;
  const list = raw.treasures.map(toTreasure);
  return list.every((t) => t != null) ? (list as Treasure[]) : null;
};

const call = async <T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  parse: (raw: unknown) => T | null,
): Promise<TreasureResult<T>> => {
  const result = await authedRequest<unknown>(method, path, body, { timeoutMs: TIMEOUT_MS });
  if (!result.ok) return { ok: false, code: mapError(result.error) };
  const data = parse(result.data);
  return data == null ? { ok: false, code: "malformed" } : { ok: true, data };
};

/** 보물 하나를 담는다 — 지금이 속한 하루에 더해진다 */
export const addTreasure = (content: string) =>
  call("POST", TREASURES_PATH, { content }, toTreasure);

/** 그날의 보물(담은 순서) — 날짜가 없으면 모든 보물(최신순) */
export const fetchTreasures = (date?: string) =>
  call(
    "GET",
    date == null ? TREASURES_PATH : `${TREASURES_PATH}?date=${encodeURIComponent(date)}`,
    undefined,
    toTreasures,
  );
