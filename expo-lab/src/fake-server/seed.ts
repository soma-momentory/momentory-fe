/**
 * 데이터 세트 시드 — **결정적**이다. 난수는 데이터 세트 id 로 씨앗을 둔 `mulberry32` 하나뿐이라,
 * 같은 데이터 세트는 언제 심어도 **같은 모양 · 같은 id** 가 나온다(날짜만 「오늘」을 따라 옮겨진다).
 *
 * 「오늘」은 심는 순간의 프레임 시계(04:00 KST 경계)다. 심은 뒤에는 시계가 움직여도 DB 는 그대로다 —
 * 하루를 넘기며 쌓은 기록이 사라지지 않게(`index.ts` 「하루 넘기기」).
 */
import {
  CALENDAR_SCHEDULES,
  FILLER_SCHEDULES,
  HELPLINES,
  LETTER_ACTIONS,
  LONG,
  QUIET_INSIGHT,
  REST_CONTENTS,
  THEMES,
  TODAY_SCHEDULES,
  TREASURES,
  WORRIES,
  type Theme,
} from "./copy";
import {
  emptyDb,
  nextId,
  scheduleEmotionOf,
  type DiaryRow,
  type EmotionKey,
  type FakeDb,
  type LetterRow,
  type Profile,
  type RestMood,
  type ScheduleRow,
} from "./db";
import { addDays, dayOf, dayOfIso, kstIso, kstMoment } from "./time";

/** 가짜 서버의 사용자 id — 로그인 응답 · `/users/me` 가 같은 값을 준다 */
export const LAB_USER_ID = 7;
export const LATEST_ONBOARDING_VERSION = 2;

/** 씨앗 있는 난수 — Math.random 을 쓰지 않는다 */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashString = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

type Rng = () => number;
const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)]!;
const between = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

type Spec = {
  nickname: string;
  /** 오늘 이전 며칠을 채우나 */
  pastDays: number;
  diaryRate: number;
  /** 일기 중 회고(바바)로 쓴 몫 — 나머지는 직접 쓴 일기 */
  retroRate: number;
  schedules: [number, number];
  calendarRate: number;
  letters: number;
  restRecords: number;
  treasures: number;
  worries: number;
  todaySchedules: readonly string[];
  long: boolean;
  /** 테마를 날짜 순서대로 돌린다(감정 10종이 빠짐없이 나오게) */
  cycleThemes: boolean;
};

const SPECS: Record<string, Spec | null> = {
  "new-user": null,
  empty: {
    nickname: "새벽",
    pastDays: 0,
    diaryRate: 0,
    retroRate: 0,
    schedules: [0, 0],
    calendarRate: 0,
    letters: 0,
    restRecords: 0,
    treasures: 0,
    worries: 0,
    todaySchedules: [],
    long: false,
    cycleThemes: false,
  },
  normal: {
    nickname: "모리",
    pastDays: 14,
    diaryRate: 0.85,
    retroRate: 0.6,
    schedules: [2, 5],
    calendarRate: 0.35,
    letters: 4,
    restRecords: 7,
    treasures: 6,
    worries: 3,
    todaySchedules: TODAY_SCHEDULES,
    long: false,
    cycleThemes: false,
  },
  many: {
    nickname: "하루",
    pastDays: 92,
    diaryRate: 0.9,
    retroRate: 0.7,
    schedules: [10, 13],
    calendarRate: 1,
    letters: 30,
    restRecords: 48,
    treasures: 36,
    worries: 14,
    todaySchedules: [...TODAY_SCHEDULES, ...FILLER_SCHEDULES.slice(0, 8)],
    long: false,
    cycleThemes: true,
  },
  "long-copy": {
    nickname: LONG.nickname,
    pastDays: 7,
    diaryRate: 1,
    retroRate: 0.75,
    schedules: [3, 4],
    calendarRate: 0.5,
    letters: 3,
    restRecords: 4,
    treasures: 3,
    worries: 3,
    todaySchedules: LONG.scheduleTitles.slice(0, 3),
    long: true,
    cycleThemes: false,
  },
};

export const profileFor = (nickname: string): Profile => ({
  nickname,
  age: 27,
  gender: "FEMALE",
  interestAreas: ["CAREER", "RELATIONSHIP"],
  otherInterestDetail: null,
  restMethods: ["READING", "WALKING"],
  otherRestMethodDetail: null,
  reflectionTime: "21:30",
  calendarIntegrationEnabled: true,
  notificationEnabled: true,
  letterNotificationEnabled: true,
  letterTime: "08:00",
});

const WEATHERS = [
  "맑음 · 22℃",
  "구름 많음 · 18℃",
  "비 · 15℃",
  "흐림 · 17℃",
  "맑음 · 9℃",
  "눈 · -2℃",
];

const longTheme = (base: Theme): Theme => ({
  ...base,
  diary: LONG.diary,
  quote: LONG.quote,
  insight: LONG.insight,
  tonightQuestion: LONG.tonightQuestion,
  card: {
    situation: LONG.situation,
    needs: [LONG.need, { word: "안정", meaning: "흔들리는 하루에도 기댈 수 있는 작은 습관" }],
    desiredState: LONG.desiredState,
    targetAction: LONG.targetAction,
    sentiment: "uncomfortable",
    reflection:
      "해 보니 아침이 덜 급했고, 커피를 마시는 동안 오늘 할 일을 천천히 떠올릴 수 있어서 좋았다. 다음 주에도 이어 가 보고 싶다.",
  },
});

/**
 * 오늘 일기가 없으면 직접 쓴 일기 한 편을 넣는다(`LabFrameConfig.todayDiary`). 넣었으면 `true`.
 * 저장본을 다시 읽을 때마다 부른다 — 시드와 달리 **그날의 「오늘」**을 따라가야 해서다(다음 날 · 「하루 넘기기」).
 */
export function ensureTodayDiary(db: FakeDb, nowMs: number): boolean {
  const today = dayOf(nowMs);
  if (db.diaries.some((d) => dayOfIso(d.createdAt) === today)) return false;
  const theme = THEMES[0]!;
  db.diaries.push({
    id: nextId(db),
    retrospectId: null,
    primaryEmotion: theme.emotions[0],
    emotions: [theme.emotions[0]],
    original: SPECS[db.datasetId]?.long ? LONG.diary : theme.diary,
    createdAt: new Date(nowMs).toISOString(),
    weather: null,
    letterPending: true,
  });
  return true;
}

/** 데이터 세트 하나를 「오늘 = today」 기준으로 심는다 */
const WISHES = [
  "이번 주는 야근 없이 퇴근하고 싶어요",
  "우리 강아지가 오래 건강하면 좋겠어요",
  "올해는 이사 갈 집을 찾으면 좋겠어요",
  "엄마 수술이 잘 끝나면 좋겠어요",
  "이번 시험은 잘 보면 좋겠어요",
  "내일은 일찍 잠들면 좋겠어요",
  "친구랑 먼저 화해하고 싶어요",
  "주말에는 푹 쉴 수 있으면 좋겠어요",
];

export function seedDataset(datasetId: string, nowMs: number): FakeDb {
  const spec = SPECS[datasetId] ?? (datasetId in SPECS ? null : SPECS.normal!);
  const db = emptyDb(datasetId, {
    userId: LAB_USER_ID,
    onboardingRequired: spec == null,
    onboardingVersion: spec == null ? null : LATEST_ONBOARDING_VERSION,
    profile: spec == null ? null : profileFor(spec.nickname),
    onboardingAnswers: null,
  });
  if (spec == null) return db;

  const rng = mulberry32(hashString(datasetId));
  const today = dayOf(nowMs);
  const yesterday = addDays(today, -1);
  const themeOrder = THEMES.map((t) => ({ t, k: rng() })).sort((a, b) => a.k - b.k);

  type Item = { title: string; calendar?: boolean };
  const addSchedules = (
    date: string,
    items: readonly Item[],
    past: boolean,
    emotions: EmotionKey[],
  ) => {
    items.forEach(({ title, calendar = false }, i) => {
      const completed = past ? rng() < 0.78 : i === 0;
      const pool: EmotionKey[] = emotions.length > 0 ? emotions : ["calm"];
      const emotion = completed ? pick(rng, pool) : null;
      const row: ScheduleRow = {
        id: nextId(db),
        date,
        title,
        source: calendar ? "CALENDAR" : "MANUAL",
        hidden: false,
        completed,
        emotion: emotion == null ? null : scheduleEmotionOf(emotion),
        displayOrder: i,
        externalId: calendar ? `lab-cal-${date}-${i}` : null,
      };
      db.schedules.push(row);
    });
  };

  const diaryDays: { day: string; diary: DiaryRow; theme: Theme }[] = [];

  for (let back = spec.pastDays; back >= 1; back--) {
    const day = addDays(today, -back);
    const index = spec.pastDays - back;
    const base = spec.cycleThemes
      ? THEMES[index % THEMES.length]!
      : themeOrder[index % themeOrder.length]!.t;
    const theme = spec.long ? longTheme(base) : base;

    // ── 일정 ──
    const count = between(rng, spec.schedules[0], spec.schedules[1]);
    const titles: string[] = spec.long ? LONG.scheduleTitles.slice(0, count) : [...theme.schedules];
    let f = between(rng, 0, FILLER_SCHEDULES.length - 1);
    while (titles.length < count) titles.push(FILLER_SCHEDULES[f++ % FILLER_SCHEDULES.length]!);
    const items: Item[] = titles.slice(0, count).map((title) => ({ title }));
    if (rng() < spec.calendarRate) {
      const title = spec.long ? LONG.scheduleTitles[3]! : pick(rng, CALENDAR_SCHEDULES);
      items.push({ title, calendar: true });
    }
    addSchedules(day, items, true, [...theme.emotions]);

    // ── 일기 ──
    const writes = day === yesterday || rng() < spec.diaryRate;
    if (!writes) continue;
    const retro = rng() < spec.retroRate;
    const retrospectId = retro ? nextId(db) : null;
    const createdMs = kstMoment(day, between(rng, 21, 23), between(rng, 0, 59));
    const diary: DiaryRow = {
      id: nextId(db),
      retrospectId,
      primaryEmotion: theme.emotions[0],
      emotions: retro ? [...theme.emotions] : [theme.emotions[0]],
      original: theme.diary,
      createdAt: new Date(createdMs).toISOString(),
      weather: rng() < 0.7 ? pick(rng, WEATHERS) : null,
      letterPending: false,
    };
    db.diaries.push(diary);
    diaryDays.push({ day, diary, theme });

    // ── 바람카드 ──
    if (retrospectId != null && theme.card != null) {
      const card = theme.card;
      const doneMs = kstMoment(addDays(day, 1), 12, 30);
      const done = (card.reflection != null || rng() < 0.4) && doneMs < nowMs;
      db.actionCards.push({
        id: nextId(db),
        retrospectId,
        situation: card.situation,
        emotions: [...theme.emotions],
        needs: card.needs.map((n) => ({ ...n })),
        desiredState: card.desiredState,
        targetAction: card.targetAction ?? null,
        sentiment: card.sentiment,
        done,
        doneAt: done ? new Date(doneMs).toISOString() : null,
        reflection: done ? (card.reflection ?? null) : null,
        createdAt: new Date(createdMs + 60_000).toISOString(),
      });
    }
  }

  // ── 편지 — 최근 일기 몇 편. 가장 최근(어제 일기)만 아직 안 열었다 ──
  const lettered = diaryDays.slice(-spec.letters).reverse();
  lettered.forEach(({ day, theme }, i) => {
    const quiet = datasetId === "many" && i === 3;
    const fallback = !quiet && i % 5 === 2;
    const actionTitles = spec.long
      ? [...LONG.actions]
      : [0, 1, 2].map((k) => LETTER_ACTIONS[(hashString(day) + k * 3) % LETTER_ACTIONS.length]!);
    const opened = i > 0;
    const letter: LetterRow = {
      id: nextId(db),
      date: day,
      status: quiet ? "QUIET" : fallback ? "FALLBACK" : "READY",
      quote: quiet ? null : theme.quote,
      insight: quiet ? QUIET_INSIGHT : theme.insight,
      tonightQuestion: quiet ? null : theme.tonightQuestion,
      actions: quiet
        ? []
        : actionTitles.slice(0, fallback ? 2 : 3).map((title, position) => ({
            position,
            title,
            source: fallback ? "FALLBACK" : "CATALOG",
            chosen: opened && position === 1,
            whenLabel: opened && position === 1 ? "점심 뒤" : null,
            scheduleId: null,
            remindAt: null,
          })),
      helplines: quiet ? [...HELPLINES] : [],
      openedAt: opened ? kstIso(addDays(day, 1), 8, 10) : null,
    };
    db.letters.push(letter);
  });

  // ── 오늘 · 내일 일정 ──
  const todayItems: Item[] = spec.todaySchedules.map((title) => ({ title }));
  if (spec.todaySchedules.length > 0 && spec.calendarRate > 0) {
    todayItems.push({ title: CALENDAR_SCHEDULES[0]!, calendar: true });
  }
  addSchedules(today, todayItems, false, ["calm"]);
  if (spec.todaySchedules.length > 0) {
    const tomorrow = spec.long ? LONG.scheduleTitles.slice(3) : ["치과 예약", "스터디"];
    addSchedules(
      addDays(today, 1),
      tomorrow.map((title) => ({ title })),
      false,
      [],
    );
    // 내일 일정은 아직 끝나지 않았다
    for (const s of db.schedules) {
      if (s.date === addDays(today, 1)) {
        s.completed = false;
        s.emotion = null;
      }
    }
  }
  if (datasetId === "many") {
    // 숨긴 일정 하나 — 홈의 「숨긴 일정」 자리를 볼 수 있게
    const hidden = db.schedules.find((s) => s.date === today && s.displayOrder === 5);
    if (hidden) hidden.hidden = true;
  }

  // ── 쉼터 ──
  const pastDay = (k: number) => addDays(today, -1 - (k % Math.max(1, spec.pastDays || 1)));
  const records = Array.from({ length: spec.restRecords }, (_, k) => {
    const date = pastDay(Math.floor(k * 1.7));
    const completed = rng() < 0.8;
    const moods: RestMood[] = ["BETTER", "SAME", "UNSURE"];
    return {
      id: nextId(db),
      content: REST_CONTENTS[k % REST_CONTENTS.length]!,
      date,
      completed,
      mood: completed ? pick(rng, moods) : null,
      createdAt: kstIso(date, 13 + (k % 8), (k * 7) % 60),
    };
  });
  db.restRecords.push(...records);
  for (let k = 0; k < spec.treasures; k++) {
    const date = pastDay(Math.floor(k * 1.3));
    db.treasures.push({
      id: nextId(db),
      date,
      content: spec.long ? LONG.treasure : TREASURES[k % TREASURES.length]!,
      createdAt: kstIso(date, 20, (k * 11) % 60),
    });
  }
  for (let k = 0; k < spec.worries; k++) {
    const date = pastDay(k * 2);
    db.worries.push({
      id: nextId(db),
      date,
      content: spec.long ? LONG.worry : WORRIES[k % WORRIES.length]!,
      createdAt: kstIso(date, 22, (k * 13) % 60),
    });
  }
  // 소원 — 걱정을 쌓은 데이터면 연못도 찬다. 많은 데이터는 뒤쪽 작은 꽃까지 보인다
  for (let k = 0; k < spec.worries * 2; k++) {
    db.wishes.push({
      id: nextId(db),
      mine: false,
      content: spec.long && k === 0 ? LONG.worry : WISHES[k % WISHES.length]!,
      daysLeft: (k % 7) + 1,
      light: k % 4 !== 3,
      joined: false,
      joinedByOthers: false,
      endReason: null,
      outcome: null,
      hidden: false,
    });
  }

  return db;
}
