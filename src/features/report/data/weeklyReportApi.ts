import type { EmotionId } from "@/features/emotion/model/emotion";
import { authedRequest, type HttpError } from "@/lib/http";

/**
 * 주간 리포트 — `GET /api/v1/reports/weekly` (`docs/api/openapi.json`).
 *
 * ```
 * GET /api/v1/reports/weekly?date=YYYY-MM-DD   200 WeeklyReportResponse
 * ```
 *
 * `date` 는 **그 주에 속한 아무 날**이면 되고 서버가 그 주의 일요일로 맞춘다.
 * 그래서 화면은 늘 일요일을 보내고, 돌아온 `startDate`·`endDate` 를 그대로 쓴다 —
 * 주 경계(일~토 · KST · 04:00 하루 경계)를 화면이 다시 계산하지 않는다.
 *
 * **리포트는 세는 화면이라 서버에 제 테이블이 없다**(BE `WeeklyReportService`).
 * 일정의 숨김·삭제 규칙도 일기의 하루 경계도 서버 안에서 이미 적용된 값이 온다 —
 * 여기서 다시 거르거나 더하지 않는다.
 *
 * **화면은 서버 모양을 보지 않는다.** 이 파일이 `WeeklyReport` 로 옮기고, 어긋나는
 * 자리는 아래에 적었다.
 *
 * | 서버                              | 여기서                                    |
 * | --------------------------------- | ----------------------------------------- |
 * | `emotion` 소문자 키(`calm`)       | 감정 id(1~9) — 모르는 키는 `null` 로 버린다 |
 * | `dailyMoods` 일곱 칸(일→토)       | 그대로. **일곱 칸이 아니면 어긋남**이다     |
 * | `*Count` int64                    | number                                     |
 * | `needs`·`practicedWishes`         | 없거나 모양이 어긋나면 **빈 목록**         |
 *
 * `scheduleApi.ts` 와 같은 결로 **던지지 않는다** — 전송 실패도 계약 위반도
 * `{ ok: false, code }` 다.
 */
export const WEEKLY_REPORT_PATH = "/api/v1/reports/weekly";

/** 짧은 조회다. LLM 턴 기준(25초)을 쓰면 실패한 요청이 그만큼 화면을 잡는다 */
export const WEEKLY_REPORT_TIMEOUT_MS = 8_000;

/** 한 주는 일곱 칸이다 — 서버가 기록 없는 날도 `emotion: null` 로 채워 보낸다 */
export const WEEK_LENGTH = 7;

/**
 * 서버 감정 키 → 감정 id.
 *
 * ⚠ **일정 API 의 표(`SCHEDULE_EMOTIONS`)와 다르다.** 서버 안에 감정 enum 이 두
 * 벌이고 3번의 이름이 갈린다(`angry` vs `ANGRY_FRUSTRATED`). 리포트는 일기와 같은
 * `retrospect/Emotion` 을 쓰므로 **소문자 키** 쪽이다 —
 * `features/retro/model/retro.ts` 의 `EMOTION_KEYS` 와 같은 값이지만, 그 파일은
 * 회고 store 라 여기서 끌어오면 리포트가 회고 상태를 함께 들게 된다. 표만 옮긴다.
 */
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

/**
 * 「이번 주에 찾은 바람」 한 알약 — 같은 단어가 여러 카드에 나오면 `count` 가 올라간다.
 * 화면이 `count ≥ 2` 인 것에만 「×2」를 붙인다(`WeekWishCard`).
 */
export type WeeklyNeed = {
  word: string;
  count: number;
};

/** 「이번 주에 실천한 바람」 한 줄 — 작은 행동을 안 정하고 해본 카드는 `action` 이 `null` 이다 */
export type PracticedWish = {
  action: string | null;
  /** 그 카드의 바람 단어 — 없을 수도 있다(감정 탐색을 하다 만 카드) */
  needs: string[];
};

/** 「이번 주의 마음」 한 칸 — 기록이 없는 날은 `emotion` 이 `null` 이고 `emotions` 가 빈 목록이다 */
export type WeeklyMoodDay = {
  /** `2026-08-17` */
  date: string;
  /** 점 하나가 맡는 대표 감정 */
  emotion: EmotionId | null;
  /** 그날 감정 **전부**(대표 감정이 맨 앞) — 점이 하나뿐이라 눌러야 나머지가 보인다 */
  emotions: EmotionId[];
};

/**
 * 한 주치 리포트 한 벌.
 *
 * ⚠ `actionCardCompleted` 는 **이 주에 만들어진** 카드 중 실천한 수다 — 지난주에
 * 만든 카드를 이번 주에 해봤다면 여기 잡히지 않는다(BE `WeeklyReport`). 일정도
 * 같은 결이라 「이 주에 잡힌 일정 중 완료된 수」다. 그래서 두 값은 **같은 분모를
 * 나눠 갖는 짝**이고, 화면이 「n개 중 m개」로 함께 읽을 수 있다.
 */
export type WeeklyReport = {
  /** 주 시작일(일요일) */
  startDate: string;
  /** 주 종료일(토요일) */
  endDate: string;
  /** 일→토 일곱 칸 */
  days: WeeklyMoodDay[];
  /** 가장 자주 느낀 감정 — 최다가 여럿이거나 기록이 없으면 `null` */
  dominantEmotion: EmotionId | null;
  /** 마음 요약 멘트 — **서버가 감정에 따라 고른 고정 문장**이다(AI 가 아니다) */
  moodMessage: string;
  scheduleTotal: number;
  scheduleCompleted: number;
  actionCardCreated: number;
  actionCardCompleted: number;
  /** 그 주에 찾은 바람 — 많이 나온 순. 카드가 없으면 빈 목록이다 */
  needs: WeeklyNeed[];
  /** 그 주에 실천한 바람 — 최신순. 길이가 곧 `actionCardCompleted` 다 */
  practicedWishes: PracticedWish[];
  /** 그 주에 일기를 남긴 날 수 — 일기는 하루 한 벌이라 곧 일기 수다 */
  diaryCount: number;
};

/** 실패 사유 — **코드**다. 화면 문구는 여기서 만들지 않는다 */
export type WeeklyReportFailureCode =
  /** 401 — 서버가 이 토큰을 거부했다 */
  | "unauthorized"
  /** 보낼 토큰이 없어 요청하지 않았다 (갱신 일시 실패가 여기 섞인다) */
  | "no_session"
  | "network"
  | "server"
  | "malformed"
  | "unconfigured";

export type WeeklyReportResult =
  { ok: true; data: WeeklyReport } | { ok: false; code: WeeklyReportFailureCode };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const mapError = (error: HttpError): WeeklyReportFailureCode => {
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

// ── 런타임 검증 ──────────────────────────────────────────────────────────

const asDate = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

/** 세는 값은 **음수가 될 수 없다**. 어긋나면 0 이 아니라 `null` 이다 — 지어내지 않는다 */
const asCount = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;

/** 모르는 감정 키는 **버린다** — 이름을 지어내지 않는다(`emotion.ts` 의 같은 규칙) */
const toEmotion = (v: unknown): EmotionId | null =>
  typeof v === "string" ? (EMOTION_IDS[v] ?? null) : null;

/**
 * 「찾은 바람」 한 알약 — 단어가 비었거나 세는 값이 어긋나면 **그 알약만 버린다**.
 *
 * ⚠ 셈(`*Count`)과 달리 **여기서 어긋남을 선언하지 않는다.** 이 목록은 리포트의 곁가지라
 * 한 알약이 이상하다고 한 주를 통째로 못 보게 할 이유가 없다 — 세는 값은 그대로 맞는다.
 */
const toNeed = (v: unknown): WeeklyNeed | null => {
  if (!isObject(v)) return null;
  const word = typeof v.word === "string" ? v.word.trim() : "";
  const count = asCount(v.count);
  if (word.length === 0 || count == null || count === 0) return null;
  return { word, count };
};

/** 「실천한 바람」 한 줄 — 행동은 비어 있을 수 있다(안 정하고 해본 카드) */
const toPracticedWish = (v: unknown): PracticedWish | null => {
  if (!isObject(v)) return null;
  const action =
    typeof v.action === "string" && v.action.trim().length > 0 ? v.action.trim() : null;
  const needs = Array.isArray(v.needs)
    ? v.needs
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
        .map((n) => n.trim())
    : [];
  return { action, needs };
};

/**
 * 목록 하나를 옮긴다 — **서버가 안 주면 빈 목록**이다.
 *
 * 옛 서버(필드가 없던 응답)에서도 리포트 나머지는 그대로 서야 한다 — 바람카드 자리만 조용히
 * 빈다. 새 필드를 셈과 같은 엄격함으로 다루면 배포 사이에 리포트 전체가 어긋남으로 닫힌다.
 */
const toList = <T>(v: unknown, map: (item: unknown) => T | null): T[] =>
  Array.isArray(v) ? v.map(map).filter((item): item is T => item != null) : [];

const toDay = (v: unknown): WeeklyMoodDay | null => {
  if (!isObject(v)) return null;
  const date = asDate(v.date);
  if (date == null) return null;

  // 대표 감정을 앞에 세우고 나머지 태그를 잇는다(중복·모르는 키 접기). 서버가 `emotions` 를
  // 안 주는 옛 응답이면 대표 감정 하나짜리가 된다 — 화면은 그대로 돈다.
  const emotion = toEmotion(v.emotion);
  const emotions: EmotionId[] = [];
  if (emotion != null) emotions.push(emotion);
  if (Array.isArray(v.emotions)) {
    for (const raw of v.emotions) {
      const e = toEmotion(raw);
      if (e != null && !emotions.includes(e)) emotions.push(e);
    }
  }
  return { date, emotion, emotions };
};

/**
 * `WeeklyReportResponse` → `WeeklyReport`.
 *
 * **일곱 칸을 못 채우면 통째로 어긋남**이다 — 요일 자리와 칸이 1:1 이라 몇 칸만
 * 버리면 화요일 색이 수요일에 가서 붙는다. 세는 값도 하나라도 어긋나면 어긋남으로
 * 닫는다(리포트는 셈이 전부인 화면이라 「일부만 맞는 리포트」가 성립하지 않는다).
 */
export const toWeeklyReport = (v: unknown): WeeklyReport | null => {
  if (!isObject(v)) return null;

  const startDate = asDate(v.startDate);
  const endDate = asDate(v.endDate);
  if (startDate == null || endDate == null) return null;

  if (!Array.isArray(v.dailyMoods)) return null;
  const days = v.dailyMoods.map(toDay);
  if (days.length !== WEEK_LENGTH || days.some((d) => d == null)) return null;

  const scheduleTotal = asCount(v.scheduleTotalCount);
  const scheduleCompleted = asCount(v.scheduleCompletedCount);
  const actionCardCreated = asCount(v.actionCardCreatedCount);
  const actionCardCompleted = asCount(v.actionCardCompletedCount);
  const diaryCount = asCount(v.diaryCount);
  if (
    scheduleTotal == null ||
    scheduleCompleted == null ||
    actionCardCreated == null ||
    actionCardCompleted == null ||
    diaryCount == null
  ) {
    return null;
  }

  return {
    startDate,
    endDate,
    days: days as WeeklyMoodDay[],
    dominantEmotion: toEmotion(v.dominantEmotion),
    // 멘트는 서버가 늘 채우지만, 없으면 **비운다** — 대신 쓸 문장을 여기서 짓지 않는다
    moodMessage: typeof v.moodMessage === "string" ? v.moodMessage.trim() : "",
    scheduleTotal,
    scheduleCompleted,
    actionCardCreated,
    actionCardCompleted,
    needs: toList(v.needs, toNeed),
    practicedWishes: toList(v.practicedWishes, toPracticedWish),
    diaryCount,
  };
};

// ── 호출 ────────────────────────────────────────────────────────────────

/**
 * 그 주의 리포트. `date` 는 그 주에 속한 아무 날이면 된다 — 화면은 일요일을 보낸다.
 * **던지지 않는다.**
 */
export const fetchWeeklyReport = async (date: string): Promise<WeeklyReportResult> => {
  const result = await authedRequest<unknown>(
    "GET",
    `${WEEKLY_REPORT_PATH}?date=${encodeURIComponent(date)}`,
    undefined,
    { timeoutMs: WEEKLY_REPORT_TIMEOUT_MS },
  );
  if (!result.ok) return { ok: false, code: mapError(result.error) };

  const report = toWeeklyReport(result.data);
  return report == null ? { ok: false, code: "malformed" } : { ok: true, data: report };
};
