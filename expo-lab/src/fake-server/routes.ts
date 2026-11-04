/**
 * 엔드포인트 표 — 앱 어댑터(`src/features/*\/data/*.ts`)가 부르는 모든 경로. 응답 모양은 그 어댑터의
 * 런타임 검증을 통과하는 꼴이다(서버처럼 `NON_NULL` — 비어 있는 필드는 아예 싣지 않는다).
 *
 * 핸들러는 순수하다: `Ctx`(DB · 지금 시각)와 요청을 받아 `{ status, body }` 를 돌려준다.
 * 쓰기가 있었는지는 `ctx.wrote` 로 알린다 — 그때만 localStorage 에 남긴다.
 */
import {
  nextId,
  SCHEDULE_EMOTIONS,
  type ActionCardRow,
  type DiaryRow,
  type FakeDb,
  type LetterRow,
  type NoteRow,
  type Profile,
  type RestContent,
  type RestMood,
  type ScheduleEmotion,
  type ScheduleRow,
} from "./db";
import { currentWeather, deliverLetters, diaryOn, diaryWeatherLine, weeklyReport } from "./derive";
import { isEmotionKey, startSession, takeTurn, type RetroCtx } from "./retro";
import { LAB_USER_ID, LATEST_ONBOARDING_VERSION, profileFor } from "./seed";
import { addDays, dayOfIso, isDay, isHhmm } from "./time";

export type Ctx = {
  db: FakeDb;
  nowMs: number;
  today: string;
  /** 「오늘 다시 쓰기」(`LabFrameConfig.repeatToday` · 기본 켜짐) */
  repeatToday: boolean;
  /** 새 기록의 createdAt — 같은 고정 시각에서도 순서가 서도록 1ms 씩 민다 */
  stamp: () => string;
  wrote: boolean;
};

export type FakeRequest = {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  authorized: boolean;
};

export type FakeResponse = { status: number; body?: unknown };

const json = (body: unknown, status = 200): FakeResponse => ({ status, body });
const noContent = (): FakeResponse => ({ status: 204 });
const error = (status: number, code: string, message?: string): FakeResponse => ({
  status,
  body: { code, ...(message ? { message } : {}) },
});
const invalid = (message = "요청 값이 올바르지 않아요") => error(400, "INVALID_REQUEST", message);
const notFound = (code = "NOT_FOUND") => error(404, code, "찾을 수 없어요");

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown, max = 10_000): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const omitNull = <T extends Record<string, unknown>>(o: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== null && v !== undefined),
  ) as Partial<T>;

// ── DTO ────────────────────────────────────────────────────────────────

const scheduleDto = (s: ScheduleRow) => ({
  id: s.id,
  date: s.date,
  title: s.title,
  completed: s.completed,
  emotion: s.emotion,
  displayOrder: s.displayOrder,
  source: s.source,
  hidden: s.hidden,
});

const diaryDto = (d: DiaryRow) =>
  omitNull({
    id: d.id,
    retrospectId: d.retrospectId,
    primaryEmotion: d.primaryEmotion,
    emotions: d.emotions,
    original: d.original,
    createdAt: d.createdAt,
    weather: d.weather,
  });

const cardDto = (c: ActionCardRow) =>
  omitNull({
    id: c.id,
    retrospectId: c.retrospectId,
    situation: c.situation,
    emotions: c.emotions,
    needs: c.needs,
    desiredState: c.desiredState,
    targetAction: c.targetAction,
    sentiment: c.sentiment,
    done: c.done,
    doneAt: c.doneAt,
    reflection: c.reflection,
    createdDate: dayOfIso(c.createdAt),
    createdAt: c.createdAt,
  });

/** 「새 편지」 = 오늘 아침 받은 편지(어제 일기의 편지). 요청 시각으로 판정한다 */
const letterSummary = (l: LetterRow, ctx: Ctx) => ({
  id: l.id,
  date: l.date,
  isNew: l.date === addDays(ctx.today, -1),
  openedAt: l.openedAt,
});

const letterDto = (l: LetterRow, ctx: Ctx) => ({
  ...letterSummary(l, ctx),
  status: l.status,
  quote: l.quote,
  insight: l.insight,
  tonightQuestion: l.tonightQuestion,
  actions: l.actions.map((a) => omitNull({ ...a })),
  helplines: l.helplines,
});

const noteDto = (n: NoteRow) => ({ ...n });

const meDto = (db: FakeDb) => {
  const u = db.user;
  return {
    userId: u.userId,
    role: "USER",
    onboardingRequired: u.onboardingRequired,
    ...(u.onboardingVersion == null ? {} : { onboardingVersion: u.onboardingVersion }),
    latestOnboardingVersion: LATEST_ONBOARDING_VERSION,
    ...(u.profile == null ? {} : { profile: u.profile }),
  };
};

const needsOnboarding = (db: FakeDb) =>
  db.user.onboardingRequired || (db.user.onboardingVersion ?? 0) < LATEST_ONBOARDING_VERSION;

// ── 도움 ───────────────────────────────────────────────────────────────

const inMonth = (iso: string, year: number, month: number) => {
  const day = dayOfIso(iso);
  return day != null && day.startsWith(`${year}-${String(month).padStart(2, "0")}-`);
};

const yearMonth = (q: URLSearchParams): { year: number; month: number } | null => {
  const year = Number(q.get("year"));
  const month = Number(q.get("month"));
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
    ? { year, month }
    : null;
};

const byOrder = (a: ScheduleRow, b: ScheduleRow) =>
  a.date.localeCompare(b.date) || a.displayOrder - b.displayOrder || a.id - b.id;

const newestFirst = <T extends { createdAt: string; id: number }>(list: readonly T[]) =>
  [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);

/** 오늘 일기와 거기 딸린 바람카드 · 편지를 지운다(「오늘 다시 쓰기」) */
const clearToday = (ctx: Ctx) => {
  const { db } = ctx;
  const gone = db.diaries.filter((d) => dayOfIso(d.createdAt) === ctx.today);
  const retros = new Set(gone.map((d) => d.retrospectId).filter((r): r is number => r != null));
  db.diaries = db.diaries.filter((d) => !gone.includes(d));
  db.actionCards = db.actionCards.filter((c) => !retros.has(c.retrospectId));
  db.letters = db.letters.filter((l) => l.date !== ctx.today);
};

const retroCtx = (ctx: Ctx): RetroCtx => ({
  db: ctx.db,
  today: ctx.today,
  stamp: ctx.stamp,
  clearToday: () => clearToday(ctx),
});

const tokens = (n: number) => ({
  tokenType: "Bearer",
  accessToken: `lab-access-${n}`,
  refreshToken: `lab-refresh-${n}`,
  accessTokenExpiresIn: 3600,
});

const GENDERS = ["MALE", "FEMALE", "UNSPECIFIED"] as const;
const REST_CONTENTS: readonly RestContent[] = [
  "SENSE_POND",
  "WORRY_BOX",
  "TREASURE_BOX",
  "BODY_RELEASE",
  "WISH",
];
const REST_MOODS: readonly RestMood[] = ["BETTER", "SAME", "UNSURE"];
const INQUIRY_CATEGORIES = ["BUG", "SUGGESTION", "ACCOUNT", "ETC"];

export const ONBOARDING_OPTIONS = {
  nickname: { maxLength: 10, duplicateAllowed: true },
  genders: [
    { code: "MALE", label: "남성" },
    { code: "FEMALE", label: "여성" },
    { code: "UNSPECIFIED", label: "선택 안 함" },
  ],
  interestAreas: [
    { code: "STUDY", label: "학업" },
    { code: "CAREER", label: "취업·진로" },
    { code: "WORK", label: "일·직장생활" },
    { code: "RELATIONSHIP", label: "인간관계" },
    { code: "FAMILY", label: "가족" },
    { code: "SELF", label: "나 자신" },
    { code: "HEALTH", label: "건강" },
    { code: "OTHER", label: "기타" },
  ],
  restMethods: [
    { code: "SLEEP", label: "잠자기" },
    { code: "MEDITATION", label: "명상하기" },
    { code: "ENJOYING_FOOD", label: "맛있는 음식 먹기" },
    { code: "LISTENING_TO_MUSIC", label: "음악 듣기" },
    { code: "WATCHING_MOVIES_OR_DRAMAS", label: "영화·드라마 보기" },
    { code: "READING", label: "독서하기" },
    { code: "WRITING", label: "글쓰기" },
    { code: "VISITING_A_CAFE", label: "카페 가기" },
    { code: "WALKING", label: "산책하기" },
    { code: "TALKING_WITH_CLOSE_PEOPLE", label: "가까운 사람과 대화하기" },
    { code: "EXERCISE", label: "운동하기" },
    { code: "GAMING", label: "게임하기" },
    { code: "VARIES_BY_DAY", label: "그때마다 달라요" },
    { code: "IDLE_REST", label: "멍하니 쉬기" },
    { code: "OTHER", label: "기타" },
  ],
  reflectionTimeFormat: "HH:mm",
  defaultTimeZone: "Asia/Seoul",
};

const codes = (v: unknown, allowed: readonly { code: string }[]): string[] | null => {
  if (!Array.isArray(v)) return null;
  return v.every((c) => typeof c === "string" && allowed.some((a) => a.code === c))
    ? (v as string[])
    : null;
};

/** 두 판 온보딩이 같이 쓰는 기본 칸 검사 */
const baseProfileFields = (b: Record<string, unknown>) => {
  if (!isText(b.nickname) || b.nickname.trim().length > ONBOARDING_OPTIONS.nickname.maxLength)
    return null;
  if (!(
    b.age === null ||
    b.age === undefined ||
    (Number.isInteger(b.age) && (b.age as number) >= 0)
  ))
    return null;
  if (!GENDERS.includes(b.gender as (typeof GENDERS)[number])) return null;
  if (!isHhmm(b.reflectionTime)) return null;
  if (
    typeof b.calendarIntegrationEnabled !== "boolean" ||
    typeof b.notificationEnabled !== "boolean"
  )
    return null;
  return {
    nickname: b.nickname.trim(),
    age: (b.age as number | null | undefined) ?? null,
    gender: b.gender as Profile["gender"],
    reflectionTime: b.reflectionTime,
    calendarIntegrationEnabled: b.calendarIntegrationEnabled,
    notificationEnabled: b.notificationEnabled,
  };
};

const finishOnboarding = (ctx: Ctx, profile: Profile, answers: Record<string, unknown> | null) => {
  const u = ctx.db.user;
  u.profile = profile;
  u.onboardingRequired = false;
  u.onboardingVersion = LATEST_ONBOARDING_VERSION;
  if (answers) u.onboardingAnswers = answers;
  ctx.wrote = true;
  return json({ userId: u.userId, onboardingRequired: false });
};

const findSchedule = (ctx: Ctx, id: string) => ctx.db.schedules.find((s) => String(s.id) === id);

// ── 표 ─────────────────────────────────────────────────────────────────

type Handler = (ctx: Ctx, req: FakeRequest, params: string[]) => FakeResponse;
type Route = { method: string; pattern: RegExp; handler: Handler; open?: boolean };

const route = (method: string, path: string, handler: Handler, open = false): Route => ({
  method,
  pattern: new RegExp(`^${path.replace(/:[a-zA-Z]+/g, "([^/]+)")}$`),
  handler,
  open,
});

const login =
  (field: string): Handler =>
  (ctx, req) => {
    if (!isObject(req.body) || !isText(req.body[field])) return invalid();
    return json({
      ...tokens(ctx.db.seq),
      userId: ctx.db.user.userId,
      onboardingRequired: needsOnboarding(ctx.db),
    });
  };

const ROUTES: Route[] = [
  // ── 인증 ──
  route("POST", "/api/v1/auth/kakao", login("accessToken"), true),
  route("POST", "/api/v1/auth/apple", login("identityToken"), true),
  route("POST", "/api/v1/auth/google", login("idToken"), true),
  route(
    "POST",
    "/api/v1/auth/reissue",
    (ctx, req) =>
      isObject(req.body) && isText(req.body.refreshToken)
        ? json(tokens(ctx.db.seq + 1000))
        : error(401, "REFRESH_TOKEN_INVALID"),
    true,
  ),
  route("POST", "/api/v1/auth/logout", () => noContent(), true),

  // ── 나 ──
  route("GET", "/api/v1/users/me", (ctx) => json(meDto(ctx.db))),
  route("DELETE", "/api/v1/users/me", (ctx) => {
    // 탈퇴 — 기록을 모두 지우고 「온보딩 전」 사용자로 돌아간다(다시 로그인하면 새 사용자)
    const seq = ctx.db.seq;
    Object.assign(ctx.db, {
      seq,
      user: {
        userId: LAB_USER_ID,
        onboardingRequired: true,
        onboardingVersion: null,
        profile: null,
        onboardingAnswers: null,
      },
      schedules: [],
      diaries: [],
      actionCards: [],
      letters: [],
      restRecords: [],
      treasures: [],
      worries: [],
      inquiries: [],
      retroSessions: [],
    });
    ctx.wrote = true;
    return noContent();
  }),
  route("PUT", "/api/v1/users/me/letter-time", (ctx, req) => {
    const b = req.body;
    if (!isObject(b) || !isHhmm(b.letterTime) || typeof b.notificationEnabled !== "boolean")
      return invalid();
    const profile = ctx.db.user.profile;
    if (profile == null) return error(409, "ONBOARDING_REQUIRED");
    profile.letterTime = b.letterTime;
    profile.letterNotificationEnabled = b.notificationEnabled;
    ctx.wrote = true;
    return json({ letterTime: b.letterTime, notificationEnabled: b.notificationEnabled });
  }),
  route("PUT", "/api/v1/users/me/onboarding", (ctx, req) => {
    const b = req.body;
    if (!isObject(b)) return invalid();
    const base = baseProfileFields(b);
    const interests = codes(b.interestAreas, ONBOARDING_OPTIONS.interestAreas);
    const rests =
      b.restMethods === null ? null : codes(b.restMethods, ONBOARDING_OPTIONS.restMethods);
    if (base == null || interests == null) return invalid();
    if (b.restMethods !== null && (rests == null || rests.length === 0)) return invalid();
    const prev = ctx.db.user.profile ?? profileFor(base.nickname);
    return finishOnboarding(
      ctx,
      {
        ...prev,
        ...base,
        interestAreas: interests,
        otherInterestDetail:
          typeof b.otherInterestDetail === "string" ? b.otherInterestDetail : null,
        restMethods: rests ?? prev.restMethods,
        otherRestMethodDetail:
          typeof b.otherRestMethodDetail === "string" ? b.otherRestMethodDetail : null,
      },
      null,
    );
  }),
  route("PUT", "/api/v2/users/me/onboarding", (ctx, req) => {
    const b = req.body;
    if (!isObject(b)) return invalid();
    const base = baseProfileFields(b);
    if (base == null || !Array.isArray(b.goals)) return invalid();
    const prev = ctx.db.user.profile;
    return finishOnboarding(
      ctx,
      {
        interestAreas: [],
        otherInterestDetail: null,
        restMethods: [],
        otherRestMethodDetail: null,
        letterNotificationEnabled: true,
        letterTime: "08:00",
        ...prev,
        ...base,
      },
      {
        moodChange: b.moodChange ?? null,
        knowWhy: b.knowWhy ?? null,
        dayEnd: b.dayEnd ?? null,
        diaryHistory: b.diaryHistory ?? null,
        goals: b.goals,
      },
    );
  }),
  route("GET", "/api/v1/onboarding/options", () => json(ONBOARDING_OPTIONS)),

  // ── 일정 ──
  route("GET", "/api/v1/schedules", (ctx, req) => {
    const date = req.query.get("date");
    if (!isDay(date)) return invalid();
    return json({
      schedules: ctx.db.schedules
        .filter((s) => s.date === date)
        .sort(byOrder)
        .map(scheduleDto),
    });
  }),
  route("GET", "/api/v1/schedules/period", (ctx, req) => {
    const from = req.query.get("from");
    const to = req.query.get("to");
    if (!isDay(from) || !isDay(to) || from > to) return invalid();
    return json({
      schedules: ctx.db.schedules
        .filter((s) => s.date >= from && s.date <= to)
        .sort(byOrder)
        .map(scheduleDto),
    });
  }),
  route("POST", "/api/v1/schedules", (ctx, req) => {
    const b = req.body;
    if (!isObject(b) || !isDay(b.date) || !isText(b.title, 200)) return invalid();
    const date = b.date;
    const order =
      Math.max(-1, ...ctx.db.schedules.filter((s) => s.date === date).map((s) => s.displayOrder)) +
      1;
    const row: ScheduleRow = {
      id: nextId(ctx.db),
      date,
      title: b.title.trim(),
      source: "MANUAL",
      hidden: false,
      completed: false,
      emotion: null,
      displayOrder: order,
      externalId: null,
    };
    ctx.db.schedules.push(row);
    ctx.wrote = true;
    return json(scheduleDto(row), 201);
  }),
  route("PATCH", "/api/v1/schedules/order", (ctx, req) => {
    const b = req.body;
    if (!isObject(b) || !isDay(b.date) || !Array.isArray(b.scheduleIds)) return invalid();
    const ids = b.scheduleIds as unknown[];
    if (!ids.every((id) => typeof id === "number")) return invalid();
    ids.forEach((id, i) => {
      const s = ctx.db.schedules.find((x) => x.id === id && x.date === b.date);
      if (s) s.displayOrder = i;
    });
    ctx.wrote = true;
    return noContent();
  }),
  route("POST", "/api/v1/schedules/sync", (ctx, req) => {
    const b = req.body;
    if (!isObject(b) || !isDay(b.from) || !isDay(b.to) || !Array.isArray(b.events))
      return invalid();
    const from = b.from;
    const to = b.to;
    const events = (b.events as unknown[]).filter(
      (e): e is { externalId: string; date: string; title: string } =>
        isObject(e) && isText(e.externalId) && isDay(e.date) && isText(e.title),
    );
    let created = 0;
    let updated = 0;
    let deleted = 0;
    const seen = new Set<string>();
    for (const e of events) {
      seen.add(e.externalId);
      const row = ctx.db.schedules.find(
        (s) => s.source === "CALENDAR" && s.externalId === e.externalId,
      );
      if (row) {
        if (row.title !== e.title || row.date !== e.date) {
          row.title = e.title;
          row.date = e.date;
          updated++;
        }
      } else {
        const order =
          Math.max(
            -1,
            ...ctx.db.schedules.filter((s) => s.date === e.date).map((s) => s.displayOrder),
          ) + 1;
        ctx.db.schedules.push({
          id: nextId(ctx.db),
          date: e.date,
          title: e.title,
          source: "CALENDAR",
          hidden: false,
          completed: false,
          emotion: null,
          displayOrder: order,
          externalId: e.externalId,
        });
        created++;
      }
    }
    // 시드의 캘린더 일정(`lab-cal-*`)은 실제 기기 캘린더에 없으니 지우지 않는다 — 데이터 세트를 지킨다
    const before = ctx.db.schedules.length;
    ctx.db.schedules = ctx.db.schedules.filter(
      (s) =>
        s.source !== "CALENDAR" ||
        s.date < from ||
        s.date > to ||
        seen.has(s.externalId ?? "") ||
        (s.externalId ?? "").startsWith("lab-cal-"),
    );
    deleted = before - ctx.db.schedules.length;
    if (created + updated + deleted > 0) ctx.wrote = true;
    return json({ created, updated, deleted });
  }),
  route("PATCH", "/api/v1/schedules/:id/visibility", (ctx, req, [id]) => {
    const s = findSchedule(ctx, id!);
    if (!s) return notFound("SCHEDULE_NOT_FOUND");
    if (!isObject(req.body) || typeof req.body.hidden !== "boolean") return invalid();
    s.hidden = req.body.hidden;
    ctx.wrote = true;
    return json({ scheduleId: s.id, hidden: s.hidden });
  }),
  route("PUT", "/api/v1/schedules/:id/completion", (ctx, req, [id]) => {
    const s = findSchedule(ctx, id!);
    if (!s) return notFound("SCHEDULE_NOT_FOUND");
    const b = req.body;
    if (!isObject(b) || typeof b.completed !== "boolean") return invalid();
    const emotion = b.emotion ?? null;
    if (emotion !== null && !SCHEDULE_EMOTIONS.includes(emotion as ScheduleEmotion))
      return invalid();
    if (!b.completed && emotion !== null)
      return invalid("완료하지 않은 일정에는 감정을 남길 수 없어요");
    s.completed = b.completed;
    s.emotion = emotion as ScheduleEmotion | null;
    ctx.wrote = true;
    return json({ scheduleId: s.id, completed: s.completed, emotion: s.emotion });
  }),
  route("PATCH", "/api/v1/schedules/:id", (ctx, req, [id]) => {
    const s = findSchedule(ctx, id!);
    if (!s) return notFound("SCHEDULE_NOT_FOUND");
    const b = req.body;
    if (!isObject(b) || !isDay(b.date) || !isText(b.title, 200)) return invalid();
    if (b.date !== s.date) {
      const date = b.date;
      s.displayOrder =
        Math.max(
          -1,
          ...ctx.db.schedules.filter((x) => x.date === date).map((x) => x.displayOrder),
        ) + 1;
    }
    s.date = b.date;
    s.title = b.title.trim();
    ctx.wrote = true;
    return json(scheduleDto(s));
  }),
  route("DELETE", "/api/v1/schedules/:id", (ctx, _req, [id]) => {
    const s = findSchedule(ctx, id!);
    if (!s) return notFound("SCHEDULE_NOT_FOUND");
    ctx.db.schedules = ctx.db.schedules.filter((x) => x !== s);
    ctx.wrote = true;
    return noContent();
  }),

  // ── 일기 ──
  route("GET", "/api/v1/diaries", (ctx, req) => {
    const ym = yearMonth(req.query);
    if (ym == null) return invalid();
    const diaries = ctx.db.diaries
      .filter((d) => inMonth(d.createdAt, ym.year, ym.month))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return json({ diaries: diaries.map(diaryDto) });
  }),
  route("GET", "/api/v1/diaries/all", (ctx) =>
    json({ diaries: newestFirst(ctx.db.diaries).map(diaryDto) }),
  ),
  route("POST", "/api/v1/diaries", (ctx, req) => {
    const b = req.body;
    if (!isObject(b) || !isText(b.original, 5000)) return invalid();
    if (b.emotion != null && !isEmotionKey(b.emotion)) return invalid();
    if (diaryOn(ctx.db, ctx.today) != null) {
      if (!ctx.repeatToday) return error(409, "DIARY_ALREADY_WRITTEN", "오늘은 이미 일기를 썼어요");
      clearToday(ctx);
    }
    const emotion = isEmotionKey(b.emotion) ? b.emotion : null;
    const row: DiaryRow = {
      id: nextId(ctx.db),
      retrospectId: null,
      primaryEmotion: emotion,
      emotions: emotion ? [emotion] : [],
      original: b.original.trim(),
      createdAt: ctx.stamp(),
      weather: null,
      letterPending: true,
    };
    ctx.db.diaries.push(row);
    ctx.wrote = true;
    return json(diaryDto(row), 201);
  }),
  route("PUT", "/api/v1/diaries/by-retrospect/:id", (ctx, req, [id]) => {
    const d = ctx.db.diaries.find((x) => String(x.retrospectId) === id);
    if (!d) return notFound("DIARY_NOT_FOUND");
    if (!isObject(req.body) || !isText(req.body.original, 5000)) return invalid();
    d.original = req.body.original.trim();
    ctx.wrote = true;
    return json(diaryDto(d));
  }),
  route("PUT", "/api/v1/diaries/:id/weather", (ctx, req, [id]) => {
    const d = ctx.db.diaries.find((x) => String(x.id) === id);
    if (!d) return notFound("DIARY_NOT_FOUND");
    const b = req.body;
    if (!isObject(b) || typeof b.latitude !== "number" || typeof b.longitude !== "number")
      return invalid();
    d.weather = diaryWeatherLine(ctx.nowMs);
    ctx.wrote = true;
    return json(diaryDto(d));
  }),
  route("GET", "/api/v1/diaries/:id", (ctx, _req, [id]) => {
    const d = ctx.db.diaries.find((x) => String(x.id) === id);
    return d ? json(diaryDto(d)) : notFound("DIARY_NOT_FOUND");
  }),
  route("PUT", "/api/v1/diaries/:id", (ctx, req, [id]) => {
    const d = ctx.db.diaries.find((x) => String(x.id) === id);
    if (!d) return notFound("DIARY_NOT_FOUND");
    if (!isObject(req.body) || !isText(req.body.original, 5000)) return invalid();
    d.original = req.body.original.trim();
    ctx.wrote = true;
    return json(diaryDto(d));
  }),
  route("DELETE", "/api/v1/diaries/:id", (ctx, _req, [id]) => {
    const d = ctx.db.diaries.find((x) => String(x.id) === id);
    if (!d) return notFound("DIARY_NOT_FOUND");
    ctx.db.diaries = ctx.db.diaries.filter((x) => x !== d);
    // 그 일기의 편지도 함께 지운다(서버 FK cascade). 바람카드는 남는다
    const day = dayOfIso(d.createdAt);
    ctx.db.letters = ctx.db.letters.filter((l) => l.date !== day);
    ctx.wrote = true;
    return noContent();
  }),

  // ── 바람카드 ──
  route("GET", "/api/v1/action-cards", (ctx, req) => {
    const ym = yearMonth(req.query);
    if (ym == null) return invalid();
    const cards = ctx.db.actionCards.filter((c) => inMonth(c.createdAt, ym.year, ym.month));
    return json({ actionCards: cards.map(cardDto) });
  }),
  route("PUT", "/api/v1/action-cards/:id/completion", (ctx, req, [id]) => {
    const c = ctx.db.actionCards.find((x) => String(x.id) === id);
    if (!c) return notFound("ACTION_CARD_NOT_FOUND");
    const b = req.body;
    if (!isObject(b) || typeof b.done !== "boolean") return invalid();
    if (b.done) {
      if (b.reflection != null && !isText(b.reflection, 1000)) return invalid();
      c.done = true;
      c.doneAt = c.doneAt ?? new Date(ctx.nowMs).toISOString();
      c.reflection = typeof b.reflection === "string" ? b.reflection.trim() : null;
    } else {
      if (b.reflection != null) return invalid("되돌릴 때는 느낀 점을 보낼 수 없어요");
      c.done = false;
      c.doneAt = null;
      c.reflection = null;
    }
    ctx.wrote = true;
    return json(cardDto(c));
  }),
  route("DELETE", "/api/v1/action-cards/:id", (ctx, _req, [id]) => {
    const c = ctx.db.actionCards.find((x) => String(x.id) === id);
    if (!c) return notFound("ACTION_CARD_NOT_FOUND");
    ctx.db.actionCards = ctx.db.actionCards.filter((x) => x !== c);
    ctx.wrote = true;
    return noContent();
  }),

  // ── 회고 ──
  route("POST", "/api/v1/retrospect", (ctx, req) => {
    const b = req.body;
    if (!isObject(b) || !Array.isArray(b.schedules)) return invalid();
    const schedules = (b.schedules as unknown[])
      .filter((s): s is Record<string, unknown> => isObject(s) && isText(s.name))
      .map((s) => ({
        name: String(s.name),
        ...(typeof s.id === "number" ? { id: s.id } : {}),
        ...(typeof s.completed === "boolean" ? { completed: s.completed } : {}),
      }));
    if (!ctx.repeatToday) {
      const doneToday = ctx.db.retroSessions.some(
        (s) => s.day === ctx.today && s.step === "complete",
      );
      if (doneToday || diaryOn(ctx.db, ctx.today) != null)
        return error(409, "ALREADY_RETROSPECTED_TODAY", "오늘은 이미 회고를 마쳤어요");
    }
    const nickname = typeof b.nickname === "string" && b.nickname.trim() ? b.nickname.trim() : null;
    const started = startSession(retroCtx(ctx), { schedules, nickname });
    ctx.wrote = true;
    return json(started, 201);
  }),
  route("POST", "/api/v1/retrospect/:id/messages", (ctx, req, [id]) => {
    const s = ctx.db.retroSessions.find((x) => String(x.id) === id);
    if (!s) return notFound("RETROSPECT_SESSION_NOT_FOUND");
    const b = req.body;
    if (!isObject(b)) return invalid();
    const content = isText(b.content, 5000) ? b.content : undefined;
    const optionIds =
      Array.isArray(b.optionIds) && b.optionIds.every((x) => typeof x === "string")
        ? (b.optionIds as string[])
        : undefined;
    if ((content == null) === (optionIds == null)) return invalid();
    const result = takeTurn(retroCtx(ctx), s, { content, optionIds });
    ctx.wrote = true;
    return result.ok ? json(result.reply) : error(result.status, result.code);
  }),

  // ── 날씨 ──
  route("POST", "/api/v1/weather/current", (ctx, req) => {
    const b = req.body;
    if (!isObject(b) || typeof b.latitude !== "number" || typeof b.longitude !== "number")
      return invalid();
    return json(currentWeather(ctx.nowMs));
  }),

  // ── 주간 리포트 ──
  route("GET", "/api/v1/reports/weekly", (ctx, req) => {
    const date = req.query.get("date") ?? ctx.today;
    if (!isDay(date)) return invalid();
    return json(weeklyReport(ctx.db, date));
  }),

  // ── 편지 ──
  route("GET", "/api/v1/letters", (ctx) =>
    json({
      letters: [...ctx.db.letters]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((l) => letterSummary(l, ctx)),
    }),
  ),
  route("POST", "/api/v1/letters/:id/open", (ctx, _req, [id]) => {
    const l = ctx.db.letters.find((x) => String(x.id) === id);
    if (!l) return notFound("LETTER_NOT_FOUND");
    if (l.openedAt == null) {
      l.openedAt = new Date(ctx.nowMs).toISOString();
      ctx.wrote = true;
    }
    return noContent();
  }),
  route("PUT", "/api/v1/letters/:id/action", (ctx, req, [id]) => {
    const l = ctx.db.letters.find((x) => String(x.id) === id);
    if (!l) return notFound("LETTER_NOT_FOUND");
    const b = req.body;
    if (!isObject(b)) return invalid();
    const position = b.position ?? null;
    const whenLabel = b.whenLabel ?? null;
    const scheduleId = b.scheduleId ?? null;
    const remindAt = b.remindAt ?? null;
    if (position !== null && !l.actions.some((a) => a.position === position)) return invalid();
    if (whenLabel !== null && (typeof whenLabel !== "string" || whenLabel.length > 30))
      return invalid();
    if (scheduleId !== null && typeof scheduleId !== "number") return invalid();
    if (remindAt !== null && (typeof remindAt !== "string" || Number.isNaN(Date.parse(remindAt))))
      return invalid();
    l.actions = l.actions.map((a) =>
      a.position === position
        ? {
            ...a,
            chosen: true,
            whenLabel: whenLabel as string | null,
            scheduleId: scheduleId as number | null,
            remindAt: remindAt as string | null,
          }
        : { ...a, chosen: false, whenLabel: null, scheduleId: null, remindAt: null },
    );
    ctx.wrote = true;
    return json(letterDto(l, ctx));
  }),
  route("GET", "/api/v1/letters/:date", (ctx, _req, [date]) => {
    if (!isDay(date)) return invalid();
    const l = ctx.db.letters.find((x) => x.date === date);
    return l ? json(letterDto(l, ctx)) : notFound("LETTER_NOT_FOUND");
  }),

  // ── 쉼터 ──
  route("POST", "/api/v1/rest-records", (ctx, req) => {
    const b = req.body;
    if (
      !isObject(b) ||
      !REST_CONTENTS.includes(b.content as RestContent) ||
      typeof b.completed !== "boolean"
    )
      return invalid();
    const mood = b.mood ?? null;
    if (mood !== null && !REST_MOODS.includes(mood as RestMood)) return invalid();
    if (!b.completed && mood !== null) return invalid();
    const row = {
      id: nextId(ctx.db),
      content: b.content as RestContent,
      date: ctx.today,
      completed: b.completed,
      mood: mood as RestMood | null,
      createdAt: ctx.stamp(),
    };
    ctx.db.restRecords.push(row);
    ctx.wrote = true;
    return json(omitNull({ ...row }), 201);
  }),
  route("GET", "/api/v1/rest-records", (ctx, req) => {
    const content = req.query.get("content");
    if (content != null && !REST_CONTENTS.includes(content as RestContent)) return invalid();
    const list = ctx.db.restRecords.filter((r) => content == null || r.content === content);
    return json({ records: newestFirst(list).map((r) => omitNull({ ...r })) });
  }),
  ...(["treasures", "worries"] as const).flatMap((kind) => [
    route("POST", `/api/v1/${kind}`, (ctx, req) => {
      const b = req.body;
      if (!isObject(b) || !isText(b.content, 1000)) return invalid();
      const row: NoteRow = {
        id: nextId(ctx.db),
        date: ctx.today,
        content: b.content.trim(),
        createdAt: ctx.stamp(),
      };
      ctx.db[kind].push(row);
      ctx.wrote = true;
      return json(noteDto(row), 201);
    }),
    route("GET", `/api/v1/${kind}`, (ctx, req) => {
      const date = req.query.get("date");
      if (date != null) {
        if (!isDay(date)) return invalid();
        // 그날 것은 남긴 순서대로
        return json({ [kind]: ctx.db[kind].filter((n) => n.date === date).map(noteDto) });
      }
      return json({ [kind]: newestFirst(ctx.db[kind]).map(noteDto) });
    }),
  ]),

  // ── 소원 연꽃 ──
  route("GET", "/api/v1/wishes/pond", (ctx) => {
    const floating = ctx.db.wishes.filter((w) => !w.mine && !w.hidden && w.endReason == null);
    const picked = [...floating].sort(() => Math.random() - 0.5).slice(0, 10);
    const baba = [
      "오늘은 귤이 달았으면 좋겠어요",
      "따뜻한 물에 오래 있고 싶어요",
      "오늘 밤에는 다들 푹 잤으면 좋겠어요",
      "풀밭에서 낮잠을 자고 싶어요",
      "좋아하는 모자를 오래 쓰고 싶어요",
    ].slice(0, Math.max(0, 5 - picked.length));
    return json({
      rulesAgreed: ctx.db.wishRulesAgreed,
      postedToday: ctx.db.wishPostedToday,
      hasFloatingWish: ctx.db.wishes.some((w) => w.mine && !w.hidden && w.endReason == null),
      floatingCount: Math.max(floating.length, picked.length + baba.length),
      wishes: [
        ...picked.map((w) => ({
          id: w.id,
          content: w.content,
          daysLeft: w.daysLeft,
          light: w.light,
          joined: w.joined,
          author: "USER",
        })),
        ...baba.map((content, i) => ({
          id: -(i + 1),
          content,
          daysLeft: 7,
          light: true,
          joined: false,
          author: "BABA",
        })),
      ],
    });
  }),
  route("POST", "/api/v1/wishes/rules-agreement", (ctx) => {
    ctx.db.wishRulesAgreed = true;
    ctx.wrote = true;
    return json(null, 204);
  }),
  route("POST", "/api/v1/wishes/review", (ctx, req) => {
    const b = req.body;
    if (!isObject(b) || !isText(b.content, 120)) return invalid();
    if (!ctx.db.wishRulesAgreed)
      return error(403, "WISH_RULES_REQUIRED", "이용 규칙에 먼저 동의해주세요.");
    if (ctx.db.wishPostedToday)
      return error(409, "WISH_DAILY_LIMIT", "소원은 하루에 하나만 띄울 수 있습니다.");
    const text = b.content.trim();
    if (/눈 뜨지|죽고|사라지고/.test(text)) return json({ result: "CRISIS" });
    if (/잘리면|다치면|망하면/.test(text)) {
      return json({ result: "REJECTED", message: "누군가 잘못되길 바라는 말은 띄울 수 없어요" });
    }
    const cleaned = text.replace(/\d{2,3}-?\d{3,4}-?\d{4}\s*/g, "").replace(/김지훈/g, "그 사람");
    return json({
      result: cleaned === text ? "PASS" : "EDITED",
      content: cleaned,
      reviewToken: "lab",
    });
  }),
  route("POST", "/api/v1/wishes", (ctx, req) => {
    const b = req.body;
    if (!isObject(b) || !isText(b.content, 120)) return invalid();
    if (ctx.db.wishPostedToday)
      return error(409, "WISH_DAILY_LIMIT", "소원은 하루에 하나만 띄울 수 있습니다.");
    const row = {
      id: nextId(ctx.db),
      mine: true,
      content: b.content,
      daysLeft: 7,
      light: true,
      joined: false,
      joinedByOthers: false,
      endReason: null,
      outcome: null,
      hidden: false,
    };
    ctx.db.wishes.push(row);
    ctx.db.wishPostedToday = true;
    ctx.wrote = true;
    return json({ id: row.id, content: row.content, daysLeft: 7, joinedByOthers: false }, 201);
  }),
  route("GET", "/api/v1/wishes/mine", (ctx) => {
    const mine = ctx.db.wishes.filter((w) => w.mine && !w.hidden);
    return json({
      postedToday: ctx.db.wishPostedToday,
      floating: mine
        .filter((w) => w.endReason == null)
        .map((w) => ({
          id: w.id,
          content: w.content,
          daysLeft: w.daysLeft,
          joinedByOthers: w.joinedByOthers,
        })),
      past: mine
        .filter((w) => w.endReason != null)
        .map((w) => ({ id: w.id, content: w.content, endReason: w.endReason, outcome: w.outcome })),
    });
  }),
  ...(["join", "report"] as const).map((action) =>
    route("POST", `/api/v1/wishes/:id/${action}`, (ctx, _req, [id]) => {
      const w = ctx.db.wishes.find((x) => x.id === Number(id));
      if (!w || w.mine) return notFound("WISH_NOT_FOUND");
      if (action === "join") w.joined = true;
      else w.hidden = true;
      ctx.wrote = true;
      return json(null, 204);
    }),
  ),
  route("DELETE", "/api/v1/wishes/:id/report", (ctx, _req, [id]) => {
    const w = ctx.db.wishes.find((x) => x.id === Number(id));
    if (w) w.hidden = false;
    ctx.wrote = true;
    return json(null, 204);
  }),
  route("DELETE", "/api/v1/wishes/:id", (ctx, _req, [id]) => {
    const w = ctx.db.wishes.find((x) => x.id === Number(id) && x.mine);
    if (!w) return notFound("WISH_NOT_FOUND");
    w.hidden = true;
    ctx.wrote = true;
    return json(null, 204);
  }),
  route("PUT", "/api/v1/wishes/:id/outcome", (ctx, req, [id]) => {
    const w = ctx.db.wishes.find((x) => x.id === Number(id) && x.mine);
    if (!w) return notFound("WISH_NOT_FOUND");
    if (!isObject(req.body)) return invalid();
    w.outcome = req.body.outcome === "CAME_TRUE" ? "CAME_TRUE" : "NOT_YET";
    ctx.wrote = true;
    return json(null, 204);
  }),

  // ── 문의 · 기타 ──
  route("POST", "/api/v1/inquiries", (ctx, req) => {
    const b = req.body;
    if (
      !isObject(b) ||
      !INQUIRY_CATEGORIES.includes(b.category as string) ||
      !isText(b.content, 2000)
    )
      return invalid();
    const row = {
      id: nextId(ctx.db),
      category: b.category as string,
      content: b.content,
      replyEmail: typeof b.replyEmail === "string" ? b.replyEmail : null,
      createdAt: ctx.stamp(),
    };
    ctx.db.inquiries.push(row);
    ctx.wrote = true;
    return json({ id: row.id }, 201);
  }),
  // 앱 코드에는 없고 http 테스트에만 나오는 옛 경로 — 받기만 한다
  route("POST", "/api/v1/notifications/read", () => noContent()),
];

/** 이 표가 아는 엔드포인트 — README·테스트가 본다 */
export const ROUTE_TABLE = ROUTES.map((r) => `${r.method} ${r.pattern.source}`);

/** 요청 하나를 처리한다. 날이 바뀌었으면 먼저 편지를 배달한다 */
export function handleRequest(ctx: Ctx, req: FakeRequest): FakeResponse {
  if (deliverLetters(ctx.db, ctx.today)) ctx.wrote = true;
  for (const r of ROUTES) {
    if (r.method !== req.method) continue;
    const m = r.pattern.exec(req.path);
    if (!m) continue;
    if (!r.open && !req.authorized)
      return error(401, "AUTHENTICATION_REQUIRED", "로그인이 필요해요");
    return r.handler(ctx, req, m.slice(1).map(decodeURIComponent));
  }
  return notFound();
}
