import { create } from "zustand";

import type { EmotionId } from "@/design/theme";

/**
 * 회고 한 벌 — `C1` 에서 시작해 `C7` 에서 `Diary` 한 장으로 끝난다.
 *
 * `momentory.states.mvp.json` 의 `retro` 상태 기계가 라우트이고, 이 store 는
 * **그 흐름이 들고 가는 값**만 담는다 — 시작 감정 · 대화 · 고른 방향.
 *
 * ## 여기서 지키는 규칙
 *
 * - **감정 선택은 필수**이고 통과 버튼을 만들지 않는다(`C3.md`) — 시작 감정이
 *   없으면 첫 질문의 근거도, 리포트의 감정 흐름도 만들 수 없다
 * - **하나만 고른다** — 여러 개를 허용하면 "지금 가장 가까운"이라는 질문이
 *   무너진다. 그래서 `startEmotion` 이 배열이 아니다
 * - **진행률·단계 번호를 두지 않는다** — 이 store 에 `step` 이 없는 이유다.
 *   어디까지 왔는지는 라우트가 알고 화면은 세지 않는다
 * - **유형명은 내부값이다**(`feelings`/`reframe`/`solve`/`brief`) — 화면에
 *   쓰지 않는다. 사용자가 보는 것은 `DIRECTIONS` 의 문장뿐이다
 * - **지난 버블을 삭제하지 않는다**(`C4-b.md`) — 회고는 스스로 한 말을 되읽는
 *   과정이라 `turns` 는 쌓기만 한다
 * - `[잠시 쉬기]` 는 **자동 저장하고 홈에서 이어간다** — 중단을 묻지 않으므로
 *   여기에 `cancel()` 이 없다. 다시 들어오면 남아 있던 값이 그대로다
 */
export type RetroDirection = "feelings" | "reframe" | "solve" | "brief";

/**
 * 대화 한 줄. `baba` 는 바바가 한 말, `me` 는 사용자가 한 말,
 * `chip` 은 방향을 고른 지점을 표시하는 줄(`.dirchip`)이다.
 *
 * 칩이 **경계선 역할**을 해서 어디서부터 방향을 정하고 이야기한 것인지
 * 나중에 다시 봐도 보인다(`C4-d.md`).
 */
export type Turn = { id: string; who: "baba" | "me" | "chip"; text: string };

type RetroStore = {
  /** `C3` 에서 고른 시작 감정. `C4`~`C4-e` 상단 알약 · `C6`·`A3-b` 로 이어진다 */
  startEmotion: EmotionId | null;
  /** 쌓기만 한다 — 지난 버블을 지우지 않는다 */
  turns: Turn[];
  /**
   * `C4-c` 에서 고른 방향. **`[이 방향으로 이어가기]` 를 눌러야 확정된다** —
   * 시트를 닫으면 아무 일도 일어나지 않는다(`C4-c2.md`).
   */
  direction: RetroDirection | null;
  /**
   * `C4-e` 에서 사용자가 오늘을 다시 표현한 문장. **`C6` 일기의 재료**다.
   * 바바가 만들지 않는다 — 사용자의 말에서만 나온다.
   */
  balanceSentence: string | null;
  /**
   * `C4-e` 에서 사용자가 말한 다음에 해볼 한 가지. **`C6-b` 행동 카드의 재료**다.
   * 바바가 "이렇게 해보세요"로 제안하지 않는다(`C4-e.md`).
   */
  nextAction: string | null;

  setStartEmotion: (id: EmotionId) => void;
  addTurn: (who: Turn["who"], text: string) => void;
  setDirection: (d: RetroDirection) => void;
  setBalanceSentence: (text: string) => void;
  setNextAction: (text: string) => void;
  /** 회고를 마쳤거나(`C7`) 로그아웃할 때 */
  reset: () => void;
};

let seq = 0;
const EMPTY = {
  startEmotion: null,
  direction: null,
  balanceSentence: null,
  nextAction: null,
} as const;

export const useRetro = create<RetroStore>((set) => ({
  ...EMPTY,
  turns: [],

  setStartEmotion: (id) => set({ startEmotion: id }),

  addTurn: (who, text) =>
    set((s) => ({ turns: [...s.turns, { id: `t${++seq}`, who, text }] })),

  setDirection: (d) => set({ direction: d }),
  setBalanceSentence: (text) => set({ balanceSentence: text }),
  setNextAction: (text) => set({ nextAction: text }),

  reset: () => set({ ...EMPTY, turns: [] }),
}));

/**
 * 방향을 고른 뒤 바바가 잇는 말 — **사용자가 한 번 답할 때마다 한 묶음**이 나온다.
 *
 * 내부 흐름은 **감정 확인 → 관점 전환 → 균형 근거 → 사용자 문장 → 작은 행동**
 * 이고 **이 단계 이름을 화면에 쓰지 않는다**(`C4-d.md`). 기본 3~5회 답변 안에
 * 마무리한다 — 그래서 묶음이 넷이다.
 *
 * ⚠ **여기 있는 문장은 전부 시안(`9-mvp.mjs`)의 데모 대사다.** 진짜 응답은
 * 서버가 사용자의 답을 읽고 만드는데 BE 연결이 마지막이라(2026-08-07 결정)
 * 아직 고정 문장이다. **방향을 무엇으로 골라도 같은 대사가 나온다** — 시안이
 * `reframe` 한 갈래만 그렸기 때문이고, 나머지 셋의 대사를 지어내지 않았다.
 * 흐름·상태·규칙은 진짜이고 문장을 만드는 곳만 서버로 갈린다.
 */
export const FOLLOW_UPS: readonly (readonly string[])[] = [
  // 관점 확인 → 균형 근거 질문. 사용자가 말하지 않은 성공을 만들지 않는다 — 질문이지 단정이 아니다
  [
    "한 번 답이 막힌 일이 '나는 면접을 못한다'는 결론까지 커졌군요.",
    "오늘 완벽하지는 않았어도, 중간에 포기하지 않고 해낸 부분도 있었나요?",
  ],
  // 사실 확인 → 사용자 문장 요청
  [
    "긴장한 상황에서도 다시 말을 이어 끝까지 답했네요. 답이 막혔다는 사실만큼, 다시 시작했다는 사실도 오늘 있었던 일이에요.",
    "그렇다면 오늘을 조금 더 정확하게 표현하면 어떤 문장이 될까요?",
  ],
  // 칭찬은 사실 확인까지만 → 작은 행동 요청
  [
    "좋아요. 잘한 척하지 않으면서도 오늘 있었던 일을 빠뜨리지 않은 문장이네요.",
    "다음 면접을 위해 부담 없이 해볼 수 있는 한 가지가 있다면 무엇일까요?",
  ],
  // 마무리 — **요약을 대화에 다시 쓰지 않는다.** 정리하겠다고만 말한다(요약이 남는 자리는 일기다)
  ["좋아요. 오늘의 이야기와 내일 해볼 행동을 함께 정리해볼게요."],
];

/** 방향을 고른 뒤 몇 번째 답이 무엇의 재료인지 — `FOLLOW_UPS` 순서와 짝이다 */
export const BALANCE_ANSWER_INDEX = 3; // `C6` 일기
export const ACTION_ANSWER_INDEX = 4; //  `C6-b` 행동 카드

/**
 * 감정 이름의 관형형 — `C4` 의 첫 문장이 쓴다.
 * "지현님, 지금은 **우울한** 마음이 가장 가까이 있군요."
 *
 * **감정을 단정하지 않고 확인한다**(`C4.md`) — "우울하시군요"가 아니라
 * "우울한 마음이 가장 가까이 있군요". 그 문장을 아홉 감정 모두에서 성립시키려면
 * 이름(`theme.emotions`)의 관형형이 필요하다.
 *
 * ⚠ 스펙은 **우울함 하나의 문장만** 준다. 나머지 여덟은 이름을 문법적으로 굴린
 * 것이고 새 문안을 지어낸 것이 아니다 — 상류가 문안을 정하면 그걸로 바꾼다
 * (`TASKS.md` 「상류 확인」).
 */
export const EMOTION_ADNOMINAL: Record<EmotionId, string> = {
  1: "불안한",
  2: "우울한",
  3: "화나고 답답한",
  4: "행복한",
  5: "막막한",
  6: "무기력한",
  7: "피곤한",
  8: "뿌듯한",
  9: "평온한",
};

/**
 * 회고 방향 넷 — `C4-c.md` 의 표 그대로.
 *
 * **네 줄은 모두 사용자의 말로 쓴다.** 내부 용어(인지 재구성·문제 해결·강점
 * 기반)를 화면에 쓰지 않고, `id` 만 내부값이다.
 *
 * **추천을 두지 않는다** — 네 줄의 무게가 같고 아무것도 골라져 있지 않다.
 * `[바바에게 맡길게요]` 도 없다: 오늘을 어떻게 볼지는 사용자가 정한다.
 * **혼합형은 선택지에 없다** — 대화 중 옮겨가면 `mixed` 로 기록만 한다.
 */
export const DIRECTIONS: readonly {
  id: RetroDirection;
  title: string;
  desc: string;
  /** 고른 직후 바바가 잇는 질문 (`C4-d`) */
  question: string;
  /**
   * 대화에 남는 칩의 짧은 말(`.dirchip`). **내부 분기명이 아니라 사용자의 말**이다.
   *
   * ⚠ 스펙은 `reframe` 의 「다른 관점에서 바라보기」 하나만 준다(`C4-d.md` ·
   * `RULES.md` 샘플). 나머지 셋은 위 `title` 을 줄인 것이고 새 개념을 만든 것이
   * 아니다 — 상류가 문안을 정하면 그걸로 바꾼다(`TASKS.md` 「상류 확인」).
   */
  chip: string;
}[] = [
  {
    id: "feelings",
    title: "마음을 조금 더 이야기하며 정리하고 싶어요",
    desc: "지금 느끼는 마음을 천천히 풀어봐요.",
    question: "그 순간 가장 크게 느껴진 마음은 무엇이었나요?",
    chip: "마음 이야기하며 정리하기",
  },
  {
    id: "reframe",
    title: "지금 상황을 다른 관점에서 바라보고 싶어요",
    desc: "한쪽으로 기운 생각을 조금 더 정확하게 살펴봐요.",
    question: "그때 스스로에게 가장 먼저 어떤 말을 했나요?",
    chip: "다른 관점에서 바라보기",
  },
  {
    id: "solve",
    title: "지금 할 수 있는 방법을 찾아보고 싶어요",
    desc: "부담 없이 해볼 수 있는 작은 행동을 찾아봐요.",
    question: "다음에는 무엇이 조금 달라졌으면 좋겠나요?",
    chip: "지금 할 수 있는 방법 찾기",
  },
  {
    id: "brief",
    title: "오늘 있었던 일을 짧게 기록하고 싶어요",
    desc: "오늘의 핵심만 남기고 일기로 넘어가요.",
    question: "오늘 있었던 일과 그때의 마음을 한 문장으로 남겨볼까요?",
    chip: "짧게 기록하기",
  },
];

/** id 로 방향 하나를 찾는다 */
export const directionOf = (id: RetroDirection) => DIRECTIONS.find((d) => d.id === id);
