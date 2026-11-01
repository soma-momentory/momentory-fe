/**
 * 회고 대화 대본 — LLM 대신 **결정적인 대본**으로 v2 흐름의 모든 국면을 지난다.
 *
 * ```
 * 시작 ─ diary_chat ─(자유 입력 1~2턴)─ await_branch(사건 둘 · 하나 고르기)
 *      ─ emotion_exploration(감정 후보 + 「직접 적기」 · 두 개까지)
 *      ─ emotion_exploration(바람 후보 + 「직접 적기」 · 두 개까지)
 *      ─ complete(일기 + 바람카드 저장)
 * ```
 *
 * - 첫 입력이 60자 이상이면 두 번째 자유 입력을 건너뛴다. 두 입력에서 사건이 하나밖에 안 나오면
 *   사건 고르기를 건너뛰고 바로 감정 탐색으로 간다(이때도 「일기로 정리해뒀어요」 두 버블 분리 규칙을 지킨다).
 * - **위기 안내** — 입력에 「위험」·「죽고 싶」·「사라지고 싶」·「#위험」이 있으면 `safety_hold` 로 멈춘다.
 *   단계는 그대로 두므로 「이어서 얘기하기」 뒤 다음 입력이 멈춘 자리에서 잇는다.
 * - **어뷰징 종료** — 입력에 「#종료」가 있으면 `ended` 로 끝난다(되돌릴 수 없다).
 * - 어느 단계든 자유 입력을 받는다(위기 안내 뒤 이어서 쓴 말) — 사건·감정·바람을 직접 적은 것으로 읽는다.
 */
import { diaryOn, hasSafetyWord } from "./derive";
import {
  EMOTION_KEYS,
  EMOTION_NAMES,
  nextId,
  type EmotionKey,
  type FakeDb,
  type Need,
  type RetroSessionRow,
} from "./db";

export type RetroReply = {
  phase: string;
  done: boolean;
  text?: string;
  options?: { id: string; label: string; description?: string; input?: boolean }[];
  diary?: { diary: string; diaryId: number; emotions: string[] };
  wishCard?: {
    situation: string;
    wishCardId: number;
    emotions: string[];
    needs: Need[];
    desiredState?: string;
    sentiment: "uncomfortable" | "positive";
  };
  safetyLevel?: string;
};

export type RetroCtx = {
  db: FakeDb;
  today: string;
  /** 새 기록의 createdAt */
  stamp: () => string;
  /** 오늘 일기를 덮어쓰기 전에 지운다(`index.ts` 「오늘 다시 쓰기」) */
  clearToday: () => void;
};

export const DIARY_NOTICE = "\n오늘 이야기는 일기로 정리해뒀어요.";
const ENDED_WORD = "#종료";

const EMOTION_DESCRIPTIONS: Record<EmotionKey, string> = {
  happy: "마음이 환하게 들뜬 느낌",
  proud: "애쓴 만큼 해냈다는 느낌",
  calm: "잔잔하고 편안한 느낌",
  tired: "몸과 마음이 지친 느낌",
  stuck: "어디로 가야 할지 모르겠는 느낌",
  lethargic: "아무것도 하기 싫은 느낌",
  anxious: "걱정이 자꾸 떠오르는 느낌",
  depressed: "마음이 가라앉는 느낌",
  angry: "속에서 열이 오르는 느낌",
  frustrated: "막힌 듯 답답한 느낌",
};

const EMOTION_HINTS: [EmotionKey, RegExp][] = [
  ["happy", /행복|기뻤|기쁘|좋았|신났|웃/],
  ["proud", /뿌듯|해냈|칭찬|잘했|성공/],
  ["calm", /편안|평온|여유|느긋|차분/],
  ["tired", /피곤|지쳤|지친|힘들|졸려|야근/],
  ["stuck", /막막|모르겠|제자리|길을/],
  ["lethargic", /무기력|귀찮|누워|미뤘|하기 싫/],
  ["anxious", /불안|걱정|긴장|떨렸|초조/],
  ["depressed", /우울|가라앉|서운|외로|슬펐/],
  ["angry", /화가|화났|짜증|열받/],
  ["frustrated", /답답|억울|말을 못|묻혔/],
];

const NEEDS_BY_EMOTION: Record<EmotionKey, Need[]> = {
  happy: [
    { word: "기쁨 나누기", meaning: "좋은 순간을 함께 누리는 것" },
    { word: "감사", meaning: "고마운 마음을 표현하는 것" },
  ],
  proud: [
    { word: "인정", meaning: "애쓴 만큼 알아봐 주길 바라는 마음" },
    { word: "성장", meaning: "조금씩 나아지고 있다는 느낌" },
  ],
  calm: [
    { word: "여유", meaning: "서두르지 않아도 괜찮은 시간" },
    { word: "안정", meaning: "흔들리지 않고 기댈 곳" },
  ],
  tired: [
    { word: "휴식", meaning: "몸과 마음이 쉬어 갈 틈" },
    { word: "돌봄", meaning: "나를 챙겨 주는 손길" },
  ],
  stuck: [
    { word: "방향", meaning: "어디로 가면 될지 알고 싶은 마음" },
    { word: "도움", meaning: "함께 길을 찾아 줄 누군가" },
  ],
  lethargic: [
    { word: "회복", meaning: "다시 움직일 힘이 차오르는 것" },
    { word: "의미", meaning: "하는 일이 나에게 닿는 느낌" },
  ],
  anxious: [
    { word: "안정", meaning: "흔들리지 않고 기댈 곳" },
    { word: "확신", meaning: "괜찮을 거라는 믿음" },
  ],
  depressed: [
    { word: "연결", meaning: "누군가와 이어져 있다는 느낌" },
    { word: "위로", meaning: "괜찮다고 말해 주는 마음" },
  ],
  angry: [
    { word: "공정함", meaning: "서로 지켜야 할 것을 함께 지키는 것" },
    { word: "존중", meaning: "내 의견이 가볍게 다뤄지지 않길 바라는 마음" },
  ],
  frustrated: [
    { word: "존중", meaning: "내 의견이 가볍게 다뤄지지 않길 바라는 마음" },
    { word: "이해", meaning: "내 마음을 있는 그대로 알아주는 것" },
  ],
};

const DESIRED: Record<string, string> = {
  존중: "끝까지 들어주는 자리에서 말하고 싶었다",
  휴식: "하루 끝에는 몸이 먼저 쉬었으면 좋겠다",
  안정: "흔들리는 날에도 기댈 곳이 있었으면 좋겠다",
  연결: "먼저 안부를 건넬 수 있는 마음이 생기면 좋겠다",
  인정: "애쓴 나를 스스로 알아봐 주고 싶다",
  여유: "서두르지 않는 시간을 조금 더 지키고 싶다",
  방향: "작게라도 시작점을 찾고 싶다",
  회복: "아주 작은 것 하나라도 해냈다고 느끼고 싶다",
};

const POSITIVE: readonly EmotionKey[] = ["happy", "proud", "calm"];

const detectEmotions = (text: string): EmotionKey[] =>
  EMOTION_HINTS.filter(([, re]) => re.test(text)).map(([key]) => key);

/** 문장 하나를 사건 이름으로 줄인다 */
const eventOf = (text: string): string | null => {
  const first = text.split(/[.!?。\n]/)[0]?.trim() ?? "";
  if (first.length === 0) return null;
  return first.length > 26 ? `${first.slice(0, 25)}…` : first;
};

const quoteList = (words: string[]) => words.map((w) => `「${w}」`).join(", ");

const emotionOptions = (candidates: EmotionKey[]) => [
  ...candidates.map((key, i) => ({
    id: String(i + 1),
    label: EMOTION_NAMES[key],
    description: EMOTION_DESCRIPTIONS[key],
  })),
  { id: String(candidates.length + 1), label: "직접 적기", input: true },
];

const needOptions = (candidates: Need[]) => [
  ...candidates.map((n, i) => ({
    id: String(i + 1),
    label: n.word,
    ...(n.meaning ? { description: n.meaning } : {}),
  })),
  { id: String(candidates.length + 1), label: "직접 적기", input: true },
];

// ── 시작 ────────────────────────────────────────────────────────────────

export function startSession(
  ctx: RetroCtx,
  input: { schedules: RetroSessionRow["schedules"]; nickname: string | null },
): { sessionId: number; reply: RetroReply } {
  const session: RetroSessionRow = {
    id: nextId(ctx.db),
    day: ctx.today,
    step: "chat1",
    nickname: input.nickname,
    schedules: input.schedules,
    texts: [],
    events: [],
    event: null,
    emotionCandidates: [],
    emotions: [],
    customEmotion: null,
    needCandidates: [],
    needs: [],
    diaryId: null,
    actionCardId: null,
  };
  ctx.db.retroSessions.push(session);
  const done = input.schedules.find((s) => s.completed === true) ?? input.schedules[0];
  const hello = input.nickname
    ? `${input.nickname}님, 오늘 하루도 수고 많았어요.`
    : "오늘 하루도 수고 많았어요.";
  const ask = done
    ? `오늘 「${done.name}」 일정이 있었네요. 그 일은 어땠어요?`
    : "오늘 하루는 어땠어요? 떠오르는 일부터 편하게 이야기해 주세요.";
  return {
    sessionId: session.id,
    reply: { phase: "diary_chat", done: false, text: `${hello}\n${ask}` },
  };
}

// ── 턴 ─────────────────────────────────────────────────────────────────

export type TurnInput = { content?: string; optionIds?: string[] };
export type TurnResult =
  { ok: true; reply: RetroReply } | { ok: false; status: number; code: string };

const bad = (): TurnResult => ({ ok: false, status: 400, code: "INVALID_REQUEST" });

export function takeTurn(ctx: RetroCtx, s: RetroSessionRow, input: TurnInput): TurnResult {
  if (s.step === "complete" || s.step === "ended") return bad();
  const content = input.content?.trim() ?? null;
  const ids = input.optionIds ?? null;

  if (content != null && content.includes(ENDED_WORD)) {
    s.step = "ended";
    return {
      ok: true,
      reply: {
        phase: "ended",
        done: true,
        text: "오늘 대화는 여기서 마칠게요. 다음에 다시 이야기해요.",
      },
    };
  }
  if (content != null && hasSafetyWord(content)) {
    return {
      ok: true,
      reply: {
        phase: "safety_hold",
        done: false,
        safetyLevel: "risk",
        text: "많이 힘든 마음이 느껴져요. 지금 혼자 견디지 않아도 괜찮아요.\n자살예방 상담전화 109 는 24시간 언제든 이야기를 들어 줘요.\n조금 괜찮아지면 이어서 이야기해도 좋아요.",
      },
    };
  }

  switch (s.step) {
    case "chat1":
    case "chat2": {
      if (content == null || content.length === 0) return bad();
      s.texts.push(content);
      if (s.step === "chat1" && content.length < 60) {
        s.step = "chat2";
        return {
          ok: true,
          reply: {
            phase: "diary_chat",
            done: false,
            text: "그랬군요, 이야기해 줘서 고마워요.\n그때 가장 기억에 남는 장면이 있었어요? 조금만 더 들려줄래요?",
          },
        };
      }
      const sentences = s.texts.flatMap((t) => t.split(/[.!?。\n]/));
      const events = [...new Set(sentences.map(eventOf).filter((e): e is string => e != null))];
      s.events = events.slice(0, 2);
      if (s.events.length >= 2) {
        s.step = "branch";
        return {
          ok: true,
          reply: {
            phase: "await_branch",
            done: false,
            text: `들려줘서 고마워요.${DIARY_NOTICE}\n그중에서 어떤 일을 조금 더 들여다볼까요?`,
            options: s.events.map((label, i) => ({ id: String(i + 1), label })),
          },
        };
      }
      s.event = s.events[0] ?? "오늘 하루";
      return { ok: true, reply: emotionStep(s, `들려줘서 고마워요.${DIARY_NOTICE}\n`) };
    }
    case "branch": {
      if (content != null) s.event = eventOf(content) ?? content;
      else {
        if (ids == null || ids.length !== 1) return bad();
        const event = s.events[Number(ids[0]) - 1];
        if (event == null) return bad();
        s.event = event;
      }
      return { ok: true, reply: emotionStep(s, "") };
    }
    case "emotion": {
      if (content != null) {
        s.customEmotion = content;
        s.emotions = detectEmotions(content).slice(0, 2);
      } else {
        const picked = pickIds(ids, s.emotionCandidates.length);
        if (picked == null) return bad();
        s.emotions = picked.map((i) => s.emotionCandidates[i]!);
      }
      s.step = "needs";
      const pool = (s.emotions.length > 0 ? s.emotions : s.emotionCandidates.slice(0, 1)).flatMap(
        (e) => NEEDS_BY_EMOTION[e],
      );
      s.needCandidates = pool
        .filter((n, i) => pool.findIndex((m) => m.word === n.word) === i)
        .slice(0, 4);
      const felt =
        s.emotions.length > 0
          ? quoteList(s.emotions.map((e) => EMOTION_NAMES[e]))
          : `「${content}」`;
      return {
        ok: true,
        reply: {
          phase: "emotion_exploration",
          done: false,
          text: `${felt} 마음이 있었군요.\n그 마음 아래에는 어떤 바람이 있었을까요? 마음에 닿는 걸 두 개까지 골라 주세요.`,
          options: needOptions(s.needCandidates),
        },
      };
    }
    case "needs": {
      if (content != null) s.needs = [{ word: content.slice(0, 12) }];
      else {
        const picked = pickIds(ids, s.needCandidates.length);
        if (picked == null) return bad();
        s.needs = picked.map((i) => s.needCandidates[i]!);
      }
      return { ok: true, reply: complete(ctx, s) };
    }
  }
  return bad();
}

/** 1-base 번호 1~2개 → 0-base. 범위를 벗어나면 `null` */
const pickIds = (ids: string[] | null, size: number): number[] | null => {
  if (ids == null || ids.length < 1 || ids.length > 2) return null;
  const out = ids.map((id) => Number(id) - 1);
  return out.every((i) => Number.isInteger(i) && i >= 0 && i < size) ? [...new Set(out)] : null;
};

function emotionStep(s: RetroSessionRow, lead: string): RetroReply {
  s.step = "emotion";
  const found = detectEmotions([...s.texts, s.event ?? ""].join(" "));
  const fill: EmotionKey[] = ["tired", "anxious", "calm", "frustrated", "happy", "proud"];
  s.emotionCandidates = [...new Set([...found, ...fill])].slice(0, 4);
  return {
    phase: "emotion_exploration",
    done: false,
    text: `${lead}「${s.event}」 때 어떤 마음이었을까요?\n가까운 마음을 두 개까지 골라 주세요.`,
    options: emotionOptions(s.emotionCandidates),
  };
}

function complete(ctx: RetroCtx, s: RetroSessionRow): RetroReply {
  s.step = "complete";
  const event = s.event ?? "오늘 하루";
  const names = s.emotions.map((e) => EMOTION_NAMES[e]);
  const felt =
    names.length > 0 ? quoteList(names) : s.customEmotion ? `「${s.customEmotion}」` : null;
  const words = s.needs.map((n) => n.word);
  const diaryText = [
    s.texts.join("\n\n"),
    [
      felt
        ? `돌아보니 「${event}」 때 ${felt} 마음이 컸던 것 같다.`
        : `돌아보니 「${event}」이 오래 마음에 남았다.`,
      words.length > 0 ? `그 마음 아래에는 ${quoteList(words)}에 대한 바람이 있었다.` : "",
    ]
      .filter(Boolean)
      .join(" "),
  ].join("\n\n");

  // 오늘 일기가 있으면 덮어쓴다(오늘 다시 쓰기) — 하루에 일기는 하나다
  if (diaryOn(ctx.db, ctx.today) != null) ctx.clearToday();

  const createdAt = ctx.stamp();
  const diaryId = nextId(ctx.db);
  ctx.db.diaries.push({
    id: diaryId,
    retrospectId: s.id,
    primaryEmotion: s.emotions[0] ?? null,
    emotions: [...s.emotions],
    original: diaryText,
    createdAt,
    weather: null,
    letterPending: true,
  });
  const sentiment: "uncomfortable" | "positive" =
    s.emotions.length > 0 && s.emotions.every((e) => POSITIVE.includes(e))
      ? "positive"
      : "uncomfortable";
  const desiredState =
    DESIRED[words[0] ?? ""] ?? (words.length > 0 ? "그 바람이 조금 더 채워지면 좋겠다" : null);
  const cardId = nextId(ctx.db);
  ctx.db.actionCards.push({
    id: cardId,
    retrospectId: s.id,
    situation: event,
    emotions: [...s.emotions],
    needs: s.needs.map((n) => ({ ...n })),
    desiredState,
    targetAction: null,
    sentiment,
    done: false,
    doneAt: null,
    reflection: null,
    createdAt,
  });
  s.diaryId = diaryId;
  s.actionCardId = cardId;

  return {
    phase: "complete",
    done: true,
    text: "오늘 이야기를 일기와 바람카드로 정리해뒀어요. 내일 아침에 편지로 다시 찾아올게요.",
    diary: { diaryId, diary: diaryText, emotions: [...s.emotions] },
    wishCard: {
      wishCardId: cardId,
      situation: event,
      emotions: [...s.emotions],
      needs: s.needs.map((n) => ({ ...n })),
      ...(desiredState ? { desiredState } : {}),
      sentiment,
    },
  };
}

export const isEmotionKey = (v: unknown): v is EmotionKey =>
  typeof v === "string" && (EMOTION_KEYS as readonly string[]).includes(v);
