import type { EmotionId } from "@/design/theme";

/**
 * 데모 데이터 — `momentory.schema.mvp.json` 의 `meta.sampleData` 가 정본이다.
 *
 * **홈 · 보관함 · 리포트 세 화면이 같은 값을 봐야 하므로 하나를 고치면 나머지도
 * 함께 고친다**(`RULES.md` 「샘플 데이터」). 그래서 화면마다 따로 적지 않고
 * 여기 한 곳에 둔다.
 *
 * 샘플 하루는 **면접 스터디가 있는 날**이다 — 2026-07-27(월) · 닉네임 지현 ·
 * 일정 4개 · 순간 2개 · 회고 시각 21:30.
 *
 * ⚠ **가장 많이 고른 감정은 기간마다 다른 값**이다 — 전체 화남/답답(마이) ·
 * 이번 달 행복함(보관함) · 그 주 평온함(리포트). **한 값을 세 곳에 넣지 않는다.**
 *
 * 서버가 붙으면 이 파일은 MSW 핸들러의 응답으로 옮겨간다 — 화면은 그대로다.
 */
export type ScheduleSource = "calendar" | "manual";

/** `schema.Schedule` 그대로. 서버가 붙어도 모양이 바뀌지 않게 필드를 다 든다 */
export type Schedule = {
  id: string;
  date: string;
  title: string;
  /** MVP 는 항상 `null` — 직접 추가(`12-e`)에 시간 입력이 없다 */
  time: null;
  source: ScheduleSource;
  externalId: string | null;
  done: boolean;
  doneAt: string | null;
  /** 1~9 · 0~2개 권장, 상한 없음 */
  emotions: EmotionId[];
  /** 목록에서만 감춘다 — 캘린더 원본은 지우지 않는다 */
  hidden: boolean;
};

/** `schema.Moment`. 화면 문구는 **「순간」**이다 — "메모"라고 부르지 않는다 */
export type Moment = {
  id: string;
  createdAt: string;
  date: string;
  text: string;
  /** 실패로 표시하지 않고 "올리는 중" — `local | uploading | synced` */
  syncState: "local" | "uploading" | "synced";
};

/** 오늘 — 하루는 새벽 4:00 에 넘어간다(`RULES.md`). `day.ts` 가 생기면 그리로 옮긴다 */
export const SAMPLE_TODAY = "2026-07-27";

export const SAMPLE_USER = {
  nickname: "지현",
  retroTime: "21:30",
  notifyRetro: true,
} as const;

/** 「맑음 · 27℃」 — 상단 한 줄 */
export const SAMPLE_WEATHER = { label: "맑음", celsius: 27 } as const;

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
  emotions: [EmotionId, EmotionId];
  body: string;
};

export const SAMPLE_DIARY_MONTH = "2026-07";

export const SAMPLE_DIARIES: SampleDiary[] = [
  { day: 1, emotions: [5, 4], body: "새 달의 첫날. 계획을 세우다 말았지만 그래도 적어는 뒀다." },
  { day: 4, emotions: [9, 4], body: "오랜만에 늦잠을 잤다. 죄책감보다 개운함이 컸다." },
  { day: 8, emotions: [4, 8], body: "발표 준비를 끝냈다. 마지막 장을 덮을 때가 제일 좋다." },
  { day: 13, emotions: [3, 1], body: "메일 하나에 하루 기분이 흔들렸다. 답장은 내일 쓰기로 했다." },
  { day: 15, emotions: [7, 6], body: "몸이 무거운 하루. 그래도 저녁에 일찍 누웠다." },
  { day: 17, emotions: [5, 2], body: "그런 날도 있다. 이런 날은 그냥 지나가게 두기로 했다." },
  { day: 20, emotions: [7, 8], body: "미루던 운동을 10분이라도 했다. 시작하니 생각보다 가벼웠다." },
  { day: 21, emotions: [1, 9], body: "면접 일정이 잡혔다. 걱정이 앞섰지만 일단 달력에 적었다." },
  {
    day: 22,
    emotions: [3, 8],
    body: "회의는 답답했지만, 그 답답함은 내 의견을 전하고 싶다는 마음에서 왔다.",
  },
  { day: 24, emotions: [9, 4], body: "산책하다 해가 지는 걸 오래 봤다. 별일 없는 날이 좋았다." },
  { day: 26, emotions: [9, 4], body: "주말 내내 아무것도 안 했다. 그게 필요했던 것 같다." },
  { day: 27, emotions: [1, 2], body: "모의 면접에서 말이 막혔다. 그래도 끝까지 답했다." },
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
