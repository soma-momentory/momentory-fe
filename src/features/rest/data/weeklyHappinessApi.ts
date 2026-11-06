import { authedRequest, type HttpResult } from "@/lib/http";

import {
  WEEKLY_HAPPINESS_CATEGORIES,
  type WeeklyHappinessEntries,
  type WeeklyHappinessKey,
} from "../model/weeklyHappiness";

/**
 * 주간 행복 기록장 — `/api/v1/weekly-happiness` 두 갈래 (2026-11-06 · BE `feat/weekly-happiness-entries`).
 *
 * ```
 * GET /api/v1/weekly-happiness?weekStart=YYYY-MM-DD   200 { weekStart, entries: [{ category, content }], firstWeekStart }
 * PUT /api/v1/weekly-happiness/{weekStart}            200 (GET 과 같다)   { entries: [{ category, content }] }
 * ```
 *
 * - 주는 **일~토**이고 `weekStart` 는 그 일요일이다(일요일 04:00 KST 경계 · 서버 `DayBoundary`).
 * - **쓰기는 이번 주만** 받는다 — 지난 주는 읽기만 한다(2026-11-06 결정). 지난 주를 보내면
 *   `400 WEEKLY_HAPPINESS_PAST_WEEK` 이다(주가 넘어가는 순간에 적고 있었을 때).
 * - PUT 은 그 주를 **통째로 바꾼다** — 보내지 않았거나 비운 칸은 지워진다. 같은 요청을 반복해도 같다.
 * - 글은 일기와 같은 등급의 사용자 글이다 — 계측에 넣지 않는다(`docs/ANALYTICS.md`).
 * - **던지지 않는다** — 실패는 코드로 닫는다.
 */
export const WEEKLY_HAPPINESS_PATH = "/api/v1/weekly-happiness";

const TIMEOUT_MS = 8_000;

export type WeeklyHappinessWeek = {
  weekStart: string;
  entries: WeeklyHappinessEntries;
  /** 적은 칸이 있는 첫 주 — 없으면 `null`. 지난 주를 넘겨 볼 수 있는 한계다 */
  firstWeekStart: string | null;
};

export type WeeklyHappinessFailure =
  /** 주가 넘어가 그 주는 이제 읽기만 된다 */
  "past_week" | "failed";

export type WeeklyHappinessResult =
  { ok: true; week: WeeklyHappinessWeek } | { ok: false; code: WeeklyHappinessFailure };

const SERVER_KEY: Record<WeeklyHappinessKey, string> = Object.fromEntries(
  WEEKLY_HAPPINESS_CATEGORIES.map((c) => [c.key, c.key.toUpperCase()]),
) as Record<WeeklyHappinessKey, string>;

const APP_KEY = new Map<string, WeeklyHappinessKey>(
  WEEKLY_HAPPINESS_CATEGORIES.map((c) => [c.key.toUpperCase(), c.key]),
);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** 서버 응답 → 한 주. 모양이 어긋나면 `null` · 모르는 칸은 버린다 */
export const toWeeklyHappinessWeek = (raw: unknown): WeeklyHappinessWeek | null => {
  if (!isObject(raw) || !isDay(raw.weekStart) || !Array.isArray(raw.entries)) return null;
  if (raw.firstWeekStart != null && !isDay(raw.firstWeekStart)) return null;
  const entries: WeeklyHappinessEntries = {};
  for (const item of raw.entries) {
    if (!isObject(item) || typeof item.category !== "string" || typeof item.content !== "string") {
      return null;
    }
    const key = APP_KEY.get(item.category);
    if (key != null) entries[key] = item.content;
  }
  return {
    weekStart: raw.weekStart,
    entries,
    firstWeekStart: raw.firstWeekStart ?? null,
  };
};

/** 화면의 칸 → 보낼 목록. 빈칸 · 공백만은 보내지 않는다(서버에서 지워진다) */
export const toEntriesBody = (entries: WeeklyHappinessEntries) => ({
  entries: WEEKLY_HAPPINESS_CATEGORIES.flatMap((c) => {
    const text = entries[c.key]?.trim() ?? "";
    return text === "" ? [] : [{ category: SERVER_KEY[c.key], content: text }];
  }),
});

const serverCode = (body: unknown): string | null =>
  isObject(body) && typeof body.code === "string" ? body.code : null;

const settle = (result: HttpResult<unknown>): WeeklyHappinessResult => {
  if (!result.ok) {
    const { error } = result;
    const pastWeek =
      error.code === "http" &&
      error.status === 400 &&
      serverCode(error.body) === "WEEKLY_HAPPINESS_PAST_WEEK";
    return { ok: false, code: pastWeek ? "past_week" : "failed" };
  }
  const week = toWeeklyHappinessWeek(result.data);
  return week == null ? { ok: false, code: "failed" } : { ok: true, week };
};

/** 한 주를 읽는다 — 이번 주 · 지난 주 */
export const fetchWeeklyHappiness = async (weekStart: string): Promise<WeeklyHappinessResult> =>
  settle(
    await authedRequest<unknown>(
      "GET",
      `${WEEKLY_HAPPINESS_PATH}?weekStart=${weekStart}`,
      undefined,
      { timeoutMs: TIMEOUT_MS },
    ),
  );

/** 이번 주 기록장을 통째로 남긴다 */
export const saveWeeklyHappiness = async (
  weekStart: string,
  entries: WeeklyHappinessEntries,
): Promise<WeeklyHappinessResult> =>
  settle(
    await authedRequest<unknown>(
      "PUT",
      `${WEEKLY_HAPPINESS_PATH}/${weekStart}`,
      toEntriesBody(entries),
      { timeoutMs: TIMEOUT_MS },
    ),
  );
