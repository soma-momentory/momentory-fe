/**
 * DB 에서 **계산해 내는** 응답 — 주간 리포트 · 날씨 · 다음 날 편지. 서버가 세는 것을 여기서 센다
 * (앱 화면은 아무것도 세지 않는다 — `CLAUDE.md` 「코드를 쓸 때의 경계」).
 */
import { HELPLINES, LETTER_ACTIONS } from "./copy";
import {
  EMOTION_KEYS,
  nextId,
  type DiaryRow,
  type EmotionKey,
  type FakeDb,
  type LetterRow,
} from "./db";
import { hashString } from "./seed";
import { addDays, dayOf, dayOfIso, kstHourOf, sundayOf } from "./time";

// ── 주간 리포트 ─────────────────────────────────────────────────────────

const MOOD_MESSAGES: Record<EmotionKey, string> = {
  happy: "이번 주에는 행복한 마음을 가장 많이 느꼈어요. 그 순간들을 천천히 다시 떠올려 보세요.",
  proud: "이번 주에는 뿌듯한 마음이 자주 찾아왔어요. 애쓴 나를 한 번 더 알아봐 주세요.",
  calm: "이번 주에는 평온한 마음을 가장 많이 느꼈어요. 그 환경을 이어가 보세요.",
  tired: "이번 주에는 피곤한 날이 많았어요. 몸이 보내는 신호에 조금 더 귀 기울여 보세요.",
  stuck: "이번 주에는 막막한 마음이 자주 들었어요. 작은 한 칸부터 정해 봐도 괜찮아요.",
  lethargic: "이번 주에는 힘이 잘 나지 않았어요. 쉬어 가는 것도 한 주를 건너는 방법이에요.",
  anxious: "이번 주에는 불안한 마음이 자주 찾아왔어요. 마음을 내려놓을 틈을 하나 만들어 보세요.",
  depressed: "이번 주에는 마음이 자주 가라앉았어요. 기댈 수 있는 사람을 한 번 떠올려 보세요.",
  angry: "이번 주에는 화가 나는 일이 있었어요. 지키고 싶었던 기준을 다시 살펴보세요.",
  frustrated: "이번 주에는 답답한 마음이 자주 들었어요. 마음속 말을 한 줄 적어 보는 것도 좋아요.",
};

/** 그 날의 일기 — 하루 하나지만, 혹시 여럿이면 마지막 것 */
export const diaryOn = (db: FakeDb, day: string): DiaryRow | undefined => {
  const all = db.diaries
    .filter((d) => dayOfIso(d.createdAt) === day)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return all[all.length - 1];
};

const inRange = (day: string | null, from: string, to: string) =>
  day != null && day >= from && day <= to;

/** 주간 리포트 공책(v2) — 서버의 `WeeklyReportV2Service` 와 같은 모양. 글은 시험용 고정 문장이다 */
export function weeklyBook(db: FakeDb, date: string | null, today: string) {
  const lastWeek = addDays(sundayOf(today), -7);
  const latest = db.diaries
    .map((d) => dayOfIso(d.createdAt))
    .filter((day): day is string => day != null && day < addDays(lastWeek, 7))
    .sort()
    .pop();
  const startDate = date != null ? sundayOf(date) : latest != null ? sundayOf(latest) : lastWeek;
  const endDate = addDays(startDate, 6);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const diaries = dates.flatMap((day) => {
    const diary = diaryOn(db, day);
    return diary == null
      ? []
      : [{ day, emotion: diary.primaryEmotion ?? diary.emotions[0] ?? null }];
  });
  const schedules = db.schedules.filter((s) => !s.hidden && inRange(s.date, startDate, endDate));
  const good = diaries.filter(
    (d) => d.emotion === "calm" || d.emotion === "proud" || d.emotion === "happy",
  );
  const counts = new Map<EmotionKey, number>();
  for (const d of diaries)
    if (d.emotion != null) counts.set(d.emotion, (counts.get(d.emotion) ?? 0) + 1);
  const perDay = dates.map((day) => schedules.filter((s) => s.date === day && s.completed).length);
  return {
    startDate,
    endDate,
    newest: startDate === lastWeek,
    diaryCount: diaries.length,
    detailed: diaries.length >= 3,
    tone: good.length > 0 || diaries.length === 0 ? "NORMAL" : "HARD",
    helpResources: [],
    days: dates.map((day) => {
      const found = diaries.find((d) => d.day === day);
      return { date: day, written: found != null, emotion: found?.emotion ?? null };
    }),
    restCount: 0,
    coverLine: "면접 스터디 이야기가\n가장 많았던 한 주예요",
    review:
      diaries.length >= 3
        ? "면접 스터디 이야기를 가장 많이 들려줬어요. 월요일에는 대답이 막혔다고 적었어요."
        : null,
    goodWords:
      diaries.length >= 3
        ? "막힌 다음 날에도 다시 간 건 멋진 일이에요. 앞으로도 수고했다고 말해 주는 날이 있기를 바라요."
        : null,
    okLine: good.length > 0 ? "친구를 만나거나 발표를 끝낸 날 괜찮았어요" : null,
    words: diaries.slice(0, 2).map((d) => ({
      date: d.day,
      label: "면접 스터디",
      fromLetter: false,
      text: "생각보다 산책이 길게 느껴지지 않았다",
    })),
    emotions: [...counts].map(([emotion, count]) => ({ emotion, count, events: ["면접 스터디"] })),
    okMoments: good.map((d) => ({
      date: d.day,
      emotion: d.emotion,
      event: "친구와 저녁",
      tasks: ["장보기", "방 정리"],
      betterRest: "BODY_RELEASE",
    })),
    rest: { total: 0, better: 0, same: 0, unsure: 0, places: [], soFar: null },
    done: { completedCount: perDay.reduce((sum, n) => sum + n, 0), perDay, linked: [] },
  };
}

export function weeklyReport(db: FakeDb, date: string) {
  const startDate = sundayOf(date);
  const endDate = addDays(startDate, 6);
  const dailyMoods = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(startDate, i);
    const diary = diaryOn(db, day);
    const emotion = diary?.primaryEmotion ?? diary?.emotions[0] ?? null;
    return { date: day, emotion, emotions: diary?.emotions ?? [] };
  });

  const schedules = db.schedules.filter((s) => !s.hidden && inRange(s.date, startDate, endDate));
  const created = db.actionCards.filter((c) => inRange(dayOfIso(c.createdAt), startDate, endDate));
  const completed = db.actionCards.filter(
    (c) => c.done && c.doneAt != null && inRange(dayOfIso(c.doneAt), startDate, endDate),
  );
  const diaryCount = db.diaries.filter((d) =>
    inRange(dayOfIso(d.createdAt), startDate, endDate),
  ).length;

  // 가장 많이 느낀 감정 — 같으면 감정 번호가 앞선 것
  const tally = new Map<EmotionKey, number>();
  for (const day of dailyMoods) {
    if (day.emotion != null) tally.set(day.emotion, (tally.get(day.emotion) ?? 0) + 1);
  }
  let dominantEmotion: EmotionKey | null = null;
  for (const key of EMOTION_KEYS) {
    if ((tally.get(key) ?? 0) > (dominantEmotion == null ? 0 : (tally.get(dominantEmotion) ?? 0))) {
      dominantEmotion = key;
    }
  }

  const needCount = new Map<string, number>();
  for (const card of created) {
    for (const need of card.needs) needCount.set(need.word, (needCount.get(need.word) ?? 0) + 1);
  }
  const needs = [...needCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word, count]) => ({ word, count }));

  return {
    startDate,
    endDate,
    dailyMoods,
    dominantEmotion,
    ...(dominantEmotion == null ? {} : { moodMessage: MOOD_MESSAGES[dominantEmotion] }),
    scheduleTotalCount: schedules.length,
    scheduleCompletedCount: schedules.filter((s) => s.completed).length,
    actionCardCreatedCount: created.length,
    actionCardCompletedCount: completed.length,
    needs,
    practicedWishes: completed.map((c) => ({
      action: c.targetAction,
      needs: c.needs.map((n) => n.word),
    })),
    diaryCount,
  };
}

// ── 날씨 ────────────────────────────────────────────────────────────────

type Sky = {
  code: string;
  family: string;
  label: string;
  intensity?: "light" | "heavy";
  windy?: boolean;
  showers?: boolean;
};

const DAY_SKIES: Sky[] = [
  { code: "clear.day", family: "clear", label: "맑음" },
  { code: "cloudy", family: "cloudy", label: "흐림" },
  { code: "rain.light", family: "rain", label: "약한 비", intensity: "light" },
  { code: "partly_cloudy.day", family: "partly_cloudy", label: "바람 부는 구름 조금", windy: true },
  { code: "clear.day", family: "clear", label: "맑음" },
];
const NIGHT_SKIES: Sky[] = [
  { code: "clear.night", family: "clear", label: "바람 부는 맑은 밤", windy: true },
  { code: "cloudy", family: "cloudy", label: "흐림" },
  { code: "rain", family: "rain", label: "비" },
];
const SNOW: Sky = { code: "snow.light", family: "snow", label: "약한 눈", intensity: "light" };

/** 월별 기온의 바탕(℃) — 서울 기준 대강 */
const BASE_TEMP = [-2, 1, 7, 13, 18, 23, 26, 27, 22, 15, 8, 1];

/** 그 순간의 날씨 — 하루 안에서는 같은 하늘, 기온만 시각을 조금 따른다 */
export function currentWeather(nowMs: number) {
  const day = dayOf(nowMs);
  const hour = kstHourOf(nowMs);
  const daylight: "day" | "night" = hour >= 6 && hour < 18 ? "day" : "night";
  const month = Number(day.slice(5, 7));
  const h = hashString(day);
  const winter = month === 12 || month <= 2;
  const skies = daylight === "day" ? DAY_SKIES : NIGHT_SKIES;
  const sky = winter && h % 4 === 0 ? SNOW : skies[h % skies.length]!;
  const temperatureC =
    (BASE_TEMP[month - 1] ?? 15) + ((h >> 3) % 5) - 2 + (daylight === "day" ? 2 : -1);
  const hourMs = nowMs - (nowMs % 3_600_000);
  return {
    condition: {
      code: sky.code,
      family: sky.family,
      intensity: sky.intensity ?? null,
      daylight,
      showers: sky.showers ?? false,
      thunder: false,
      windy: sky.windy ?? false,
    },
    label: sky.label,
    temperatureC,
    forecastTime: new Date(hourMs).toISOString(),
    updatedAt: new Date(nowMs - 5 * 60_000).toISOString(),
    source: "MET Norway",
  };
}

/** 일기에 붙는 날씨 한 줄 — 「맑음 · 22℃」 */
export const diaryWeatherLine = (nowMs: number) => {
  const w = currentWeather(nowMs);
  return `${w.label.replace(/^바람 부는 /, "")} · ${w.temperatureC}℃`;
};

// ── 다음 날 편지 ────────────────────────────────────────────────────────

export const SAFETY_WORDS = ["위험", "죽고 싶", "사라지고 싶", "#위험"] as const;
export const hasSafetyWord = (text: string) => SAFETY_WORDS.some((w) => text.includes(w));

const INSIGHTS: Record<EmotionKey, string> = {
  happy: "어제의 기쁨은 우연이 아니었어요. 그런 순간을 알아보는 눈이 당신에게 있어요.",
  proud: "어제 해낸 일은 작지 않았어요. 애쓴 만큼 스스로를 알아봐 줘도 괜찮아요.",
  calm: "어제는 마음이 고요했던 하루였어요. 그 고요를 만든 것이 무엇이었는지 기억해 둬요.",
  tired: "어제의 피곤함은 끝까지 버틴 흔적이에요. 오늘은 몸이 먼저 쉬어도 괜찮아요.",
  stuck: "막막함은 길이 없어서가 아니라 길이 많아서 생기기도 해요. 오늘은 한 칸만 정해도 충분해요.",
  lethargic: "아무것도 못 한 날도 하루를 건너온 날이에요. 오늘은 창문 하나 여는 것부터 해도 돼요.",
  anxious:
    "불안은 소중한 것을 지키려는 마음이 보내는 신호예요. 오늘은 그 마음을 조금 내려놓아 봐요.",
  depressed: "가라앉은 마음도 쉬어 가는 중일 수 있어요. 기댈 수 있는 한 사람을 떠올려 봐요.",
  angry: "화가 난 건 지켜져야 할 것이 있었기 때문이에요. 그 기준은 틀리지 않았어요.",
  frustrated:
    "답답했던 건 그만큼 잘 전하고 싶었기 때문일지도 몰라요. 그 마음은 충분히 전해지고 있어요.",
};

const firstSentence = (text: string): string | null => {
  const s = text.split(/[.!?。](?:\s|$)|\n/)[0]?.trim() ?? "";
  if (s.length === 0 || s.length > 40) return null;
  return s;
};

/** 그 일기로 다음 날 아침의 편지를 쓴다 */
export function letterFor(db: FakeDb, diary: DiaryRow, day: string): LetterRow {
  const quiet = hasSafetyWord(diary.original);
  const emotion = diary.primaryEmotion ?? diary.emotions[0] ?? "calm";
  const h = hashString(`${day}:${diary.id}`);
  return {
    id: nextId(db),
    date: day,
    status: quiet ? "QUIET" : "READY",
    quote: quiet ? null : firstSentence(diary.original),
    insight: quiet
      ? "어제는 마음이 많이 무거웠던 것 같아요. 오늘은 무언가를 해내지 않아도 괜찮아요."
      : INSIGHTS[emotion],
    tonightQuestion: quiet ? null : "오늘 밤엔 하루 중 가장 편안했던 순간을 물어볼게요.",
    actions: quiet
      ? []
      : [0, 1, 2].map((k) => ({
          position: k,
          title: LETTER_ACTIONS[(h + k * 3) % LETTER_ACTIONS.length]!,
          source: "CATALOG" as const,
          chosen: false,
          whenLabel: null,
          scheduleId: null,
          remindAt: null,
        })),
    helplines: quiet ? [...HELPLINES] : [],
    openedAt: null,
  };
}

/**
 * 날이 바뀌었다 — 지난날 쓴 일기 중 아직 편지가 없는 것에 편지를 만든다(실서버의 아침 배치).
 * 바꾼 것이 있으면 true.
 */
export function deliverLetters(db: FakeDb, today: string): boolean {
  let changed = false;
  for (const diary of db.diaries) {
    if (!diary.letterPending) continue;
    const day = dayOfIso(diary.createdAt);
    if (day == null || day >= today) continue;
    diary.letterPending = false;
    changed = true;
    if (db.letters.some((l) => l.date === day)) continue;
    db.letters.push(letterFor(db, diary, day));
  }
  return changed;
}
