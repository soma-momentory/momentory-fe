import { create } from "zustand";

import type { EmotionId } from "@/design/theme";

/**
 * 회고를 마치면 남는 것 — `Diary` 한 장 + `ActionCard` 한 장.
 *
 * **점수·연속 일수·배지가 아니라 일기 한 장이다**(`RULES.md` 「불변 규칙」).
 * 그래서 이 store 에 카운터·스트릭이 없다 — 세는 것은 `ordinal`(몇 번째 장)뿐이고
 * 그것도 성취가 아니라 순번이다.
 *
 * 타입은 `momentory.schema.mvp.json` 그대로다. 서버가 붙으면 이 store 안쪽만
 * 갈리고 화면은 그대로다(`CLAUDE.md` 「BE 는 마지막에 붙인다」).
 */
export type Diary = {
  id: string;
  date: string;
  /** 3~4문장 산문 — **요약 한 문장이 아니다**. 「내가 남긴 오늘」(`C6`·`A3`) */
  body: string;
  /** 「바바가 함께 본 오늘」(`C6-b`·`A3-b`). **회고를 마친 당시의 고정 스냅샷** */
  babaView: string | null;
  /** 그 문장을 쓴 근거 한 줄 — 대화에서 나온 말과 고른 방향을 밝힌다 */
  babaViewBasis: string | null;
  /**
   * 이 일기의 **감정 태그** — 목록·필터에 쓰는 값이다(`A2`·`A4` 에서 고칠 수 있음).
   * 초기값은 그날 남은 감정이고, **고쳐도 원본 감정 기록은 그대로다**.
   */
  emotions: EmotionId[];
  /** 초안은 `baba`, 사용자가 고치면 `user` */
  authoredBy: "baba" | "user";
  editedAt: string | null;
  /** 몇 번째 장. **연속 일수가 아니다** */
  ordinal: number;
};

/**
 * 그 일기에 **딱 한 장** 붙는다 — 따로 목록 화면을 만들지 않는다.
 * 여러 장을 만들면 할 일 목록이 되고, 할 일 목록은 지키지 못한 것의 목록이 된다.
 */
export type ActionCard = {
  id: string;
  diaryId: string;
  /** 언제 꺼내는가 */
  situation: string;
  /** 무엇을 하는가 · 한 문장 · 관찰 가능한 행동. **사용자가 말한 것을 옮긴다** */
  targetAction: string;
  /** `[해봤어요]` — 토글이 아니라 **한 번의 기록**이다(`A3`·`A3-c`) */
  done: boolean;
  doneAt: string | null;
  /** 해본 뒤 한 줄. **완료 전에는 자리를 열어두지 않는다** */
  reflection: string | null;
  createdAt: string;
};

type DiaryStore = {
  diaries: Diary[];
  actionCards: ActionCard[];
  /** `C6-b` 저장 — 일기 한 장과 행동 카드 한 장이 함께 남는다 */
  save: (input: {
    date: string;
    body: string;
    babaView: string;
    emotions: EmotionId[];
    situation: string;
    targetAction: string;
    /** 사용자가 초안을 고쳤는지 */
    edited: boolean;
  }) => void;
  reset: () => void;
};

let seq = 0;
const nextId = (prefix: string) => `${prefix}-local-${++seq}`;

export const useDiary = create<DiaryStore>((set) => ({
  diaries: [],
  actionCards: [],

  save: ({ date, body, babaView, emotions, situation, targetAction, edited }) =>
    set((s) => {
      const diaryId = nextId("d");
      const now = new Date().toISOString();
      return {
        diaries: [
          ...s.diaries,
          {
            id: diaryId,
            date,
            body,
            babaView,
            babaViewBasis: null,
            emotions,
            // 초안은 바바가 썼고, 고쳤으면 사용자의 것이 된다
            authoredBy: edited ? "user" : "baba",
            editedAt: edited ? now : null,
            ordinal: s.diaries.length + 1,
          },
        ],
        actionCards: [
          ...s.actionCards,
          {
            id: nextId("ac"),
            diaryId,
            situation,
            targetAction,
            done: false,
            doneAt: null,
            reflection: null,
            createdAt: now,
          },
        ],
      };
    }),

  reset: () => set({ diaries: [], actionCards: [] }),
}));
