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
 * 홈(`12`)은 **오후 2/4 마침**이고 회고(`C2`)는 밤 3/4 이다 — 같은 하루의
 * 다른 시각이라 값이 다른 것이 맞다(`RULES.md` 「샘플 데이터」).
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
    done: false,
    doneAt: null,
    emotions: [],
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
