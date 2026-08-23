import { create } from "zustand";

import {
  deleteActionCard,
  deleteDiary,
  isServerId,
  loadArchive,
  monthsBackFrom,
  putActionCardCompletion,
  serverRefusedWrite,
} from "@/features/diary/data/diaryApi";
import type { EmotionId } from "@/features/emotion/model/emotion";
import { clock } from "@/lib/clock";

import { notifyDeleteResult } from "./deleteToast";
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
 *   남고 회고 세션도 남긴다(상류 스냅샷과의 차이 · `docs/PRODUCT.md`). 회고를 막 끝낸
 *   일기도 완료 응답이 준 서버 id 를 그대로 들고 있어 곧바로 지워진다. **확인 모달을
 *   지나면 그 자리에서 보낸다**(2026-08-21 · 되돌리기 폐지 · `PRODUCT.md` 「상류와 차이」).
 *   예전에는 되돌리기 창(6초) 동안 미뤘는데, 확인을 이미 한 번 받았으므로 두 번 묻는
 *   셈이었다. 실패했을 때만 되살린다.
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
    /**
     * 서버가 방금 저장한 일기의 id — 완료 턴 응답(`ReplyDiary.diaryId`)에서 온다. 있으면 이걸
     * 그대로 일기 id 로 써서, 저장 직후에도 이 id 로 서버 삭제(`DELETE /diaries/{id}`)가 닿는다.
     * 서버가 안 줬으면(옛 서버 등) 로컬 임시 id(`d-local-N`)를 쓴다 — 그 경우 삭제는 로컬만이다.
     */
    id?: string | null;
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
    /**
     * 서버가 방금 저장한 행동 카드의 id — 완료 턴 응답(`ReplyActionCard.actionCardId`)에서 온다.
     * 있으면 카드 id 로 그대로 써서, 저장 직후에도 「해봤어요」·느낀 점·삭제가 이 서버 id 로 닿는다.
     * 서버가 안 줬으면(옛 서버 등) 로컬 임시 id(`ac-local-N`).
     */
    actionCardId?: string | null;
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
   * ⚠ **되돌리기가 없다**(2026-08-21). 화면에서 빼고 **곧바로 서버로 보낸다** —
   * 앞에 확인 모달이 있으므로 되돌리기 줄은 같은 것을 두 번 묻는 셈이었다.
   * 행동카드 삭제와 문법이 같아졌고, `DESIGN.md` 「삭제는 확인 모달 1회」와도 맞는다.
   * 차이 기록: `docs/PRODUCT.md` 「상류와 차이」(`A4.md` 는 되돌리기 줄을 말한다).
   *
   * **서버 일기 id 로 지운다.** 회고를 막 끝낸 일기도 완료 응답이 그 일기의 서버 id 를 실어
   * 주므로(`ReplyDiary.diaryId` → `save({ id })`), 저장 직후에도 이 삭제가 서버에 닿는다.
   * 예전엔 저장 때 로컬 임시 id 만 붙여, 방금 만든 일기를 지우면 서버엔 남아 다음 조회에
   * 되살아났다.
   *
   * 결과는 **토스트 한 줄**로 알린다(`deleteToast.ts`). 답이 올 즈음 사용자는 다른
   * 화면에 가 있을 수 있어, 화면이 아니라 앱 껍데기가 그리는 통로(`lib/toast.ts`)를
   * 지난다. **서버가 받지 못했을 때만 되살린다** — 살아 있는 일기를 감춘 채로 두는
   * 쪽이 더 나쁘다.
   */
  remove: (id: string) => void;
  /**
   * 행동 카드 한 장 삭제 — **서버에서** 지운다(`DELETE /action-cards/{id}`).
   *
   * 회고를 막 끝낸 카드도 완료 응답이 준 서버 id(`actionCardId`)를 들고 있어(`save({ actionCardId })`),
   * 그 id 로 곧바로 지운다. 일기 삭제(`remove`)와 **문법이 같다** — 화면에서 먼저 빼고 서버로
   * 보내며, **서버가 받지 못했을 때만 되살린다.** 로컬 전용(`*-local-*`) 카드는 서버에 없으니
   * 화면에서만 뺀다.
   *
   * ⚠ 예전엔 서버에 카드 삭제 계약이 없어 지운 id 를 **기기에 묘비로 남기고** `load()` 가
   * 걸러냈다(기기 전용 삭제). 서버 삭제(`DELETE /action-cards/{id}`)가 생기면서 그 우회로는
   * 걷어냈다 — 서버가 실제로 지우므로 다음 조회에 다시 실려 오지 않는다.
   *
   * **결과는 이 store 가 알린다**(토스트 한 줄 · `deleteToast.ts`).
   */
  removeActionCard: (cardId: string) => void;
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

/**
 * 지웠던 일기를 **원래 순서**로 되돌린다 — 맨 뒤에 붙이면 되돌린 일기가 목록
 * 끝으로 가서 되돌린 것이 아니라 새로 쓴 것처럼 보인다.
 * 서버 삭제가 실패했을 때 되살리는 길이다.
 */
const restored = (diaries: readonly Diary[], diary: Diary): Diary[] =>
  [...diaries, diary].sort((a, b) => a.ordinal - b.ordinal);

/**
 * 지웠던 행동 카드를 되돌린다 — **순서를 맞추지 않는다.** 카드는 `ordinal` 이
 * 없고 화면이 `createdAt` 으로 세우므로(`features/rest/model/cards.ts`) 배열
 * 순서가 화면에 보이지 않는다. 이미 들어와 있으면 두 장이 되지 않게 그냥 둔다.
 */
const restoredCards = (cards: readonly ActionCard[], card: ActionCard): ActionCard[] =>
  cards.some((c) => c.id === card.id) ? [...cards] : [...cards, card];

/** 진행 중인 `load` — 동시에 여러 번 불려도 한 번만 나간다(`useDay` 와 같은 결) */
let inFlight: Promise<void> | null = null;

/**
 * **세션 세대** — 로그아웃(`reset`)이 하나 올린다.
 *
 * 이 store 의 비동기 작업 중 셋(`load` · 일기 삭제 실패 · 카드 삭제 실패)은
 * 끝날 때 **목록에 무언가를 넣는다.** 그 사이에 로그아웃하고 다른 사람이
 * 로그인해 있으면, 앞 사람의 일기·행동카드가 **새 사람의 보관함에 나타난다.**
 * 값을 고치기만 하는 쓰기(`markActionDone` 등)는 id 로 찾아 고치므로 비어 있는
 * store 에서 아무 일도 하지 않지만, **되살리기는 없는 것을 만들어 낸다.**
 *
 * 그래서 시작할 때 세대를 붙잡아 두고, 끝났을 때 같은 세션일 때만 손을 댄다.
 * (토스트도 함께 막는다 — 로그아웃한 화면에 「삭제했어요」가 뜰 이유가 없다.)
 */
let generation = 0;

/** 지금 세대를 붙잡는다. 돌려주는 함수가 「아직 같은 세션인가」를 답한다 */
const sameSession = () => {
  const at = generation;
  return () => at === generation;
};

export const useDiary = create<DiaryStore>((set, get) => ({
  diaries: [],
  actionCards: [],
  loaded: false,

  load: () => {
    if (inFlight != null) return inFlight;
    // 이미 채웠으면 다시 받지 않는다 — refetch 가 로컬 옵티미스틱 변경을 지운다
    if (get().loaded) return Promise.resolve();

    const still = sameSession();
    const months = monthsBackFrom(clock.today(), ARCHIVE_MONTHS);
    inFlight = loadArchive(months)
      .then((result) => {
        // 못 받았으면 **가진 것을 그대로 둔다** — 빈 목록으로 덮지 않는다
        if (!result.ok) return;
        // 조회하는 사이 로그아웃했다 — 앞 사람의 보관함을 새 세션에 붓지 않는다
        if (!still()) return;
        set({
          diaries: result.data.diaries,
          actionCards: result.data.actionCards,
          loaded: true,
        });
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  save: ({
    id = null,
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
    actionCardId = null,
    retrospectId = null,
    edited,
  }) =>
    set((s) => {
      // 서버가 준 id 가 있으면 그대로 쓴다 — 저장 직후에도 이 id 로 서버 삭제가 닿는다.
      // 없으면 로컬 임시 id(옛 서버 대비 안전망).
      const diaryId = id ?? nextId("d");
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
                // 서버가 준 카드 id 가 있으면 그대로 — 저장 직후에도 완료/느낀 점/삭제가 서버에 닿는다
                id: actionCardId ?? nextId("ac"),
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

  remove: (id) => {
    const kept = get().diaries.find((d) => d.id === id);
    // 이미 없는 일기다 — 지운 척하지 않는다
    if (kept == null) return;

    // **행동 카드는 지우지 않는다** — 자기 보관함(쉼터)에 날짜로 남는다(PRODUCT.md 상류와 차이)
    set((s) => ({ diaries: s.diaries.filter((d) => d.id !== id) }));

    // 서버가 준 일기에만 보낸다 — 로컬 전용(`*-local-*`)은 서버에 없으니 이미 끝났다.
    // 회고를 막 끝낸 일기도 완료 응답의 diaryId 를 그대로 들고 있어(서버 id) 여기로 온다.
    if (!isServerId(kept.id)) {
      notifyDeleteResult("일기", true);
      return;
    }

    const still = sameSession();
    void deleteDiary(kept.id).then((result) => {
      // 보내는 사이 로그아웃했다 — 앞 사람의 일기를 새 세션에 되살리지 않는다.
      // 서버 쪽은 이미 요청이 갔거나 안 갔거나로 끝났고, 다음 로그인의 `load` 가
      // 정본을 다시 가져온다
      if (!still()) return;
      if (result.ok) {
        notifyDeleteResult("일기", true);
        return;
      }
      /**
       * **실패하면 되돌린다.** 다른 쓰기(`markActionDone` 등)는 「서버가 답하고
       * 거부했을 때만」 되돌리는데(`serverRefusedWrite`), 삭제는 반대로 잡는다:
       * 요청이 나가지 못했으면 일기는 서버에 **그대로 살아 있다.** 화면에서만
       * 감춰 두면 없어진 줄 알았던 일기가 다음 조회에 되살아난다 — 살아 있는
       * 것을 감추는 쪽이 더 나쁘다. 반대로 실제로는 지워졌는데 되살렸다면
       * 다음 `load` 가 조용히 정리한다.
       */
      set((s) => ({ diaries: restored(s.diaries, kept) }));
      notifyDeleteResult("일기", false);
    });
  },

  removeActionCard: (cardId) => {
    const kept = get().actionCards.find((c) => c.id === cardId);
    // 이미 없는 카드다 — 지운 척하지 않는다
    if (kept == null) {
      notifyDeleteResult("행동카드", false);
      return;
    }

    // 먼저 화면에서 뺀다 — 서버 응답을 기다리지 않는다(일기 삭제와 같은 결)
    set((s) => ({ actionCards: s.actionCards.filter((c) => c.id !== cardId) }));

    // 서버가 준 카드에만 보낸다 — 로컬 전용(`*-local-*`)은 서버에 없으니 이미 끝났다.
    // 회고를 막 끝낸 카드도 완료 응답의 서버 id 를 들고 있어 여기로 온다(일기 삭제와 같은 결).
    if (!isServerId(cardId)) {
      notifyDeleteResult("행동카드", true);
      return;
    }

    const still = sameSession();
    void deleteActionCard(cardId).then((result) => {
      if (!still()) return;
      if (result.ok) {
        notifyDeleteResult("행동카드", true);
        return;
      }
      // 실패하면 되살린다 — 요청이 못 나갔으면 카드는 서버에 그대로 살아 있다(일기 삭제와 같다)
      set((s) => ({ actionCards: restoredCards(s.actionCards, kept) }));
      notifyDeleteResult("행동카드", false);
    });
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
  reset: () => {
    // 진행 중이던 조회·삭제가 **새 세션에 손대지 못하게** 세대를 올린다.
    // `inFlight` 도 함께 놓는다 — 앞 사람의 조회를 다음 사람이 물려받으면
    // 그 사람의 첫 `load` 가 아무것도 못 채우고 끝난다
    generation += 1;
    inFlight = null;
    set({ diaries: [], actionCards: [], loaded: false });
  },
}));
