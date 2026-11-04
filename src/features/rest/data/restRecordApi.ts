import { authedRequest, type HttpError } from "@/lib/http";

import type { RestMood, RestRecordContent } from "../model/restRecord";

/**
 * 쉼터 이용 기록 — `/api/v1/rest-records` 두 갈래 (2026-10-08 · BE `feat/rest-records`).
 *
 * ```
 * POST /api/v1/rest-records                    201 RestRecordResponse  { content, completed, mood? }
 * GET  /api/v1/rest-records?content=WORRY_BOX  200 { records: [RestRecordResponse] }  최신순
 * ```
 *
 * 끝까지 했으면 기분이 반드시 있고, 중간에 나갔으면 없다(서버가 400 으로 막는다).
 * 쉼터 안에서 쓴 글은 보내지 않는다. 속한 하루는 **서버가 정한다**(04:00 경계).
 * **던지지 않는다** — 실패는 코드로 닫는다(`treasureApi.ts` 와 같은 결).
 */
export const REST_RECORDS_PATH = "/api/v1/rest-records";

const TIMEOUT_MS = 8_000;

export type RestRecord = {
  id: string;
  content: RestRecordContent;
  /** 속한 하루 `YYYY-MM-DD` */
  date: string;
  completed: boolean;
  /** 끝까지 하지 않았으면 `null` */
  mood: RestMood | null;
  /** 남긴 시각(ISO) */
  createdAt: string;
};

export type RestRecordFailureCode =
  "unauthorized" | "no_session" | "network" | "server" | "malformed" | "unconfigured";

export type RestRecordResult<T> =
  { ok: true; data: T } | { ok: false; code: RestRecordFailureCode };

const CONTENTS = ["sense_pond", "worry_box", "treasure_box", "body_release", "wish"] as const;
const MOODS = ["better", "same", "unsure"] as const;

const mapError = (error: HttpError): RestRecordFailureCode => {
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

/** 서버 enum(`WORRY_BOX`) → 앱 이름(`worry_box`). 모르는 값이면 `null` */
const fromServer = <T extends string>(all: readonly T[], raw: unknown): T | null => {
  if (typeof raw !== "string") return null;
  const v = raw.toLowerCase();
  return (all as readonly string[]).includes(v) ? (v as T) : null;
};

/** 서버 한 줄 → `RestRecord`. 모양이 어긋나면 `null` */
export const toRestRecord = (raw: unknown): RestRecord | null => {
  if (!isObject(raw)) return null;
  const { id, date, completed, createdAt } = raw;
  const content = fromServer(CONTENTS, raw.content);
  const mood = raw.mood == null ? null : fromServer(MOODS, raw.mood);
  if (typeof id !== "number" && typeof id !== "string") return null;
  if (content == null || typeof date !== "string" || typeof completed !== "boolean") return null;
  if (typeof createdAt !== "string" || (raw.mood != null && mood == null)) return null;
  return { id: String(id), content, date, completed, mood, createdAt };
};

const toRestRecords = (raw: unknown): RestRecord[] | null => {
  if (!isObject(raw) || !Array.isArray(raw.records)) return null;
  const list = raw.records.map(toRestRecord);
  return list.every((r) => r != null) ? (list as RestRecord[]) : null;
};

const call = async <T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  parse: (raw: unknown) => T | null,
): Promise<RestRecordResult<T>> => {
  const result = await authedRequest<unknown>(method, path, body, { timeoutMs: TIMEOUT_MS });
  if (!result.ok) return { ok: false, code: mapError(result.error) };
  const data = parse(result.data);
  return data == null ? { ok: false, code: "malformed" } : { ok: true, data };
};

/** 기록 하나를 남긴다 — 끝까지 했으면 기분과 함께, 중간에 나갔으면 기분 없이 */
export const addRestRecord = (
  content: RestRecordContent,
  ending: { completed: true; mood: RestMood } | { completed: false },
) =>
  call(
    "POST",
    REST_RECORDS_PATH,
    {
      content: content.toUpperCase(),
      completed: ending.completed,
      mood: ending.completed ? ending.mood.toUpperCase() : null,
    },
    toRestRecord,
  );

/** 그 쉼터의 기록 — 최신순 */
export const fetchRestRecords = (content: RestRecordContent) =>
  call("GET", `${REST_RECORDS_PATH}?content=${content.toUpperCase()}`, undefined, toRestRecords);
