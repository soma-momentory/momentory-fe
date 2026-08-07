import { create } from "zustand";

import type { EmotionId } from "@/design/theme";
import { initialDiaryData } from "@/features/diary/data/sampleAdapter";
import { clock } from "@/lib/clock";

import { actionCardOf } from "./selectors";
import type { ActionCard, Diary } from "./types";

/**
 * 회고를 마치면 남는 것 — `Diary` 한 장 + `ActionCard` 한 장.
 *
 * **점수·연속 일수·배지가 아니라 일기 한 장이다**(`RULES.md` 「불변 규칙」).
 * 그래서 이 store 에 카운터·스트릭이 없다 — 세는 것은 `ordinal`(몇 번째 장)뿐이고
 * 그것도 성취가 아니라 순번이다.
 *
 * 책임이 셋으로 나뉘어 있다(`docs/CODE-REVIEW.md` P2):
 * - **타입** → `model/types.ts` (스키마 그대로)
 * - **골라 읽기** → `model/selectors.ts`
 * - **샘플 seed** → `data/sampleAdapter.ts` — 서버가 붙으면 여기만 갈린다
 *
 * 이 파일에는 **상태와 그것을 바꾸는 action 만** 남는다.
 */
export type { ActionCard, Diary } from "./types";
export { actionCardOf };

type DiaryStore = {
  diaries: Diary[];
  actionCards: ActionCard[];
  /** `C6-b` 저장 — 일기 한 장과 행동 카드 한 장이 함께 남는다 */
  save: (input: {
    date: string;
    body: string;
    babaView: string;
    babaViewBasis?: string;
    emotions: EmotionId[];
    storyEmotion?: EmotionId | null;
    startEmotion?: EmotionId | null;
    weather?: string | null;
    situation: string;
    targetAction: string;
    /** 사용자가 초안을 고쳤는지 */
    edited: boolean;
  }) => void;
  /**
   * `A4` 수정 — **「내가 남긴 오늘」의 본문과 이 일기의 감정 태그뿐**이다.
   * 바바의 문장·행동 카드·그날의 기록은 건드리지 않는다.
   */
  edit: (id: string, input: { body: string; emotions: EmotionId[] }) => void;
  /**
   * `A4` 「이 회고 삭제」 — **지워지는 것은 일기 한 면이 아니라 회고 한 벌**이라
   * 붙어 있던 행동 카드도 함께 간다. 라벨이 「이 일기 삭제」가 아닌 이유다.
   *
   * 지운 것은 **`recentlyDeleted` 에 잠시 남는다** — `A4.md` 가 "지운 직후에는
   * 하단에 `[삭제했어요 · 되돌리기]` 를 잠시 둔다"고 한다. 되돌릴 수 있게
   * 만든다는 규칙이 여기까지 온다.
   */
  remove: (id: string) => void;
  /**
   * 지운 직후의 한 벌 — 되돌리기가 살아 있는 동안만 담긴다.
   * **확인 모달 대신 되돌리기**다(`RULES.md` — 모달을 두지 않는다).
   */
  recentlyDeleted: { diary: Diary; card: ActionCard | null } | null;
  /** `[되돌리기]` — 일기와 행동 카드를 **원래 자리(순서)** 로 되돌린다 */
  undoRemove: () => void;
  /** 되돌리기 줄이 사라질 때. 되돌릴 수 없게 된다 */
  clearRecentlyDeleted: () => void;
  /**
   * `A3` `[해봤어요]` — **토글이 아니라 한 번의 기록**이다. 되돌리는 것은
   * `undoAction` 이고 확인을 묻는 것은 화면 쪽 몫이다(느낀 점이 함께 지워진다).
   */
  markActionDone: (cardId: string) => void;
  /** 되돌리기 — 완료 기록과 **느낀 점이 함께** 사라진다 */
  undoActionDone: (cardId: string) => void;
  /** `A3-c` 느낀 점 한 줄. **선택**이다 — 비워 둬도 완료다 */
  setReflection: (cardId: string, text: string) => void;
  reset: () => void;
};

let seq = 0;
const nextId = (prefix: string) => `${prefix}-local-${++seq}`;

export const useDiary = create<DiaryStore>((set) => ({
  ...initialDiaryData(),

  save: ({
    date,
    body,
    babaView,
    babaViewBasis = null,
    emotions,
    storyEmotion = null,
    startEmotion = null,
    weather = null,
    situation,
    targetAction,
    edited,
  }) =>
    set((s) => {
      const diaryId = nextId("d");
      const now = clock.now().toISOString();
      return {
        diaries: [
          ...s.diaries,
          {
            id: diaryId,
            date,
            body,
            babaView,
            babaViewBasis,
            emotions,
            // 초안은 바바가 썼고, 고쳤으면 사용자의 것이 된다
            authoredBy: edited ? "user" : "baba",
            editedAt: edited ? now : null,
            ordinal: s.diaries.length + 1,
            storyEmotion,
            startEmotion,
            weather,
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

  edit: (id, { body, emotions }) =>
    set((s) => ({
      diaries: s.diaries.map((d) =>
        d.id === id
          ? {
              ...d,
              body,
              emotions,
              // 고친 순간부터 이 면은 사용자의 것이다
              authoredBy: "user",
              editedAt: clock.now().toISOString(),
            }
          : d,
      ),
    })),

  recentlyDeleted: null,

  remove: (id) =>
    set((s) => {
      const diary = s.diaries.find((d) => d.id === id);
      if (diary == null) return s;
      return {
        diaries: s.diaries.filter((d) => d.id !== id),
        // 회고 한 벌이 지워진다 — 붙어 있던 행동 카드도 함께
        actionCards: s.actionCards.filter((c) => c.diaryId !== id),
        // 잠시 들고 있는다 — 되돌리기가 이 값을 쓴다
        recentlyDeleted: { diary, card: actionCardOf(s.actionCards, id) },
      };
    }),

  undoRemove: () =>
    set((s) => {
      const kept = s.recentlyDeleted;
      if (kept == null) return s;
      return {
        // 맨 뒤가 아니라 **원래 순서**로 돌린다 — 되돌린 일기가 목록 끝에 가면
        // 되돌린 것이 아니라 새로 쓴 것처럼 보인다
        diaries: [...s.diaries, kept.diary].sort((a, b) => a.ordinal - b.ordinal),
        actionCards: kept.card == null ? s.actionCards : [...s.actionCards, kept.card],
        recentlyDeleted: null,
      };
    }),

  clearRecentlyDeleted: () => set({ recentlyDeleted: null }),

  markActionDone: (cardId) =>
    set((s) => ({
      actionCards: s.actionCards.map((c) =>
        c.id === cardId ? { ...c, done: true, doneAt: clock.now().toISOString() } : c,
      ),
    })),

  undoActionDone: (cardId) =>
    set((s) => ({
      actionCards: s.actionCards.map((c) =>
        // 느낀 점이 함께 사라진다 — 그래서 화면이 되돌리기 전에만 확인을 묻는다
        c.id === cardId ? { ...c, done: false, doneAt: null, reflection: null } : c,
      ),
    })),

  setReflection: (cardId, text) =>
    set((s) => ({
      actionCards: s.actionCards.map((c) =>
        c.id === cardId ? { ...c, reflection: text.trim().length === 0 ? null : text } : c,
      ),
    })),

  /**
   * 데모 시작값으로 되돌린다 — 서버가 붙으면 「다시 불러온다」가 된다.
   * 테스트에서 빈 상태가 필요하면 `setState({ diaries: [], actionCards: [] })`.
   */
  reset: () => set({ ...initialDiaryData(), recentlyDeleted: null }),
}));
