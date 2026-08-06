import { create } from "zustand";

import type { EmotionId } from "@/design/theme";
import { SAMPLE_DIARIES, SAMPLE_DIARY_MONTH } from "@/mocks/sample";

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

  /**
   * ── 여기부터는 **그날의 기록**(`A3-b`)이다. 읽기 전용이고 `A4` 에서 고칠 수 없다.
   *
   * `emotions`(감정 태그)와 **다른 값**이다 — 태그는 목록·필터용이라 고칠 수
   * 있고, 이쪽은 그날 실제로 남은 기록이다. 한 줄로 합치면 어느 시점의 감정인지
   * 알 수 없어 상류가 두 줄로 나눴다(`A3-b.md` — 「회고 전 감정」은 폐기된 라벨).
   *
   * ⚠ 스키마상 원본은 `Schedule.emotions` 와 `Retro` 에 있는데 MVP 는 `Retro` 를
   * 따로 두지 않는다. **고정 스냅샷**이라는 규칙을 지키려면 일기가 들고 있어야
   * 해서 여기 뒀다 — 서버가 붙으면 `retroId` 로 따라가는 값이 된다(`TASKS.md`).
   */
  /** 일정에 붙었던 감정 */
  storyEmotion: EmotionId | null;
  /** `C3` 에서 고른 회고 시작 감정 */
  startEmotion: EmotionId | null;
  /** 그날의 날씨 — 읽기 전용 표시 */
  weather: string | null;
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

/**
 * 데모 시작값 — **서버가 이 사용자에 대해 갖고 있는 것**에 해당한다.
 * 보관함(`A1`·`A2`)이 이걸 읽어 「12편」과 달력 점을 그린다.
 * 회고를 마치면 이 뒤에 한 장이 더 붙는다.
 */
const seed = (): Diary[] =>
  SAMPLE_DIARIES.map((d, i) => ({
    id: `d-sample-${d.day}`,
    date: `${SAMPLE_DIARY_MONTH}-${String(d.day).padStart(2, "0")}`,
    body: d.body,
    babaView: d.babaView ?? null,
    babaViewBasis: d.babaViewBasis ?? null,
    emotions: [...d.emotions],
    authoredBy: "baba",
    editedAt: null,
    ordinal: i + 1,
    // 그날의 기록 — 감정 태그의 초기값이 여기서 왔다
    storyEmotion: d.emotions[0],
    startEmotion: d.emotions[1],
    weather: d.weather ?? null,
  }));

/** 샘플 일기에 붙는 행동 카드 — **일기 한 장에 한 장**뿐이다 */
const seedCards = (diaries: readonly Diary[]): ActionCard[] =>
  SAMPLE_DIARIES.flatMap((d, i) => {
    if (d.action == null) return [];
    const diary = diaries[i];
    if (diary == null) return [];
    return [
      {
        id: `ac-sample-${d.day}`,
        diaryId: diary.id,
        situation: d.action.situation,
        targetAction: d.action.targetAction,
        done: d.action.done ?? false,
        // 해본 날짜는 만든 다음 날로 둔다 — 「해봤어요 · 7월 21일」처럼 보인다
        doneAt: d.action.done === true ? `${diary.date}T09:00:00` : null,
        reflection: null,
        createdAt: diary.date,
      },
    ];
  });

const initial = () => {
  const diaries = seed();
  return { diaries, actionCards: seedCards(diaries) };
};

export const useDiary = create<DiaryStore>((set) => ({
  ...initial(),

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
      const now = new Date().toISOString();
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
              editedAt: new Date().toISOString(),
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
        c.id === cardId ? { ...c, done: true, doneAt: new Date().toISOString() } : c,
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
  reset: () => set({ ...initial(), recentlyDeleted: null }),
}));

/** 그 일기에 붙은 행동 카드 — **1:1** 이라 배열이 아니다 */
export const actionCardOf = (cards: readonly ActionCard[], diaryId: string) =>
  cards.find((c) => c.diaryId === diaryId) ?? null;
