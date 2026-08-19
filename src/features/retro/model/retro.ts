import { create } from "zustand";

import type { EmotionId } from "@/features/emotion/model/emotion";
import type { Reply, ReplyActionCard, ReplyDiary } from "@/features/retro/data/retroApi";

/**
 * 회고 한 벌 — `C3` 시작 감정에서 열려 `C7` 에서 `Diary` 한 장으로 끝난다.
 *
 * **대화는 서버가 주도한다**(`data/retroApi.ts`). 이 store 는 그 왕복이 들고 가는
 * 값만 담는다 — 시작 감정 · 세션 id · 화면에 쌓인 버블 · 서버가 준 마지막 응답 ·
 * (완료 시) 일기와 행동 카드. 옛 `FOLLOW_UPS`·`DIRECTIONS`·`DRAFT_DEMO` 하드코딩은
 * 서버 연결로 사라졌다.
 *
 * ## 여기서 지키는 규칙
 *
 * - **감정 선택은 필수**이고 통과 버튼을 만들지 않는다(`C3.md`) — 시작 감정이
 *   없으면 서버에 회고를 열 수 없다(`startRetro` 의 `currentEmotion`)
 * - **하나만 고른다** — 그래서 `startEmotion` 이 배열이 아니다
 * - **진행률·단계 번호를 두지 않는다** — `step` 이 없는 이유다. 어디까지 왔는지는
 *   서버의 `phase` 가 알고 화면은 세지 않는다
 * - **지난 버블을 삭제하지 않는다**(`C4-b.md`) — `turns` 는 쌓기만 한다
 * - `[잠시 쉬기]` 는 **중단을 묻지 않는다** — 그래서 여기에 `cancel()` 이 없다.
 *   세션은 서버에 살아 있으므로 홈으로 나갔다 와도 이어진다(단, 지금은 메모리 전용 ⚠)
 *
 * ⚠ **아직 기기에 남기지 않는다.** 세션 id·대화 로그는 **앱이 떠 있는 동안**만
 * 산다 — 앱을 끄면 사라진다(서버 세션은 남지만 그 id 를 잃는다). `draft.ts` 와
 * 같은 시점(M3 · MMKV)에 함께 풀린다. **영속을 화면 문구로 약속하지 않는다.**
 */
export type { Reply } from "@/features/retro/data/retroApi";

/**
 * 대화 한 줄. `baba` 는 바바가 한 말, `me` 는 사용자가 한 말, `chip` 은 방향을
 * 고른 지점을 표시하는 줄(`.dirchip`)이다 — 칩이 경계선 역할을 해서 어디서부터
 * 방향을 정하고 이야기한 것인지 나중에 다시 봐도 보인다(`C4-d.md`).
 */
export type Turn = { id: string; who: "baba" | "me" | "chip"; text: string };

type RetroStore = {
  /** `C3` 에서 고른 시작 감정. 서버 `currentEmotion` 이자 상단 알약 · `C6`·`A3-b` 로 이어진다 */
  startEmotion: EmotionId | null;
  /** 서버 세션 식별자. 이후 모든 턴이 이걸 경로에 싣는다 */
  sessionId: number | null;
  /** 쌓기만 한다 — 지난 버블을 지우지 않는다 */
  turns: Turn[];
  /**
   * 서버가 준 **마지막 응답**. 화면은 이걸 보고 입력 방식을 정한다 —
   * `options` 면 선택지, `ui==="measure"` 면 슬라이더, 아니면 자유 텍스트.
   */
  lastReply: Reply | null;
  /** 완료 응답의 일기 — `C6`/`draft` 가 초안으로 받아 고친다. 서버가 대화를 읽고 쓴 값 */
  diary: ReplyDiary | null;
  /** 완료 응답의 행동 카드 — 방향에 따라 없을 수 있다 */
  actionCard: ReplyActionCard | null;

  setStartEmotion: (id: EmotionId) => void;
  /** 시작 응답을 받았다 — 세션을 열고 첫 응답을 반영한다 */
  beginSession: (sessionId: number, reply: Reply) => void;
  /** 사용자가 한 줄 말했다(자유 텍스트·측정 요약 등) */
  addMyTurn: (text: string) => void;
  /** 방향을 골랐다 — 경계선 칩을 남긴다 */
  addChipTurn: (label: string) => void;
  /** 서버의 다음 응답을 반영한다 — 텍스트가 있으면 버블로 쌓고, 완료면 일기를 담는다 */
  applyReply: (reply: Reply) => void;
  /** 회고를 마쳤거나(`C7`) 로그아웃할 때 */
  reset: () => void;
};

let seq = 0;
const EMPTY = {
  startEmotion: null,
  sessionId: null,
  lastReply: null,
  diary: null,
  actionCard: null,
} as const;

/** 텍스트가 있으면 바바 버블로 쌓는다 — 선택지·측정 응답도 안내 문장은 버블이다 */
const withBabaBubble = (turns: Turn[], reply: Reply): Turn[] =>
  reply.text == null || reply.text.length === 0
    ? turns
    : [...turns, { id: `t${++seq}`, who: "baba" as const, text: reply.text }];

export const useRetro = create<RetroStore>((set) => ({
  ...EMPTY,
  turns: [],

  setStartEmotion: (id) => set({ startEmotion: id }),

  beginSession: (sessionId, reply) =>
    set((s) => ({
      sessionId,
      lastReply: reply,
      turns: withBabaBubble(s.turns, reply),
      diary: reply.diary,
      actionCard: reply.actionCard,
    })),

  addMyTurn: (text) => set((s) => ({ turns: [...s.turns, { id: `t${++seq}`, who: "me", text }] })),

  addChipTurn: (label) =>
    set((s) => ({ turns: [...s.turns, { id: `t${++seq}`, who: "chip", text: label }] })),

  applyReply: (reply) =>
    set((s) => ({
      lastReply: reply,
      turns: withBabaBubble(s.turns, reply),
      // 완료 응답에만 실린다 — 아니면 그대로 둔다
      diary: reply.diary ?? s.diary,
      actionCard: reply.actionCard ?? s.actionCard,
    })),

  reset: () => set({ ...EMPTY, turns: [] }),
}));

/**
 * 감정 id(1~9) → 서버 감정 키. **순서가 `features/emotion` 의 `EMOTIONS` 와
 * BE `Emotion` 이 같다**
 * (1 불안함=anxious … 9 평온함=calm) — 그래도 번호가 아니라 키로 명시해 둔다.
 * 순서 가정이 코드 한 곳에만 남으면 한쪽이 바뀔 때 조용히 어긋난다.
 */
export const EMOTION_KEYS: Record<EmotionId, string> = {
  1: "anxious",
  2: "depressed",
  3: "angry",
  4: "happy",
  5: "stuck",
  6: "lethargic",
  7: "tired",
  8: "proud",
  9: "calm",
};

export const emotionKeyOf = (id: EmotionId): string => EMOTION_KEYS[id];
