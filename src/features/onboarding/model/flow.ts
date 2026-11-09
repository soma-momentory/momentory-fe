import type { EmotionId } from "@/features/emotion/model/emotion";

/**
 * 온보딩 v2 의 **순서 · 문구 · 갈래**(2026-10-25). 화면은 여기서 읽기만 한다.
 *
 * 정본은 프로토타입(`analysis/2026-10-18-retention-loop/team-share/proto-v2.html`)에
 * **보이는 글자**다. 흐름은
 * 시작 → 문제 5장 → 소개 → 로그인 → 질문 4개 → 목표 → 답 정리 → 이름 → 나이 · 성별
 * → 캘린더 → 알림 → 연구 그래프 → 지금 첫 회고.
 *
 * 로그인 전에는 시작 · 문제 · 소개만 보인다(`app/intro/`). 이미 로그인한 사람(다시
 * 온보딩하는 기존 사용자)은 로그인만 건너뛰고 나머지를 전부 본다.
 */

/*
 * 2026-11-09 — 프로토타입의 소개 두 장(「일정마다 마음」 · 「다음 날 편지」)은 흐름에서 감춰 두던 것이라
 * 지웠다. 둘을 묶던 스위치(`LETTER_AND_SCHEDULE_EMOTION_READY`)와 그 문구 갈래도 함께 지웠다 —
 * 보이는 화면 · 문구는 그대로다. 다시 넣으려면 장을 새로 쓴다(git 이력에 프로토타입 판이 있다).
 */

// ── 로그인 전: 시작 · 문제 · 소개 ─────────────────────────────────────

export type IntroId =
  | "start"
  | "feelings"
  | "blur"
  | "ruminate"
  | "blank"
  | "help"
  | "talk"
  | "diary"
  | "rest"
  | "report";

export type IntroCard = {
  id: IntroId;
  /** 진행 막대의 묶음 — 시작은 막대가 없다 */
  group: "start" | "problem" | "feature";
  title: string;
  body: string;
  /** 연구 출처 한 줄 */
  cite?: string;
  /** 본문 끝에 굵게 붙는 한 문장 */
  emphasis?: string;
  button: string;
};

const ALL_INTRO: readonly IntroCard[] = [
  {
    id: "start",
    group: "start",
    title: "오늘 기분이 왜 그랬는지,\n생각해 본 적 있나요?",
    body: "저는 하루를 같이 돌아볼 카피바라, 바바예요",
    button: "시작하기",
  },
  {
    id: "feelings",
    group: "problem",
    title: "우리는 하루에도,\n수많은 감정을 느껴요",
    body: "언제 물어봐도,\n10번 중 9번은 어떤 감정이 있었어요.",
    emphasis: "그 감정, 밤까지 기억나나요?",
    cite: "Trampe 외(2015) · 11,572명",
    button: "다음",
  },
  {
    id: "blur",
    group: "problem",
    title: "그런데 밤이 되면,\n이유가 흐려져요",
    body: "낮에 왜 그런 기분이었는지, 잘 떠오르지 않아요",
    button: "다음",
  },
  {
    id: "ruminate",
    group: "problem",
    title: "혼자 되새기면,\n더 자주 떠올라요",
    body: "힘든 일을 혼자 되새긴 사람은, 일주일에 10번 가까이 다시 떠올렸어요",
    cite: "Kross · Ayduk(2008) 무작위 실험",
    button: "다음",
  },
  {
    id: "blank",
    group: "problem",
    title: "일기를 쓰려고 하면,\n첫 줄부터 막혀요",
    body: "지친 밤엔 빈 화면 앞에서 한 줄도 안 나와요",
    button: "다음",
  },
  {
    id: "help",
    group: "problem",
    title: "그래서,\n바바가 도와줄게요",
    body: "감정을 고르고 바바와 이야기하면, 일기는 바바가 써요",
    button: "다음",
  },
  {
    id: "talk",
    group: "feature",
    title: "밤 5분, 바바와 대화해요",
    body: "오늘 일정을 보고, 바바가 먼저 물어봐요",
    button: "다음",
  },
  {
    id: "diary",
    group: "feature",
    title: "대화가 끝나면,\n일기가 완성돼요",
    body: "직접 쓰지 않아도 돼요. 고치고 싶은 곳만 고치면 돼요",
    button: "다음",
  },
  {
    id: "rest",
    group: "feature",
    title: "지친 날엔,\n쉼터에서 쉬다 가요",
    body: "대화도 글도 필요 없어요. 걱정을 상자에 넣어 두거나 몸에 힘을 빼면, 머릿속이 조금 조용해져요",
    button: "다음",
  },
  {
    id: "report",
    group: "feature",
    title: "한 주의 기록을,\n리포트로 받아봐요",
    body: "하루만 써도 리포트가 생겨요. 쓴 날이 많을수록, 언제 지치고 언제 괜찮은지 보여요",
    button: "다음",
  },
];

export const INTRO_CARDS: readonly IntroCard[] = ALL_INTRO;

export const introCard = (id: IntroId): IntroCard => ALL_INTRO.find((c) => c.id === id)!;

export const introHref = (id: IntroId) => `/intro/${id}` as const;

/** 다음 장. 마지막 장 다음은 `null` — 로그인(또는 이미 로그인했으면 질문)이다 */
export function nextIntro(id: IntroId): IntroId | null {
  const i = ALL_INTRO.findIndex((c) => c.id === id);
  return ALL_INTRO.slice(i + 1).find((c) => INTRO_CARDS.includes(c))?.id ?? null;
}

/** 「건너뛰기」 — 문제 장은 소개 첫 장으로, 소개 장은 끝(로그인)으로 간다 */
export function skipIntro(id: IntroId): IntroId | null {
  if (introCard(id).group !== "problem") return null;
  return INTRO_CARDS.find((c) => c.group === "feature")?.id ?? null;
}

/** 진행 막대 — 같은 묶음 안에서 몇 번째인가. 시작 장은 막대가 없다 */
export function introProgress(id: IntroId): { index: number; count: number } | null {
  const { group } = introCard(id);
  if (group === "start") return null;
  const same = INTRO_CARDS.filter((c) => c.group === group);
  return { index: same.findIndex((c) => c.id === id), count: same.length };
}

// ── 로그인 뒤: 질문 · 목표 ────────────────────────────────────────────

export type MoodChange = "RARELY" | "FEW_TIMES" | "VERY_OFTEN";
export type KnowWhy = "MOSTLY" | "SOMETIMES" | "NOT_SURE";
export type DayEnd = "TIRED_SLEEP" | "OVERTHINK" | "OKAY";
export type DiaryHistory = "REGULARLY" | "STOPPED" | "RARELY";

export type Answers = {
  moodChange: MoodChange | null;
  knowWhy: KnowWhy | null;
  dayEnd: DayEnd | null;
  diaryHistory: DiaryHistory | null;
};
export type QuestionKey = keyof Answers;

type QuestionHref = "/mood" | "/why" | "/day-end" | "/diary-history";

type Question<K extends QuestionKey> = {
  key: K;
  href: QuestionHref;
  text: string;
  options: readonly { code: NonNullable<Answers[K]>; label: string }[];
};

export const QUESTIONS = [
  {
    key: "moodChange",
    href: "/mood",
    text: "하루에 기분이 몇 번쯤 바뀌나요?",
    options: [
      { code: "RARELY", label: "거의 그대로예요" },
      { code: "FEW_TIMES", label: "몇 번쯤 바뀌어요" },
      { code: "VERY_OFTEN", label: "셀 수 없이 자주요" },
    ],
  } satisfies Question<"moodChange">,
  {
    key: "knowWhy",
    href: "/why",
    text: "내 기분이 왜 그런지, 잘 아는 편인가요?",
    options: [
      { code: "MOSTLY", label: "대부분 알아요" },
      { code: "SOMETIMES", label: "가끔 알아요" },
      { code: "NOT_SURE", label: "잘 모르겠어요" },
    ],
  } satisfies Question<"knowWhy">,
  {
    key: "dayEnd",
    href: "/day-end",
    text: "하루가 끝나면, 주로 어떤 편인가요?",
    options: [
      { code: "TIRED_SLEEP", label: "지쳐서 바로 자요" },
      { code: "OVERTHINK", label: "생각이 많아져요" },
      { code: "OKAY", label: "그럭저럭 괜찮아요" },
    ],
  } satisfies Question<"dayEnd">,
  {
    key: "diaryHistory",
    href: "/diary-history",
    text: "일기를 써 본 적 있나요?",
    options: [
      { code: "REGULARLY", label: "꾸준히 써요" },
      { code: "STOPPED", label: "쓰다가 그만뒀어요" },
      { code: "RARELY", label: "거의 없어요" },
    ],
  } satisfies Question<"diaryHistory">,
] as const;

export type Goal =
  "KNOW_WHEN_TIRED" | "FIND_TIRED_REASON" | "WRAPUP_HABIT" | "DIARY_HABIT" | "REST_ON_HARD_DAYS";

/** 조약돌은 그림일 뿐 감정을 뜻하지 않는다 — 프로토타입의 색 순서를 따랐다 */
export const GOALS: readonly { code: Goal; label: string; pebble: EmotionId }[] = [
  { code: "KNOW_WHEN_TIRED", label: "내가 언제 지치는지 알기", pebble: 3 },
  { code: "FIND_TIRED_REASON", label: "지친 이유 찾기", pebble: 4 },
  { code: "WRAPUP_HABIT", label: "하루를 정리하는 습관 만들기", pebble: 2 },
  { code: "DIARY_HABIT", label: "일기 꾸준히 쓰기", pebble: 1 },
  { code: "REST_ON_HARD_DAYS", label: "힘든 날 잠깐 쉬어 가기", pebble: 7 },
];

/** 질문 다음 화면. 넷째 다음은 목표다 */
export function nextQuestionHref(key: QuestionKey): QuestionHref | "/goal" {
  const i = QUESTIONS.findIndex((q) => q.key === key);
  return QUESTIONS[i + 1]?.href ?? "/goal";
}

// ── 답 정리 · 이름 · 나이 성별 · 캘린더 · 알림 ────────────────────────

export const READING_LINES = [
  "알려 준 답을 살펴보는 중",
  "알림 받기 좋은 시각을 고르는 중",
  "바바에게 전하는 중",
] as const;

/** 이름 · 나이 성별 · 캘린더 · 알림 — 진행 막대 한 묶음 */
export const SETUP_STEPS = ["name", "about", "calendar", "notify"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** 질문 3 이 알림 기본 시각을 정한다 — 「지쳐서 바로 자요」만 9시, 나머지(건너뜀 포함)는 10시 반 */
export const defaultRetroTime = (dayEnd: DayEnd | null): string =>
  dayEnd === "TIRED_SLEEP" ? "21:00" : "22:30";

export const TIME_CHOICES = [
  { time: "21:00", label: "퇴근하고 9시" },
  { time: "22:30", label: "자기 전 10시 반" },
] as const;

/** 나이 입력 — 서버와 같은 범위(1~120). 비어 있으면 건너뛴 것이다 */
export const isValidAge = (age: string): boolean => {
  const t = age.trim();
  if (t.length === 0) return true;
  const n = Number(t);
  return Number.isInteger(n) && n >= 1 && n <= 120;
};

// ── 연구 그래프 · 지금 첫 회고 ───────────────────────────────────────

export const RESEARCH = {
  title: "이유를 돌아보면,\n덜 떠올라요",
  body: "한 걸음 떨어져서 이유를 돌아본 사람은, 다시 떠올린 횟수가 절반이었어요",
  cite: "Kross · Ayduk(2008) 무작위 실험 · 모멘토리를 쓴 결과는 아니에요",
};

export const RESEARCH_DETAILS: readonly { title: string; body: string; source: string }[] = [
  {
    title: "한 발 떨어져 이유를 돌아보면",
    body: "힘든 일을 한 발 떨어져 돌아본 사람은 일주일 동안 그 일이 4.7회 다시 떠올랐고, 그때로 돌아가 곱씹은 사람은 9.9회였어요.",
    source: "Kross · Ayduk, 2008 · 무작위 실험",
  },
  {
    title: "감정은 하루 내내 있어요",
    body: "11,572명에게 하루 중 무작위로 물었더니 응답의 90%에서 적어도 한 가지 감정을 느끼고 있었어요.",
    source: "Trampe 외, 2015 · PLOS ONE",
  },
  {
    title: "감정을 기록하면",
    body: "2~4주 동안 기분을 기록한 쪽은 8~10주 뒤 감정 알아차림 점수가 +7.3, 활동만 기록한 쪽은 +1.1이었어요.",
    source: "Kauer 외, 2012 · 114명",
  },
  {
    title: "감정에 이름을 붙이면",
    body: "감정 이름을 고르기만 해도 뇌의 감정 반응이 누그러졌어요.",
    source: "Lieberman 외, 2007 · 30명",
  },
  {
    title: "털어놓는 대화",
    body: "상대를 챗봇이라고 믿고 감정을 털어놓은 사람도, 사람이라고 믿은 사람만큼 대화 뒤 기분이 나아졌다고 답했어요.",
    source: "Ho 외, 2018 · 98명",
  },
];

export const RESEARCH_NOTE =
  "모두 연구 결과예요. 모멘토리를 쓴 결과는 아니고, 치료 효과를 뜻하지 않아요.";

export const FIRST_RETRO = {
  bubble: "지금 5분,\n오늘 있었던 일 하나만 들려줘요",
  title: "이야기하면, 오늘 일기가 바로 생겨요",
  body: "5분이면 충분해요. 밤에 하고 싶으면 그때 바바가 먼저 물어볼게요",
  now: "지금 이야기하기",
  /** 알림을 켜지 않았으면 「밤에」 바바가 부를 길이 없다 — 「다음에」로 말한다(`index.html` 7) */
  later: (notify: boolean) => (notify ? "밤에 할게요" : "다음에 할게요"),
};
