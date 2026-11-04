import type { ExternalLink } from "@/lib/links";

/**
 * 쉼터 · 3분 명상 — 문안과 규칙 (2026-11-04).
 *
 * 마음에 맞는 풍경을 고르고 최대 3분 머문다. 3분은 권장 길이일 뿐이라 언제든 멈출 수 있고, 일찍
 * 멈춰도 실패로 말하지 않는다. 효과를 약속하지 않는다.
 *
 * 자막의 정본은 Notion 「쉼터 · 3분 컨셉 명상 개발 기획」 4절(v2)이고, 화면과 정보 문안의 정본은
 * Design 시안 「쉼터 · 3분 컨셉 명상 시안」이다. 자막을 고치면 두 곳이 어긋나지 않게 Notion 도 함께 본다.
 *
 * 자막과 음성은 같은 세션 시계를 따른다(`meditationAudio.ts`). 음성을 다시 만들면 `voiceTrack` 의 길이도
 * 함께 고친다.
 */
export const MEDITATION_DURATION_MS = 180_000;

const MINUTE = 60_000;

export type MeditationConceptId = "wave" | "forest" | "sunlight" | "rain" | "lantern";

export type MeditationCue = { startMs: number; endMs: number; text: string };

/** 안내 음성 한 토막 — 세션 시계의 어디서 시작해 얼마나 나는지 */
export type MeditationVoice = { startMs: number; durationMs: number };

export type MeditationConcept = {
  id: MeditationConceptId;
  name: string;
  /** 어떤 때에 고르는지 — 준비 화면에서 이름 아래 선다 */
  sub: string;
  cues: readonly MeditationCue[];
  voices: readonly MeditationVoice[];
  info: {
    /** 진행 방식 */
    desc: string;
    /** 참고한 실습 */
    practice: string;
    /** 저자 · 기관 */
    author: string;
    link: ExternalLink;
    linkLabel: string;
    /** 제품용 재구성 설명 — 원문 번역이나 공식 대본으로 읽히지 않게 */
    note: string;
  };
};

/** 1분씩 세 구간 — 구간 시작에 짧게 안내하고 나머지는 여백이라, 한 문장이 그 구간 내내 선다 */
const threeMinutes = (first: string, second: string, third: string): readonly MeditationCue[] => [
  { startMs: 0, endMs: MINUTE, text: first },
  { startMs: MINUTE, endMs: 2 * MINUTE, text: second },
  { startMs: 2 * MINUTE, endMs: 3 * MINUTE, text: third },
];

/**
 * 음성은 구간 시작에서 0.3초 뒤에 나온다 — 자막이 옅어졌다 새 문장으로 바뀌는 때(`meditationMotion.cueOut`
 * 0.4초)와 맞춘다. 길이는 음원 파일의 실제 길이다.
 */
const VOICE_DELAY_MS = 300;

/** 작은 모닥불 셋째 토막에서 「편하다면…」을 읽기 시작하는 때(토막 5.6초)에 맞춘 자막 전환 */
const LANTERN_SECOND_SENTENCE_MS = 2 * MINUTE + 5_500;

const voiceTrack = (...durationsMs: readonly number[]): readonly MeditationVoice[] =>
  durationsMs.map((durationMs, i) => ({
    startMs: i * MINUTE + VOICE_DELAY_MS,
    durationMs,
  }));

export const MEDITATION_CONCEPTS: readonly MeditationConcept[] = [
  {
    id: "wave",
    name: "파도",
    sub: "마음이 급할 때",
    voices: voiceTrack(8516, 6687, 8202),
    cues: threeMinutes(
      "지금 떠오르는 생각, 감정, 몸의 감각을 살펴봅니다. 바꾸려 하지 않고, 있는 그대로 느껴봅니다.",
      "배에서 느껴지는 호흡의 움직임에 주의를 모읍니다. 주의가 흩어지면 호흡으로 돌아옵니다.",
      "호흡에서 몸 전체로 주의를 넓혀봅니다. 몸이 바닥이나 의자에 닿는 감각을 느끼며 잠시 머뭅니다.",
    ),
    info: {
      desc: "지금의 경험을 알아차리고, 호흡에 머물렀다가, 몸 전체로 주의를 넓혀요.",
      practice: "3분 호흡 공간 (Three-Minute Breathing Space)",
      author: "Zindel Segal · MBCT 공동개발자",
      link: "meditationBreathingSpace",
      linkLabel: "mindful.org",
      note: "참고 실습의 3단계(지금의 경험 알아차리기 → 호흡에 주의 모으기 → 몸 전체로 넓히기)를 각 1분씩 배치해 요약한 구성이에요. 원문 번역이나 공식 대본이 아니에요.",
    },
  },
  {
    id: "forest",
    name: "숲",
    sub: "생각이 많을 때",
    voices: voiceTrack(6191, 5878, 9247),
    cues: threeMinutes(
      "앉아 있는 몸의 감각을 살펴봅니다. 바닥이나 의자와 닿아 있는 곳을 느껴보세요.",
      "들리는 소리에 귀를 기울여 봅니다. 소리를 따라가려 하지 말고, 들려오는 대로 가만히 들어봅니다.",
      "생각이 떠오르면 잠시 두고, 들려오는 소리에 다시 귀를 기울여 봅니다. 몸의 감각과 숲의 소리를 느끼며 이 자리에 머뭅니다.",
    ),
    info: {
      desc: "앉아 있는 몸의 감각과 들려오는 소리에 차례로 주의를 두어요.",
      practice: "Body and Sound Meditation (유형 참고)",
      author: "UCLA Mindful · Diana Winston",
      link: "meditationUcla",
      linkLabel: "uclahealth.org",
      note: "몸과 소리를 알아차리는 실습 유형만 참고했어요. UCLA 원문 대본을 옮기거나 각색한 것이 아니에요.",
    },
  },
  {
    id: "sunlight",
    name: "햇살",
    sub: "몸이 긴장될 때",
    voices: voiceTrack(6426, 6687, 10031),
    cues: threeMinutes(
      "발과 다리에서 느껴지는 감각을 차례로 살펴봅니다. 특별한 감각이 없어도 괜찮습니다.",
      "몸통과 손, 팔의 감각으로 주의를 옮깁니다. 감각을 바꾸려고 힘쓰지 않아도 됩니다.",
      "어깨와 얼굴의 감각을 살펴보고, 몸 전체를 천천히 느껴봅니다. 편안하게 숨을 쉬며 잠시 이 감각에 머물러 봅니다.",
    ),
    info: {
      desc: "발에서 얼굴까지, 몸의 감각을 차례로 살펴보는 짧은 바디스캔이에요.",
      practice: "Short Body Scan (유형 참고)",
      author: "UCLA Mindful · Diana Winston",
      link: "meditationUcla",
      linkLabel: "uclahealth.org",
      note: "짧은 바디스캔 유형을 참고했고, 신체 순서와 문장은 제품용으로 새로 구성했어요.",
    },
  },
  {
    id: "rain",
    name: "비 오는 창가",
    sub: "하루를 마칠 때",
    voices: voiceTrack(6531, 6609, 8594),
    cues: threeMinutes(
      "하루를 마무리하는 지금, 어떤 생각과 감정, 몸의 감각이 있는지 살펴봅니다.",
      "자연스럽게 이어지는 호흡에 주의를 모읍니다. 배의 움직임을 느끼며 머물러 봅니다.",
      "몸 전체와 앉아 있는 자세로 주의를 넓힙니다. 지금 느끼는 감각을 간직하며 천천히 일상으로 돌아옵니다.",
    ),
    info: {
      desc: "하루를 마무리하며 지금의 경험, 호흡, 몸 전체를 차례로 살펴봐요.",
      practice: "3분 호흡 공간 (Three-Minute Breathing Space)",
      author: "Zindel Segal · MBCT 공동개발자",
      link: "meditationBreathingSpace",
      linkLabel: "mindful.org",
      note: "파도와 같은 3단계 호흡 공간이에요. 하루 마무리라는 사용 맥락만 달라요. 수면을 위한 실습이 아니에요.",
    },
  },
  {
    id: "lantern",
    name: "작은 모닥불",
    sub: "나에게 엄격해질 때",
    voices: voiceTrack(8202, 7393, 14289),
    cues: [
      {
        startMs: 0,
        endMs: MINUTE,
        text: "지금 내가 겪고 있는 어려움을 생각해봅니다. 그 마음이 몸에서는 어떻게 느껴지는지도 천천히 살펴 봅니다.",
      },
      {
        startMs: MINUTE,
        endMs: 2 * MINUTE,
        text: "힘든 순간은 누구에게나 찾아옵니다. 나만 이런 마음을 느끼는 것은 아니라는 걸, 잠시 떠올려 봅니다.",
      },
      // 음성이 두 문장 사이에서 1.5초 쉰다 — 뒷 문장을 읽기 시작할 때 자막도 바뀐다(새 문장은 0.4초 뒤에 선다)
      {
        startMs: 2 * MINUTE,
        endMs: LANTERN_SECOND_SENTENCE_MS,
        text: "나에게 필요한 다정한 말을 골라 마음속으로 건네봅니다.",
      },
      {
        startMs: LANTERN_SECOND_SENTENCE_MS,
        endMs: 3 * MINUTE,
        text: "편하다면 가슴 위에 손을 가볍게 얹거나 두 손을 포개어 봅니다. 손이 닿는 감각을 느끼며, 잠시 이 자리에 머뭅니다.",
      },
    ],
    info: {
      desc: "지금의 어려움을 알아차리고, 누구나 겪는 일임을 떠올리고, 나에게 다정한 말을 건네요.",
      practice: "Self-Compassion Break",
      author: "Kristin Neff",
      link: "meditationSelfCompassion",
      linkLabel: "self-compassion.org",
      note: "마음챙김 → 보편적 인간 경험 → 자기친절의 세 요소를 3분에 배치한 제품용 구성이에요. 공식 고정 3분 대본이 아니에요.",
    },
  },
];

export const MEDITATION_START = "시작하기";

export const MEDITATION_STOP = {
  title: "여기서 멈출까요?",
  description: "지금까지 머문 시간도 소중해요.",
  resume: "이어서 하기",
  stop: "여기서 멈추기",
} as const;

export const MEDITATION_LEAVE = "쉼터로 돌아가기";

export const MEDITATION_LOAD_ERROR = {
  title: "음성을 불러오지 못했어요.",
  description: "다시 시도하거나, 화면의 자막을 따라 시작할 수 있어요.",
  retry: "다시 시도",
  captions: "자막으로 시작",
} as const;

export const MEDITATION_VOICE_LABEL = "음성 안내 켜기/끄기";

export const MEDITATION_INFO = {
  title: "콘텐츠 정보",
  concept: "컨셉",
  desc: "진행 방식",
  practice: "참고한 실습",
  author: "저자 · 기관",
  source: "출처",
  badge: "제품용 재구성",
  disclaimer:
    "이 3분 콘텐츠는 주의를 기울이는 연습이에요. 편안함이나 치료 효과를 보장하지 않으며, 불편하면 언제든 멈출 수 있어요.",
} as const;

export const meditationConcept = (id: MeditationConceptId) =>
  MEDITATION_CONCEPTS.find((c) => c.id === id)!;

/** 지금 설 자막 — 끝(3분)에 닿으면 마지막 문장에 머문다 */
export const cueAt = (concept: MeditationConcept, elapsedMs: number) =>
  concept.cues.find((c) => elapsedMs < c.endMs) ?? concept.cues[concept.cues.length - 1]!;

/** 음성이 끝난 뒤 자막이 잠시 더 머무는 시간 — 마지막 말을 끝까지 읽을 틈 */
const CUE_LINGER_MS = 600;

/**
 * 지금 화면에 설 자막 — 음성 토막이 끝나면 다음 구간까지 비워 둔다(`null`). 음성을 꺼도 같은 시계를 따른다.
 */
export const visibleCueAt = (concept: MeditationConcept, elapsedMs: number) => {
  const current = [...concept.voices].reverse().find((v) => elapsedMs >= v.startMs);
  const spoken = current ?? concept.voices[0]!;
  return elapsedMs < spoken.startMs + spoken.durationMs + CUE_LINGER_MS
    ? cueAt(concept, elapsedMs)
    : null;
};

/** 지금 나야 할 음성 토막과 그 안의 자리 — 토막 사이의 여백이면 `null` */
export const voiceAt = (concept: MeditationConcept, elapsedMs: number) => {
  const index = concept.voices.findIndex(
    (v) => elapsedMs >= v.startMs && elapsedMs < v.startMs + v.durationMs,
  );
  return index < 0 ? null : { index, offsetMs: elapsedMs - concept.voices[index]!.startMs };
};

/** `00:45` — 3분을 넘겨 적지 않는다 */
export const formatMeditationClock = (ms: number) => {
  const seconds = Math.floor(Math.min(Math.max(ms, 0), MEDITATION_DURATION_MS) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
};

/**
 * 실제로 머문 시간만 흐르는 시계 — 일시정지 · 멈춤 확인 · 정보 창 · 앱이 뒤로 간 시간은 뺀다.
 * 멈춘 채로 태어나고, 앞의 까닭이 하나라도 있으면 화면이 `pause` 를 부른다.
 */
export function createMeditationClock(now: () => number = Date.now) {
  let banked = 0;
  let since: number | null = null;
  return {
    elapsed: () => banked + (since == null ? 0 : now() - since),
    pause() {
      if (since == null) return;
      banked += now() - since;
      since = null;
    },
    resume() {
      if (since == null) since = now();
    },
  };
}
