/**
 * 몸에 힘 빼기 — 쉼 콘텐츠 네 번째 (2026-10-05).
 *
 * 카피바라를 따라 **네 부위**(손과 팔 → 어깨와 목 → 얼굴 → 다리와 발)에 차례로
 * 힘을 줬다가(5초 · 들숨) 푼다(10초 · 날숨). 사용자가 누르는 것은 시작 버튼과
 * 마치기 버튼뿐이고, 나머지는 시간이 끌고 간다.
 *
 * 문안과 박자(5초 · 10초)는 제품 규칙이라 여기 둔다 — 크기·색·움직임의 시간은
 * 디자인이라 `ds/bodyRelease.ts` 에 있다.
 */
export type BodyReleasePhase = "tense" | "release";

export type BodyPart = {
  /** 아래 판의 부위 이름 — 「손과 팔」 */
  name: string;
  /** 힘주기 동안 위에 서는 안내 — **몸으로 바로 옮길 동작 하나** */
  tense: string;
  /** 풀기 동안 위에 서는 안내 — 방금 그 동작을 어떻게 푸는지 */
  release: string;
};

/**
 * 안내는 「○○에 힘을 줘보세요」가 아니라 **동작 하나**를 말한다 (2026-10-05 · 사용자
 * 피드백 「손과 팔에 힘줘보세요가 어렵다」). 어디에 어떻게 힘을 주라는 것인지 읽고 바로
 * 따라 할 수 있어야 한다 — 카피바라 포즈(주먹 · 으쓱 · 찡그림 · 발끝)와 같은 동작이다.
 * 풀기도 부위마다 그 동작을 되돌리는 말로 한다.
 */
export const BODY_RELEASE_PARTS: readonly BodyPart[] = [
  { name: "손과 팔", tense: "두 주먹을 꼭 쥐어보세요", release: "주먹을 스르르 펴보세요" },
  {
    name: "어깨와 목",
    tense: "어깨를 귀 쪽으로 으쓱 올려보세요",
    release: "어깨를 툭 내려놓아요",
  },
  { name: "얼굴", tense: "눈을 꼭 감고 얼굴을 찡그려보세요", release: "얼굴을 편안하게 풀어요" },
  {
    name: "다리와 발",
    tense: "발끝을 몸 쪽으로 당겨보세요",
    release: "다리를 편하게 내려놓아요",
  },
];

/** 한 부위의 박자 — 힘주기 5초 → 풀기 10초 */
export const BODY_RELEASE_SECONDS: Record<BodyReleasePhase, number> = { tense: 5, release: 10 };

export const BODY_RELEASE_INTRO = {
  title: "몸에 힘 빼기",
  description: "카피바라를 따라 천천히 힘을 빼요",
  /** 시작 전 아래 판 — 첫 부위가 무엇을 하는지 미리 말한다 */
  preview: "주먹을 살짝 쥐었다가 천천히 풀어요",
  cta: "따라 해보기",
} as const;

/** 위 안내 아래의 숨 한 줄 */
export const BODY_RELEASE_BREATH: Record<BodyReleasePhase, string> = {
  tense: "천천히 숨을 들이마셔요",
  release: "숨을 길게 내쉬어요",
};

export const BODY_RELEASE_PHASE_LABEL: Record<BodyReleasePhase, string> = {
  // 「풀기」보다 「힘 빼기」 — 이 콘텐츠의 이름과 같은 말이라 무엇을 푸는지가 분명하다
  // (2026-10-05 · 사용자 요청)
  tense: "힘 주기",
  release: "힘 빼기",
};

export const BODY_RELEASE_DONE = {
  title: "천천히 몸의 힘을 풀어봤어요",
  /** 제목 바로 아래 함께 서는 한 줄 */
  description: "지금 몸이 어떻게 느껴지는지 잠시 느껴보세요",
  cta: "마치기",
} as const;

export type BodyReleaseBeat =
  { done: false; part: number; phase: BodyReleasePhase; secondsLeft: number } | { done: true };

const PART_MS = (BODY_RELEASE_SECONDS.tense + BODY_RELEASE_SECONDS.release) * 1000;

/**
 * 시작한 뒤 `elapsedMs` 가 지났을 때 **지금 어디인가**.
 *
 * 남은 초를 하나씩 깎지 않고 시작 시각과의 차이로 매번 계산한다 — 앱이 잠깐
 * 뒤로 갔다 와도 박자가 어긋나지 않는다. `secondsLeft` 는 올림이라 5 → 1 로 센다.
 */
export const beatAt = (elapsedMs: number): BodyReleaseBeat => {
  const t = Math.max(0, elapsedMs);
  const part = Math.floor(t / PART_MS);
  if (part >= BODY_RELEASE_PARTS.length) return { done: true };
  const inPart = t - part * PART_MS;
  const tenseMs = BODY_RELEASE_SECONDS.tense * 1000;
  const phase: BodyReleasePhase = inPart < tenseMs ? "tense" : "release";
  const left = phase === "tense" ? tenseMs - inPart : PART_MS - inPart;
  return { done: false, part, phase, secondsLeft: Math.ceil(left / 1000) };
};
