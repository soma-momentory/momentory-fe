import type { EmotionId } from "@/features/emotion/model/emotion";
import type { RestMood, RestRecordContent } from "@/features/rest/model/restRecord";
import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 주간 리포트 공책 — `GET /api/v2/reports/weekly`.
 *
 * `date` 를 보내지 않으면 서버가 일기가 남은 가장 최근의 끝난 주를 고른다. 그 주를 처음 열면 서버가 AI 글을
 * 만드느라 몇 초 걸리므로 시간 제한이 일반 조회보다 길다. `scheduleApi.ts` 와 같은 결로 **던지지 않는다**.
 */
export const WEEKLY_BOOK_PATH = "/api/v2/reports/weekly";
/** 서버가 AI 를 15초까지 기다린다 — 그보다 조금 길게 둔다 */
export const WEEKLY_BOOK_TIMEOUT_MS = 20_000;

const EMOTION_IDS: Record<string, EmotionId> = {
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

const REST_CONTENTS: Record<string, RestRecordContent> = {
  SENSE_POND: "sense_pond",
  WORRY_BOX: "worry_box",
  TREASURE_BOX: "treasure_box",
  BODY_RELEASE: "body_release",
  MEDITATION: "meditation",
  WISH: "wish",
};

export type WeekTone = "NORMAL" | "HARD" | "CRISIS";

export type BookDay = { date: string; written: boolean; emotion: EmotionId | null };
export type BookWord = { date: string; label: string | null; fromLetter: boolean; text: string };
export type BookEmotion = { emotion: EmotionId; count: number; events: string[] };
export type BookOkMoment = {
  date: string;
  emotion: EmotionId;
  event: string | null;
  tasks: string[];
  betterRest: RestRecordContent | null;
};
export type BookRestPlace = { content: RestRecordContent } & Record<"total" | RestMood, number>;
export type BookRest = Record<"total" | RestMood, number> & {
  places: BookRestPlace[];
  soFar: { content: RestRecordContent | null; answered: number; better: number } | null;
};
export type BookDone = {
  completedCount: number;
  /** 일요일부터 토요일까지 일곱 칸 */
  perDay: number[];
  linked: { date: string; title: string }[];
};

export type WeeklyBook = {
  startDate: string;
  endDate: string;
  newest: boolean;
  diaryCount: number;
  detailed: boolean;
  tone: WeekTone;
  helpResources: string[];
  days: BookDay[];
  restCount: number;
  coverLine: string;
  review: string | null;
  goodWords: string | null;
  okLine: string | null;
  words: BookWord[];
  emotions: BookEmotion[];
  okMoments: BookOkMoment[];
  rest: BookRest;
  done: BookDone;
};

export type WeeklyBookFailureCode =
  "unauthorized" | "no_session" | "network" | "server" | "malformed" | "unconfigured";
export type WeeklyBookResult =
  { ok: true; data: WeeklyBook } | { ok: false; code: WeeklyBookFailureCode };

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): Json[] => (Array.isArray(v) ? v.filter(isObject) : []);
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
const text = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const emotionOf = (v: unknown): EmotionId | null =>
  typeof v === "string" ? (EMOTION_IDS[v] ?? null) : null;
const restOf = (v: unknown): RestRecordContent | null =>
  typeof v === "string" ? (REST_CONTENTS[v] ?? null) : null;

const mapError = (error: HttpError): WeeklyBookFailureCode => {
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
      return error.status === 401 ? "unauthorized" : "server";
  }
};

const tally = (v: Json) => ({
  total: count(v.total),
  better: count(v.better),
  same: count(v.same),
  unsure: count(v.unsure),
});

/** 모르는 감정 · 쉼터는 그 줄만 버린다 — 앱이 서버보다 오래되어도 화면이 깨지지 않게 */
export function parseWeeklyBook(value: unknown): WeeklyBook | null {
  if (!isObject(value)) return null;
  const { startDate, endDate, coverLine, days, tone } = value;
  if (typeof startDate !== "string" || typeof endDate !== "string") return null;
  if (typeof coverLine !== "string" || !Array.isArray(days) || days.length !== 7) return null;
  const rest = isObject(value.rest) ? value.rest : {};
  const done = isObject(value.done) ? value.done : {};
  const soFar = isObject(rest.soFar) ? rest.soFar : null;
  return {
    startDate,
    endDate,
    newest: value.newest === true,
    diaryCount: count(value.diaryCount),
    detailed: value.detailed === true,
    tone: tone === "HARD" || tone === "CRISIS" ? tone : "NORMAL",
    helpResources: strings(value.helpResources),
    days: list(days).map((d) => ({
      date: String(d.date),
      written: d.written === true,
      emotion: emotionOf(d.emotion),
    })),
    restCount: count(value.restCount),
    coverLine,
    review: text(value.review),
    goodWords: text(value.goodWords),
    okLine: text(value.okLine),
    words: list(value.words).flatMap((w) => {
      const said = text(w.text);
      return said == null
        ? []
        : [
            {
              date: String(w.date),
              label: text(w.label),
              fromLetter: w.fromLetter === true,
              text: said,
            },
          ];
    }),
    emotions: list(value.emotions).flatMap((e) => {
      const emotion = emotionOf(e.emotion);
      return emotion == null ? [] : [{ emotion, count: count(e.count), events: strings(e.events) }];
    }),
    okMoments: list(value.okMoments).flatMap((m) => {
      const emotion = emotionOf(m.emotion);
      return emotion == null
        ? []
        : [
            {
              date: String(m.date),
              emotion,
              event: text(m.event),
              tasks: strings(m.tasks),
              betterRest: restOf(m.betterRest),
            },
          ];
    }),
    rest: {
      ...tally(rest),
      places: list(rest.places).flatMap((p) => {
        const content = restOf(p.content);
        return content == null ? [] : [{ content, ...tally(p) }];
      }),
      soFar:
        soFar == null
          ? null
          : {
              content: restOf(soFar.content),
              answered: count(soFar.answered),
              better: count(soFar.better),
            },
    },
    done: {
      completedCount: count(done.completedCount),
      perDay: Array.isArray(done.perDay) ? done.perDay.map(count) : [0, 0, 0, 0, 0, 0, 0],
      linked: list(done.linked).map((t) => ({ date: String(t.date), title: String(t.title) })),
    },
  };
}

export async function fetchWeeklyBook(date: string | null): Promise<WeeklyBookResult> {
  const result = await authedRequest<unknown>(
    "GET",
    date == null ? WEEKLY_BOOK_PATH : `${WEEKLY_BOOK_PATH}?date=${encodeURIComponent(date)}`,
    undefined,
    { timeoutMs: WEEKLY_BOOK_TIMEOUT_MS },
  );
  if (!result.ok) return { ok: false, code: mapError(result.error) };
  const data = parseWeeklyBook(result.data);
  return data == null ? { ok: false, code: "malformed" } : { ok: true, data };
}
