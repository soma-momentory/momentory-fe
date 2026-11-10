import { create } from "zustand";

import type { EmotionId } from "@/features/emotion/model/emotion";
import type {
  Reply,
  ReplyDiary,
  ReplyWishCard,
  ResumeMessage,
} from "@/features/retro/data/retroApi";

/**
 * 회고 한 벌 (채팅흐름_v2) — 시작 감정 없이 일기 작성부터 열려 `Diary` 한 장으로 끝난다.
 * 감정 탐색을 거치면 바람 카드도 함께 남는다.
 *
 * **대화는 서버가 주도한다**(`data/retroApi.ts`). 이 store 는 그 왕복이 들고 가는 값만 담는다 —
 * 세션 id · 화면에 쌓인 버블 · 서버가 준 마지막 응답 · (완료 시) 일기와 바람 카드.
 *
 * ## 여기서 지키는 규칙
 *
 * - **v2 는 시작 시 감정을 고르지 않는다** — `startEmotion` 이 사라졌다(일기 작성부터 시작)
 * - **진행률·단계 번호를 두지 않는다** — 어디까지 왔는지는 서버의 `phase` 가 안다
 * - **지난 버블을 삭제하지 않는다** — `turns` 는 쌓기만 한다
 *
 * 기기에는 남기지 않는다. 앱을 껐다 켜면 서버가 오늘 진행 중인 회고를 돌려주고(`fetchCurrentRetro`),
 * `resumeSession` 이 그 대화를 다시 쌓는다.
 */
export type { Reply } from "@/features/retro/data/retroApi";

/**
 * 대화 한 줄. `baba` 는 바바가 한 말, `me` 는 사용자가 한 말, `chip` 은 방향을
 * 고른 지점을 표시하는 줄(`.dirchip`)이다 — 칩이 경계선 역할을 해서 어디서부터
 * 방향을 정하고 이야기한 것인지 나중에 다시 봐도 보인다(`C4-d.md`).
 */
export type Turn = { id: string; who: "baba" | "me" | "chip"; text: string };

type RetroStore = {
  /** 서버 세션 식별자. 이후 모든 턴이 이걸 경로에 싣는다 */
  sessionId: number | null;
  /** 쌓기만 한다 — 지난 버블을 지우지 않는다 */
  turns: Turn[];
  /** 서버가 준 **마지막 응답**. 화면은 이걸 보고 입력 방식을 정한다(`options` 면 선택지, 아니면 자유 텍스트) */
  lastReply: Reply | null;
  /** 완료 응답의 일기 — `draft` 가 초안으로 받아 고친다 */
  diary: ReplyDiary | null;
  /** 완료 응답의 바람 카드 — 감정 탐색을 거친 경우에만 */
  wishCard: ReplyWishCard | null;

  /** 시작 응답을 받았다 — 세션을 열고 첫 응답을 반영한다 */
  beginSession: (sessionId: number, reply: Reply) => void;
  /** 앱을 다시 켜 진행 중인 회고를 이어 간다 — 서버가 준 지난 대화를 쌓고 마지막 응답을 반영한다 */
  resumeSession: (sessionId: number, messages: ResumeMessage[], reply: Reply) => void;
  /** 사용자가 한 줄 말했다(자유 텍스트·선택 요약) */
  addMyTurn: (text: string) => void;
  /** 선택을 남긴다 — 경계선 칩 */
  addChipTurn: (label: string) => void;
  /** 서버의 다음 응답을 반영한다 — 텍스트가 있으면 버블로 쌓고, 완료면 일기·바람 카드를 담는다 */
  applyReply: (reply: Reply) => void;
  /** 회고를 마쳤거나 로그아웃할 때 */
  reset: () => void;
};

let seq = 0;
const EMPTY = {
  sessionId: null,
  lastReply: null,
  diary: null,
  wishCard: null,
} as const;

const DIARY_NOTICE = "\n오늘 이야기는 일기로 정리해뒀어요.";

/** 마지막 공감·일기 정리 안내와 감정 탐색 안내·질문을 두 말로 나눈다. 안내가 없으면 그대로 둔다 */
const splitDiaryNotice = (text: string): string[] => {
  const boundary = text.indexOf(DIARY_NOTICE);
  if (boundary <= 0) return [text];
  const end = boundary + DIARY_NOTICE.length;
  const guidance = text.slice(end).trimStart();
  return guidance ? [text.slice(0, end), guidance] : [text];
};

const babaTurns = (texts: string[]): Turn[] =>
  texts.map((text) => ({ id: `t${++seq}`, who: "baba" as const, text }));

/** 응답 원문은 유지하고, 마지막 공감·일기 정리 안내와 감정 탐색 안내·질문을 두 버블로 표시한다. */
const withBabaBubble = (turns: Turn[], reply: Reply, previousPhase?: string): Turn[] => {
  if (reply.text == null || reply.text.length === 0) return turns;
  const intoExploration =
    previousPhase === "diary_chat" &&
    (reply.phase === "emotion_exploration" || reply.phase === "await_branch");
  return [...turns, ...babaTurns(intoExploration ? splitDiaryNotice(reply.text) : [reply.text])];
};

/** 서버가 준 지난 대화를 화면 버블로 옮긴다. 일기 정리 안내는 응답으로 받았을 때와 같이 나눈다 */
const resumedTurns = (messages: ResumeMessage[]): Turn[] =>
  messages.flatMap((m) =>
    m.role === "user"
      ? [{ id: `t${++seq}`, who: "me" as const, text: m.text }]
      : babaTurns(splitDiaryNotice(m.text)),
  );

export const useRetro = create<RetroStore>((set) => ({
  ...EMPTY,
  turns: [],

  beginSession: (sessionId, reply) =>
    set((s) => ({
      sessionId,
      lastReply: reply,
      turns: withBabaBubble(s.turns, reply),
      diary: reply.diary,
      wishCard: reply.wishCard,
    })),

  resumeSession: (sessionId, messages, reply) =>
    set({ ...EMPTY, sessionId, lastReply: reply, turns: resumedTurns(messages) }),

  addMyTurn: (text) => set((s) => ({ turns: [...s.turns, { id: `t${++seq}`, who: "me", text }] })),

  addChipTurn: (label) =>
    set((s) => ({ turns: [...s.turns, { id: `t${++seq}`, who: "chip", text: label }] })),

  applyReply: (reply) =>
    set((s) => ({
      lastReply: reply,
      turns: withBabaBubble(s.turns, reply, s.lastReply?.phase),
      // 완료 응답에만 실린다 — 아니면 그대로 둔다
      diary: reply.diary ?? s.diary,
      wishCard: reply.wishCard ?? s.wishCard,
    })),

  reset: () => set({ ...EMPTY, turns: [] }),
}));

/**
 * 감정 id(1~10) → 서버 감정 키 (채팅흐름_v2, 긍정→부정 재번호). `features/emotion` 의 `EMOTIONS`
 * 순서를 그대로 옮긴다. 번호가 아니라 키로 명시해, 한쪽이 바뀔 때 조용히 어긋나지 않게 한다.
 */
export const EMOTION_KEYS: Record<EmotionId, string> = {
  1: "happy",
  2: "proud",
  3: "calm",
  4: "tired",
  5: "stuck",
  6: "lethargic",
  7: "anxious",
  8: "depressed",
  9: "angry",
  10: "frustrated",
};

export const emotionKeyOf = (id: EmotionId): string => EMOTION_KEYS[id];

const ID_BY_KEY: Record<string, EmotionId> = Object.fromEntries(
  (Object.entries(EMOTION_KEYS) as [string, string][]).map(([id, key]) => [
    key,
    Number(id) as EmotionId,
  ]),
);

/** 서버 감정 키 → id. 모르는 키는 `null`(바람 카드·일기 태그의 키를 EmotionId 로 되돌린다) */
export const emotionIdOfKey = (key: string): EmotionId | null => ID_BY_KEY[key] ?? null;
