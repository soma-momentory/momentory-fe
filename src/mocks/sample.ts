import type { EmotionId } from "@/features/emotion/model/emotion";
import type { Moment, Schedule, Weather } from "@/features/home/model/types";
import type { WeekAnalysis } from "@/features/report/model/report";
import { SAMPLE_TODAY } from "@/lib/clock";

/**
 * 데모 데이터 — `momentory.schema.mvp.json` 의 `meta.sampleData` 가 정본이다.
 *
 * **홈 · 보관함 · 리포트 세 화면이 같은 값을 봐야 하므로 하나를 고치면 나머지도
 * 함께 고친다**(`RULES.md` 「샘플 데이터」). 그래서 화면마다 따로 적지 않고
 * 여기 한 곳에 둔다.
 *
 * 샘플 하루는 **면접 스터디가 있는 날**이다 — 2026-07-27(월) · 닉네임 지현 ·
 * 일정 4개 · 순간 2개 · 회고 시각 21:30. 그 날짜는 `SampleClock`(`src/lib/clock.ts`)
 * 이 들고 있다 — 데이터와 「오늘」이 같은 값을 봐야 하기 때문이다.
 *
 * ⚠ **가장 많이 고른 감정은 기간마다 다른 값**이다 — 전체 화남/답답(마이) ·
 * 이번 달 행복함(보관함) · 그 주 평온함(리포트). **한 값을 세 곳에 넣지 않는다.**
 *
 * 타입은 소유하지 않는다 — `Schedule`·`Moment` 는 `features/home/model/types.ts`,
 * `WeekAnalysis` 는 `features/report/model/report.ts` 가 소유하고 여기는 **그
 * 타입을 구현하는 값만** 둔다. 화면은 이 파일을 직접 읽지 않고 feature 의
 * store·repository 를 지난다(`CLAUDE.md`) — 서버가 붙으면 이 파일은 MSW 핸들러의
 * 응답으로 옮겨가고 화면은 그대로다.
 */
export const SAMPLE_USER = {
  nickname: "지현",
  retroTime: "21:30",
  notifyRetro: true,
} as const;

/** 「맑음 · 27℃」 — 상단 한 줄 */
export const SAMPLE_WEATHER: Weather = { label: "맑음", celsius: 27 };

/**
 * 샘플 하루 — **`meta.sampleData.todaySchedules` 가 정본**이다.
 *
 * ```
 * 팀 회의 · 화남/답답 · 마침
 * 발표 준비 · 행복함 · 마침
 * 면접 스터디 · 불안함        ← 감정은 있고 마침은 없다
 * 운동 가기
 * ```
 *
 * 그래서 **마침 2/4** 이고 **감정 기록 3개**다 — 둘이 어긋나 보여도 맞는 값이다
 * (마침과 감정은 서로를 요구하지 않는다). `C1` 재료 카드의 「감정 기록 3개」와
 * `C2` 의 감정 3개(화남/답답 · 행복함 · 불안함)가 이 값에서 나온다.
 *
 * `C2` 의 「밤 3/4 마침」은 **사용자가 그 사이 면접 스터디를 마친 상태**다 —
 * 홈과 같은 store 를 보므로 화면에 숫자를 박지 않고 실제 값이 나오게 둔다
 * (`RULES.md` 「샘플 데이터」 · `12.md` 「같은 하루의 다른 시각」).
 *
 * ⚠ 시안(`9-mvp.mjs`)의 `12` 는 면접 스터디에 감정 알약을 그리지 않았지만,
 * **데모 수치의 정본은 스키마**이고 `C1.md` 가 "샘플 하루의 감정 3 은 `12`·`C2`
 * 와 같은 값"이라고 못박는다.
 */
export const SAMPLE_SCHEDULES: Schedule[] = [
  {
    id: "s1",
    date: SAMPLE_TODAY,
    title: "팀 회의",
    time: null,
    source: "calendar",
    externalId: "cal-1",
    done: true,
    doneAt: `${SAMPLE_TODAY}T11:20:00`,
    emotions: [3], // 화남/답답
    hidden: false,
  },
  {
    id: "s2",
    date: SAMPLE_TODAY,
    title: "발표 준비",
    time: null,
    source: "calendar",
    externalId: "cal-2",
    done: true,
    doneAt: `${SAMPLE_TODAY}T13:40:00`,
    emotions: [4], // 행복함
    hidden: false,
  },
  {
    id: "s3",
    date: SAMPLE_TODAY,
    title: "면접 스터디",
    time: null,
    source: "calendar",
    externalId: "cal-3",
    // 스키마 샘플은 「면접 스터디 · 불안함」 — **감정은 있고 마침은 없다.**
    // 마침과 감정은 서로를 요구하지 않는다(`12-c`)는 규칙이 데이터에도 그대로다.
    done: false,
    doneAt: null,
    emotions: [1], // 불안함
    hidden: false,
  },
  {
    id: "s4",
    date: SAMPLE_TODAY,
    title: "운동 가기",
    time: null,
    source: "manual",
    externalId: null,
    done: false,
    doneAt: null,
    emotions: [],
    hidden: false,
  },
];

/**
 * 보관함이 보는 일기 12편 — `RULES.md` 「샘플 데이터」의 **일기 12편 · 기록한
 * 날 12일 · 감정 기록 24개(12편 × 2)** 가 이 배열에서 나온다.
 *
 * 날짜와 감정은 시안(`9-mvp.mjs` 의 `EMO_BY_DAY`) 그대로다 — 달력 점이 찍히는
 * 날이 곧 이 열두 날이다.
 *
 * ⚠ 본문은 **7/22 · 7/20 · 7/17 · 7/15 네 편만 시안 값**이고 나머지 여덟은
 * 목록·스크롤을 보기 위한 데모 문장이다. 일기 본문은 원래 사용자와 서버가
 * 쓰는 것이라 서버가 붙으면 이 배열 전체가 사라진다.
 */
export type SampleDiary = {
  /** `MM-DD` — 달력·목록이 같은 값을 본다 */
  day: number;
  /** `[이야기 속 감정, 회고 시작 감정]` — 감정 태그의 초기값이기도 하다 */
  emotions: [EmotionId, EmotionId];
  body: string;
  /** 「바바가 함께 본 오늘」 — 회고를 마친 당시의 고정 스냅샷 */
  babaView?: string;
  /** 그 문장을 쓴 근거 한 줄 — **사용자가 실제로 쓴 말만** 인용한다 */
  babaViewBasis?: string;
  weather?: string;
  /**
   * 그 일기에 붙는 행동 카드 — **한 장뿐**이다.
   * `done` 은 리포트의 「N번 해봤어요」가 세는 값이다(실행률이 아니라 **수**다).
   */
  action?: { situation: string; targetAction: string; done?: boolean };
};

export const SAMPLE_DIARY_MONTH = "2026-07";

export const SAMPLE_DIARIES: SampleDiary[] = [
  { day: 1, emotions: [5, 4], body: "새 달의 첫날. 계획을 세우다 말았지만 그래도 적어는 뒀다." },
  { day: 4, emotions: [9, 4], body: "오랜만에 늦잠을 잤다. 죄책감보다 개운함이 컸다." },
  { day: 8, emotions: [4, 8], body: "발표 준비를 끝냈다. 마지막 장을 덮을 때가 제일 좋다." },
  {
    day: 13,
    emotions: [3, 1],
    body: "메일 하나에 하루 기분이 흔들렸다. 답장은 내일 쓰기로 했다.",
    action: { situation: "답장이 밀렸을 때", targetAction: "한 줄만 먼저 보내기", done: true },
  },
  { day: 15, emotions: [7, 6], body: "몸이 무거운 하루. 그래도 저녁에 일찍 누웠다." },
  {
    day: 17,
    emotions: [5, 2],
    body: "그런 날도 있다. 이런 날은 그냥 지나가게 두기로 했다.",
    action: { situation: "아무것도 하기 싫을 때", targetAction: "10분만 밖에 나가 보기" },
  },
  {
    day: 20,
    emotions: [7, 8],
    body: "미루던 운동을 10분이라도 했다. 시작하니 생각보다 가벼웠다.",
    action: {
      situation: "운동을 미루고 싶을 때",
      targetAction: "10분만 하고 그만두기",
      done: true,
    },
  },
  { day: 21, emotions: [1, 9], body: "면접 일정이 잡혔다. 걱정이 앞섰지만 일단 달력에 적었다." },
  {
    day: 22,
    emotions: [3, 8],
    body: "회의는 답답했지만, 그 답답함은 내 의견을 전하고 싶다는 마음에서 왔다.",
    action: {
      situation: "회의에서 말이 막힐 때",
      targetAction: "핵심 한 가지부터 다시 말하기",
      done: true,
    },
  },
  { day: 24, emotions: [9, 4], body: "산책하다 해가 지는 걸 오래 봤다. 별일 없는 날이 좋았다." },
  {
    day: 26,
    emotions: [9, 4],
    body: "주말 내내 아무것도 안 했다. 그게 필요했던 것 같다.",
    action: {
      situation: "쉬고 나서도 개운하지 않을 때",
      targetAction: "다음 주 할 일 하나만 적어두기",
    },
  },
  {
    day: 27,
    emotions: [1, 2],
    body: "오늘 모의 면접에서 내 차례가 되자 준비했던 말이 잘 떠오르지 않았다. 다른 사람들은 자연스럽게 답하는 것 같아 나만 부족하다는 생각이 들었고, 집에 온 뒤에도 마음이 무거웠다. 그래도 중간에 포기하지 않고 기억나는 내용부터 다시 말해 끝까지 답했다.",
    babaView:
      "오늘 모의 면접에서 긴장해 답이 막혔지만, 그 한 번이 면접을 못한다는 뜻은 아니다. 중간에 포기하지 않고 다시 말을 이어 끝까지 답했다. 다음에는 예상 질문 하나를 골라 핵심 세 문장으로 답하는 연습부터 해보려고 한다.",
    // 근거는 **사용자가 실제로 쓴 말**만 인용한다 — 요약해 바꿔 말하지 않는다
    babaViewBasis:
      "대화에서 '아예 포기하지는 않았어요', '기억나는 내용부터 다시 말해서 끝까지 답했어요'라고 하셨어요. 그 말에서 문장을 옮겨 적었어요.",
    weather: "맑음 · 27℃",
    action: {
      situation: "면접 연습을 시작할 때",
      targetAction: "예상 질문 하나를 골라 핵심 세 문장으로 답해보기",
    },
  },
];

/**
 * 지난달(6월)의 감정별 기록 수 — `A1` 요약 3칸의 **「지난달과 비교」** 가 쓴다.
 *
 * 화면은 「불안 2회 감소」처럼 **얼마나 줄었는지**를 말한다. 화살표(↓)는 그걸
 * 말하지 못해서 상류가 숫자로 바꿨다(`A1.md`).
 *
 * 이번 달 불안함은 3회(13 · 21 · 27일)라서 지난달 5회면 **2회 감소**다.
 */
export const SAMPLE_LAST_MONTH_EMOTIONS: Partial<Record<EmotionId, number>> = {
  1: 5, // 불안함
  2: 3,
  3: 4,
  4: 4,
  5: 2,
  7: 3,
  9: 2,
};

/**
 * **전체 기간**의 감정별 기록 수 — 마이(`M1`)의 「가장 많이 기록」이 쓴다.
 *
 * ⚠ **일정에 붙은 감정까지 센 값**이라 일기 태그만으로는 나오지 않는다
 * (`RULES.md` — "전체 **화남/답답**(마이 · 일정 감정 포함)"). 지난 달들의
 * `Schedule` 을 MVP 가 들고 있지 않아 서버가 줄 집계를 샘플로 둔다.
 *
 * **기간마다 다른 값**이다 — 전체는 화남/답답, 이번 달은 행복함(보관함),
 * 그 주는 평온함(리포트). **한 값을 세 곳에 넣지 않는다.**
 */
export const SAMPLE_ALL_TIME_EMOTIONS: Partial<Record<EmotionId, number>> = {
  3: 11, // 화남/답답 — 전체 1위
  4: 9,
  9: 8,
  1: 7,
  8: 6,
  2: 5,
  7: 5,
  5: 4,
  6: 3,
};

/** 리포트가 처음 여는 주 — **최신 주가 마지막**이라 여기서 뒤로만 간다 */
export const SAMPLE_REPORT_WEEK = { start: "2026-07-20", end: "2026-07-26" } as const;

/**
 * 바바가 쓰는 한 주 **해석** — 타입과 규칙은 `features/report/model/report.ts`
 * 의 `WeekAnalysis` 에 있다.
 *
 * ⛔ `DRAFT_DEMO`·`FOLLOW_UPS` 와 같은 임시 장치다(`TASKS.md` 「BE 연결 전에
 * 반드시 걷어내야 하는 것」). 없는 주를 새 화면으로 만들지 않는다 —
 * 「기록이 부족해 만들 수 없는 주」는 `report.pendingStates` 다.
 */
export const SAMPLE_REPORT_ANALYSIS: Record<string, WeekAnalysis> = {
  "2026-07-20": {
    summary: "흔들렸지만, 스스로를 다독이며 다시 균형을 찾아간 한 주였어요.",
    trendLabel: "다시 균형 찾기",
    trendDelta: "이전 주보다 완만했어요",
    emotionFlow: "무거운 몸으로 시작해 평온함으로 닫은 주였어요.",
    actionText: "답이 막히면 핵심 한 가지부터 다시 말하기",
  },
  "2026-07-13": {
    summary: "말수가 줄어든 주였지만, 그런 날도 있다고 스스로 넘겨준 한 주였어요.",
    trendLabel: "한 박자 쉬어가기",
    trendDelta: "이전 주보다 조용했어요",
    emotionFlow: "답답함으로 열었지만 끝에는 힘을 뺀 주였어요.",
    actionText: "답장이 밀리면 한 줄만 먼저 보내기",
  },
};

/**
 * 순간 2개 — 「오늘의 순간」 라벨 아래 모으고 **개수를 세지 않는다**.
 * 본문은 `9-mvp.mjs` 의 `C2` 순간 카드 그대로다.
 *
 * ⚠ 홈(`12`)에는 순간 목록이 없고 `C2` 에서야 보인다 — 시안이 그렇다.
 * 의도인지는 `TASKS.md` 「상류 확인」에 올려 뒀다.
 */
export const SAMPLE_MOMENTS: Moment[] = [
  {
    id: "m1",
    createdAt: `${SAMPLE_TODAY}T15:12:00`,
    date: SAMPLE_TODAY,
    text: "발표 자료 피드백 정리하기",
    syncState: "synced",
  },
  {
    id: "m2",
    createdAt: `${SAMPLE_TODAY}T18:03:00`,
    date: SAMPLE_TODAY,
    text: "생각보다 반응이 좋았다.",
    syncState: "synced",
  },
];
