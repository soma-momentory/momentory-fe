/**
 * 감각연못 — 쉼 콘텐츠 첫 번째 (2026-09-03 도입 · 2026-11-04 그림과 화면을 다시 짰다).
 *
 * 현실에서 감각 하나를 찾을 때마다 아래 버튼을 누르고, 그때마다 바바가 연잎을 하나 건너간다.
 * 보이는 것 3개 → 들리는 소리 2개 → 몸에 닿는 느낌 1개를 찾으면 끝이다. 몸에 닿는 느낌만 톡이 아니라
 * 꾸욱 누르기다 — 한 번에 알아채는 것이 아니라 머물러야 느껴진다.
 *
 * ## 문안은 여기 산다
 *
 * 단계의 물음 · 예시 · 버튼은 제품 문안이라 화면이 아니라 도메인에 둔다(`contents.ts` 와 같은 판단).
 * 화면은 `SENSE_POND_STEPS` 를 순서대로 밟는다 — 크기 · 시간 · 자리는 디자인이라 `ds/pondScene.ts` 에 있다.
 *
 * ## 세는 것은 「찾은 개수」뿐이다
 *
 * 「숫자로 압박하지 않는다」(`RULES.md` 4)는 진행률 · 연속 일수 얘기다. 여기 `1 / 3` 은 **이 콘텐츠의
 * 놀이 규칙**이라 남긴다 — 다만 목표를 넘겨 세지 않고 시간을 재지 않는다.
 */
export type SensePondStepId = "see" | "hear" | "feel";

/** 감각의 표 — 보기는 돋보기(`eye`), 듣기는 음표(`sound`), 느낌은 바바 발(`hand`) */
export type SensePointKind = "eye" | "sound" | "hand";

/** 그 단계의 손짓 — 버튼을 톡 누르거나(`tap`) 꾸욱 누르고 있기(`hold`) */
export type PondInput = "tap" | "hold";

export type SensePondStep = {
  id: SensePondStepId;
  /** 말풍선의 물음 — `\n` 은 끊는 자리다 */
  question: string;
  /** 물음 아래의 예시 한 줄 */
  example: string;
  /** 아래 버튼 */
  button: string;
  /** 찾아야 하는 개수. 셈은 여기서 멈춘다 — 목표를 넘겨 세지 않는다 */
  goal: number;
  /** 낭독기가 셈 앞에 읽는 말 — 「보이는 것 · 1 / 3」 */
  counterLabel: string;
  point: SensePointKind;
  input: PondInput;
};

export const SENSE_POND_TITLE = "감각연못";

/** 시작 화면 — 무엇을 할지 한 줄과 시작 버튼 */
export const SENSE_POND_INTRO = {
  description: "보이는 것, 들리는 소리, 닿는 느낌을\n하나씩 찾아봐요",
  cta: "시작하기",
} as const;

export const SENSE_POND_STEPS: readonly SensePondStep[] = [
  {
    id: "see",
    question: "지금 눈에 보이는 걸\n3개 찾아봐요",
    example: "창밖 나무, 책상 위 컵, 내 손",
    button: "찾았어요",
    goal: 3,
    counterLabel: "보이는 것",
    point: "eye",
    input: "tap",
  },
  {
    id: "hear",
    question: "지금 들리는 소리를\n2개 찾아봐요",
    example: "에어컨 소리, 차 소리, 내 숨소리",
    button: "들었어요",
    goal: 2,
    counterLabel: "들리는 소리",
    point: "sound",
    input: "tap",
  },
  {
    id: "feel",
    question: "지금 몸에 닿는 느낌을\n하나 느껴봐요",
    example: "의자에 닿은 등, 바닥에 닿은 발",
    button: "꾸욱 누르면서 느끼기",
    goal: 1,
    counterLabel: "몸에 닿는 느낌",
    point: "hand",
    input: "hold",
  },
];

/** 끝 화면 — 셋을 다 찾은 뒤 같은 장면에서 뜬다. 수행 기록은 이용 기록(`useRestRecord`) 하나뿐이다 */
export const SENSE_POND_DONE = {
  title: "잘 찾았어요",
  description: "잠시 지금 이 순간에 머물렀어요.",
  cta: "쉼터로 돌아가기",
} as const;

/** 셈을 낭독기가 읽는 말 — 「보이는 것 · 1 / 3」 */
export const progressText = (step: SensePondStep, found: number) =>
  `${step.counterLabel} · ${Math.min(found, step.goal)} / ${step.goal}`;

/** 한 번 더 찾았다 — 목표에 닿으면 그대로 멈춘다 */
export const nextFound = (step: SensePondStep, found: number) => Math.min(found + 1, step.goal);

/** 이 단계를 다 채웠다 */
export const isStepDone = (step: SensePondStep, found: number) => found >= step.goal;
