import type { WishAuthor, WishOutcome } from "../data/wishApi";

/**
 * 소원 연꽃 — 문안과 규칙 (2026-11-04).
 *
 * 귤 없이 누구나 하루에 하나, 「익명의 누군가」로 7일 동안 띄운다. 남의 소원은 꾸욱 눌러 같이 빈다.
 * 같이 빈 사람 수는 세어 보여 주지 않는다. 심사 · 하루 하나 · 신고의 판정은 서버가 한다.
 */
export const WISH_MAX_LENGTH = 120;
export const WISH_ANONYMOUS = "익명의 누군가";
export const WISH_BABA = "바바의 소원";

export const WISH_PILL = {
  write: "내 소원 빌기",
  postedToday: "소원 연꽃은 하루에 한 번만 띄울 수 있어요",
  hold: "꾸욱 눌러 같이 빌기",
  holdShort: "꾹 눌러 주세요",
  joined: "같이 빌어준 소원이에요",
  done: "다 썼어요",
  reviewing: "살펴보는 중",
  leave: "쉼터로 돌아가기",
} as const;

export const WISH_WRITE_ASK = "어떤 소원을 띄울까요?";
export const WISH_WRITE_PLACEHOLDER = "내일 면접에서 떨지 않으면 좋겠어요";
export const WISH_JOIN_ON_NOTE = "같이 빌기";
export const WISH_JOINED_CHIP = "같이 빌었어요";
export const WISH_POSTED = "연못에 띄웠어요\n제가 먼저 같이 빌었어요";
export const WISH_LOAD_FAILED = "연못을 불러오지 못했어요";
export const WISH_POST_FAILED = "지금은 띄우지 못했어요. 쓴 글은 그대로예요.";

export const WISH_CONFIRM = {
  title: "이렇게 띄울까요?",
  edited: "이름과 연락처는 빼고 띄워요",
  notice: "익명으로 7일 동안 모두에게 보여요.",
  post: "띄우기",
  posting: "띄우는 중",
  edit: "고치기",
} as const;

export const WISH_RULES = {
  title: "소원 연꽃 이용 규칙",
  items: [
    "소원은 익명으로 7일 동안 모두에게 보여요. 이름과 연락처는 AI가 고쳐서 띄워요.",
    "누군가를 해치거나 잘못되길 바라는 글, 광고는 올리지 않아요.",
    "AI가 먼저 살펴보고, 고친 글을 띄우기 전에 보여 드려요.",
    "신고한 사람의 소원은 나에게 안 보이고, 규칙을 어긴 글은 내려가요.",
  ],
  more: "이용 규칙 전체 보기",
  agree: "동의하고 쓰기",
  later: "다음에 할게요",
} as const;

export const WISH_REPORT = {
  action: "이 소원 신고하기",
  done: "신고했어요. 이 사람 소원은 이제 안 보여요.",
  undo: "되돌리기",
} as const;

export const WISH_CARE = {
  title: "잠깐 여기서 함께 멈춰볼게요",
  body: "꺼내주셔서 고마워요.\n이 소원은 연못에 띄우지 않을게요.",
  lines: [
    { label: "자살예방 상담전화 · 24시간", number: "109" },
    { label: "정신건강 위기상담 · 24시간", number: "1577-0199" },
    { label: "경찰", number: "112" },
    { label: "응급", number: "119" },
  ],
  call: "전화",
} as const;

export const WISH_MINE = {
  title: "내 소원",
  floating: "현재 떠 있는 소원",
  past: "지나간 소원",
  empty: "아직 띄운 소원이 없어요",
  joinedByOthers: "누군가 같이 빌었어요",
  followUp: "그 소원, 어떻게 됐어요?",
  reported: "신고가 있어 내려왔어요",
  deleteTitle: "이 소원을 지울까요?",
  deleteBody: "연못에서도 사라지고,\n오늘은 다시 띄우지 못해요.",
  keep: "그대로 두기",
  delete: "지우기",
} as const;

export const WISH_OUTCOMES: readonly { id: WishOutcome; label: string }[] = [
  { id: "came_true", label: "이뤄졌어요" },
  { id: "not_yet", label: "아직이에요" },
];

/** 같이 빈 순간의 고마운 말 — 이름을 모르면 이름 없이 말한다 */
export const wishJoinThanks = (author: WishAuthor, nickname: string) =>
  `${author === "baba" ? "바바" : "다른 사람"}의 소원을 같이 빌어줘서 고마워요\n` +
  `${nickname.length > 0 ? `${nickname}님에게도 ` : ""}좋은 일만 있을 거예요`;

export const wishSign = (author: WishAuthor) => (author === "baba" ? WISH_BABA : WISH_ANONYMOUS);

export const wishDaysLeft = (days: number) => `${days}일 남음`;

/** 긴 글은 글자를 줄인다 — 쪽지가 화면을 넘지 않게 */
export const isLongWish = (content: string) => content.length > 40;

/** 쓴 글을 넘길 수 있는가 */
export const canSubmitWish = (text: string) => text.trim().length > 0;

/** 내 소원 화면에서 「내 소원 빌기」를 눌렀다 — 연못으로 돌아가 바로 쓰기를 연다 */
export const wishIntent = { write: false };
