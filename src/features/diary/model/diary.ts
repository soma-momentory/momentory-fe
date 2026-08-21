import { create } from "zustand";

import {
  deleteDiary,
  isServerId,
  loadArchive,
  monthsBackFrom,
  putActionCardCompletion,
  serverRefusedWrite,
} from "@/features/diary/data/diaryApi";
import type { EmotionId } from "@/features/emotion/model/emotion";
import { clock } from "@/lib/clock";

import { actionCardOf } from "./selectors";
import type { ActionCard, Diary } from "./types";

/**
 * 서버에서 뒤로 훑는 달 수 — 요청 수의 상한이다. 새 앱은 이 창 안에 기록이 다
 * 들어온다. BE 에 가입일/전체 조회가 생기면 실제 범위로 바꾼다(`diaryApi.ts`).
 */
const ARCHIVE_MONTHS = 12;

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
 * - **서버 변환** → `data/diaryApi.ts` — 월별 조회를 `Diary`/`ActionCard` 로 옮긴다.
 *   샘플 seed(`data/sampleAdapter.ts`)는 **없앴다**(2026-08-21) — 채우는 곳은
 *   서버 하나다. 화면 테스트의 재료는 `src/testing/fixtures.ts` 에 있다.
 *
 * ## 서버가 붙었다 (2026-08-20)
 *
 * 초기값은 비어 있고 `load()` 가 서버에서 채운다(일정 store `useDay` 와 같은 결).
 * 쓰기도 이 경계를 지난다(`data/diaryApi.ts`):
 * - **삭제**(`DELETE /diaries/{id}`) — **일기만** 지운다. 행동 카드는 자기 보관함(쉼터)에
 *   남고 회고 세션도 남긴다(상류 스냅샷과의 차이 · `docs/PRODUCT.md`). 되돌리기 창(6초)이
 *   있어 **지연 삭제**한다 — 지우면 로컬에서 감추고, 창이 닫힐 때(`clearRecentlyDeleted`)
 *   서버로 보낸다. 되돌리면 서버 호출 자체가 없다.
 * - **「해봤어요」·되돌리기·느낀 점**(`PUT /action-cards/{id}/completion`) — 옵티미스틱하게
 *   먼저 바꾸고 서버가 **거부할 때만** 되돌린다(`serverRefusedWrite`).
 * - **C6 직접 고치기**(`PUT /diaries/by-retrospect/{id}`)는 draft 화면이 `data/diaryApi` 로
 *   직접 보낸다(이 store 밖). 저장 뒤 편집(`A4`)은 없다 — 고칠 기회는 저장 전 하나다.
 *
 * 쓰기가 옵티미스틱이라 `load()` 는 **한 번만** 돈다 — 다시 받으면 아직 서버에 닿지
 * 못한 변경이 덮인다(아래).
 *
 * 이 파일에는 **상태와 그것을 바꾸는 action 만** 남는다.
 */
export type { ActionCard, Diary } from "./types";
export { actionCardOf };

type DiaryStore = {
  diaries: Diary[];
  actionCards: ActionCard[];
  /** 서버 조회가 한 번이라도 채웠는가 — `load` 의 재실행을 막는다 */
  loaded: boolean;
  /**
   * 서버에서 최근 창을 받아 채운다 — 인증된 탭 진입에서 한 번 부른다
   * (`app/(tabs)/_layout.tsx`). **한 번만** 돈다: 다시 받으면 로컬 옵티미스틱
   * 변경(수정·삭제·「해봤어요」)이 서버 값으로 덮여 사라진다(읽기만 붙었다).
   * 못 받으면 가진 것을 그대로 두고 `loaded` 를 올리지 않아 다음에 다시 시도한다.
   */
  load: () => Promise<void>;
  /**
   * `C6-b` 저장 — 일기 한 장과 (있으면) 행동 카드 한 장이 함께 남는다.
   *
   * **행동 카드는 방향에 따라 없을 수 있다** — 짧은 기록형은 일기만 남긴다.
   * `situation`·`targetAction` 이 **둘 다** 있을 때만 카드를 만든다.
   */
  save: (input: {
    date: string;
    body: string;
    babaView: string | null;
    babaViewBasis?: string | null;
    emotions: EmotionId[];
    storyEmotion?: EmotionId | null;
    startEmotion?: EmotionId | null;
    weather?: string | null;
    situation?: string | null;
    targetAction?: string | null;
    /** 이 일기를 남긴 서버 회고 세션 id — 서버 저장분을 다시 불러오는 열쇠 */
    retrospectId?: string | null;
    /** 사용자가 초안을 고쳤는지 */
    edited: boolean;
  }) => void;
  /**
   * `A4` 수정 — **「내가 남긴 오늘」의 본문과 이 일기의 감정 태그뿐**이다.
   * 바바의 문장·행동 카드·그날의 기록은 건드리지 않는다.
   */
  edit: (id: string, input: { body: string; emotions: EmotionId[] }) => void;
  /**
   * 「이 회고 삭제」 — **일기만** 지운다. 행동 카드는 자기 보관함(쉼터)에 날짜로 남고
   * 회고 세션도 남긴다(상류 스냅샷과의 차이 · `docs/PRODUCT.md`).
   *
   * 로컬에서 먼저 감추고 **`recentlyDeleted` 에 잠시 남긴다** — `A4.md` 가 "지운 직후에는
   * 하단에 `[삭제했어요 · 되돌리기]` 를 잠시 둔다"고 한다. **서버 삭제는 미룬다**:
   * 되돌리기 창이 닫힐 때(`clearRecentlyDeleted`) 보낸다. 되돌리면(`undoRemove`) 서버로
   * 보내지 않는다 — 되살릴 재생성 계약이 없기 때문이다(지연 삭제).
   */
  remove: (id: string) => void;
  /**
   * 지운 직후의 일기 — 되돌리기가 살아 있는 동안만 담긴다.
   * **확인 모달 대신 되돌리기**다(`RULES.md` — 모달을 두지 않는다).
   * `card` 는 이제 함께 지우지 않으므로 항상 `null` 이다(자리만 지킨다).
   */
  recentlyDeleted: { diary: Diary; card: ActionCard | null } | null;
  /** `[되돌리기]` — 일기를 **원래 자리(순서)** 로 되돌린다. 서버 삭제를 취소한다 */
  undoRemove: () => void;
  /** 되돌리기 줄이 사라질 때 — 되돌릴 수 없게 된다. **미뤄둔 서버 삭제를 여기서 보낸다** */
  clearRecentlyDeleted: () => void;
  /**
   * `A3` `[해봤어요]` — **토글이 아니라 한 번의 기록**이다. 되돌리는 것은
   * `undoActionDone` 이고 확인을 묻는 것은 화면 쪽 몫이다(느낀 점이 함께 지워진다).
   * 옵티미스틱하게 바꾸고 서버가 거부할 때만 되돌린다.
   */
  markActionDone: (cardId: string) => void;
  /** 되돌리기 — 완료 기록과 **느낀 점이 함께** 사라진다. 옵티미스틱 + 서버 반영 */
  undoActionDone: (cardId: string) => void;
  /**
   * `A3-c` 느낀 점 한 줄. **선택**이다 — 비워 둬도 완료다.
   * **로컬만** 바꾼다(입력칸이 매 글자를 비춘다) — 서버 저장은 `saveReflection` 이 맡는다.
   */
  setReflection: (cardId: string, text: string) => void;
  /**
   * 느낀 점을 **서버에 커밋**한다 — 입력칸에서 포커스가 빠질 때(상세) · 저장 버튼(쉼터)에
   * 부른다. 매 글자마다 보내지 않으려고 `setReflection`(로컬)과 나눴다. 완료 상태의 서버
   * 카드에만 보낸다(로컬/미완료는 보낼 곳이 없다).
   */
  saveReflection: (cardId: string) => void;
  reset: () => void;
};

let seq = 0;
const nextId = (prefix: string) => `${prefix}-local-${++seq}`;

/** 진행 중인 `load` — 동시에 여러 번 불려도 한 번만 나간다(`useDay` 와 같은 결) */
let inFlight: Promise<void> | null = null;

export const useDiary = create<DiaryStore>((set, get) => ({
  diaries: [],
  actionCards: [],
  loaded: false,

  load: () => {
    if (inFlight != null) return inFlight;
    // 이미 채웠으면 다시 받지 않는다 — refetch 가 로컬 옵티미스틱 변경을 지운다
    if (get().loaded) return Promise.resolve();

    const months = monthsBackFrom(clock.today(), ARCHIVE_MONTHS);
    inFlight = loadArchive(months)
      .then((result) => {
        // 못 받았으면 **가진 것을 그대로 둔다** — 빈 목록으로 덮지 않는다
        if (result.ok) set({ ...result.data, loaded: true });
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  save: ({
    date,
    body,
    babaView,
    babaViewBasis = null,
    emotions,
    storyEmotion = null,
    startEmotion = null,
    weather = null,
    situation = null,
    targetAction = null,
    retrospectId = null,
    edited,
  }) =>
    set((s) => {
      const diaryId = nextId("d");
      const now = clock.now().toISOString();
      // 상황·목표 행동이 둘 다 있을 때만 행동 카드를 만든다 — 짧은 기록형은 일기만
      const hasCard =
        situation != null &&
        situation.length > 0 &&
        targetAction != null &&
        targetAction.length > 0;
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
            retrospectId,
          },
        ],
        actionCards: hasCard
          ? [
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
            ]
          : s.actionCards,
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
        // **행동 카드는 지우지 않는다** — 자기 보관함(쉼터)에 날짜로 남는다(PRODUCT.md 상류와 차이)
        // 잠시 들고 있는다 — 되돌리기가 이 값을 쓴다(카드는 남으므로 자리만 지킨다)
        recentlyDeleted: { diary, card: null },
      };
    }),

  undoRemove: () =>
    // 되돌리기 — `recentlyDeleted` 를 비워 **미뤄둔 서버 삭제를 취소**한다
    // (`clearRecentlyDeleted` 가 그때 null 을 보고 보내지 않는다)
    set((s) => {
      const kept = s.recentlyDeleted;
      if (kept == null) return s;
      return {
        // 맨 뒤가 아니라 **원래 순서**로 돌린다 — 되돌린 일기가 목록 끝에 가면
        // 되돌린 것이 아니라 새로 쓴 것처럼 보인다
        diaries: [...s.diaries, kept.diary].sort((a, b) => a.ordinal - b.ordinal),
        recentlyDeleted: null,
      };
    }),

  clearRecentlyDeleted: () => {
    // 되돌리기 창이 닫혔다 — **미뤄둔 서버 삭제를 지금 보낸다**(지연 삭제의 커밋 지점).
    // 서버가 준 일기에만 보낸다 — 로컬 전용(`*-local-*`)은 서버에 없다. 실패는 조용히
    // 두고(fail-quiet) 다음 `load` 에 서버 값이 다시 비친다.
    const kept = get().recentlyDeleted;
    set({ recentlyDeleted: null });
    if (kept != null && isServerId(kept.diary.id)) void deleteDiary(kept.diary.id);
  },

  markActionDone: (cardId) => {
    const before = get().actionCards.find((c) => c.id === cardId);
    if (before == null || before.done) return;
    set((s) => ({
      actionCards: s.actionCards.map((c) =>
        c.id === cardId ? { ...c, done: true, doneAt: clock.now().toISOString() } : c,
      ),
    }));
    if (!isServerId(cardId)) return;
    void putActionCardCompletion(cardId, true, before.reflection).then((r) => {
      if (r.ok || !serverRefusedWrite(r.code)) return;
      // 서버가 거부했다 — 되돌린다
      set((s) => ({
        actionCards: s.actionCards.map((c) =>
          c.id === cardId ? { ...c, done: before.done, doneAt: before.doneAt } : c,
        ),
      }));
    });
  },

  undoActionDone: (cardId) => {
    const before = get().actionCards.find((c) => c.id === cardId);
    if (before == null) return;
    set((s) => ({
      actionCards: s.actionCards.map((c) =>
        // 느낀 점이 함께 사라진다 — 그래서 화면이 되돌리기 전에만 확인을 묻는다
        c.id === cardId ? { ...c, done: false, doneAt: null, reflection: null } : c,
      ),
    }));
    if (!isServerId(cardId)) return;
    void putActionCardCompletion(cardId, false, null).then((r) => {
      if (r.ok || !serverRefusedWrite(r.code)) return;
      set((s) => ({
        actionCards: s.actionCards.map((c) =>
          c.id === cardId
            ? { ...c, done: before.done, doneAt: before.doneAt, reflection: before.reflection }
            : c,
        ),
      }));
    });
  },

  saveReflection: (cardId) => {
    const card = get().actionCards.find((c) => c.id === cardId);
    // 완료 상태의 서버 카드에만 보낸다 — 미완료·로컬 카드는 보낼 곳이 없다
    if (card == null || !card.done || !isServerId(cardId)) return;
    // fail-quiet — 사용자가 방금 친 한 줄을 서버 거부로 지우지 않는다(다음 load 에 화해)
    void putActionCardCompletion(cardId, true, card.reflection);
  },

  setReflection: (cardId, text) =>
    set((s) => ({
      actionCards: s.actionCards.map((c) =>
        c.id === cardId ? { ...c, reflection: text.trim().length === 0 ? null : text } : c,
      ),
    })),

  /**
   * **빈 상태로 되돌린다** — 로그아웃이 부른다(`clearUserScopedStores`).
   *
   * ⚠ 예전에는 샘플 12편으로 되돌렸다(2026-08-21 삭제). 앞 사람이 로그아웃한
   * 자리에 **남의 일기 열두 장이 새로 깔리는** 동작이었다 — 비우는 함수가
   * 채우고 있었다. 다음 사람의 보관함은 `load()` 가 서버에서 받아 채운다.
   */
  reset: () => set({ diaries: [], actionCards: [], loaded: false, recentlyDeleted: null }),
}));
