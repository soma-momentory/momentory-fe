/**
 * 걱정상자 — 쉼 콘텐츠 두 번째 (2026-10-05).
 *
 * 지금 가장 마음에 걸리는 걱정 하나를 한 줄로 적으면, 종이 카드가 되어 카피바라에게
 * 건네지고 상자에 들어간다. 그 뒤 「잠시 맡겨둘게요」(상자가 곁에 놓이고 카피바라가
 * 옆에 앉는다) 또는 「흘려보낼게요」(카피바라가 상자를 이고 멀어진다)를 고른다.
 *
 * ## 아무것도 남기지 않는다
 *
 * 쓴 걱정은 **이 화면의 상태에만** 있다 — 저장하지 않고 서버로도 계측으로도 보내지
 * 않는다. 걱정은 민감한 말이고, 이 콘텐츠는 「내려놓는」 경험이지 기록이 아니다.
 * 평가나 AI 분석도 하지 않는다.
 *
 * 문안은 제품 규칙이라 여기 둔다 — 크기·시간·자리는 `ds/worryBox.ts`.
 */

/** 화면이 밟는 단계 — 쓰기 → 건네기(연출) → 상자에 들어감 → 둘 중 하나의 끝 */
export type WorryBoxStage = "write" | "handing" | "boxed" | "keep" | "release";

/** 고를 수 있는 끝 */
export type WorryBoxChoice = "keep" | "release";

/** 100자까지 — 40자로는 걱정 하나를 다 적기에 짧았다(2026-10-05 · 사용자 요청) */
export const WORRY_MAX_LENGTH = 100;

/** 공백만 적었으면 맡길 걱정이 없다 — 「상자에 맡기기」가 켜지지 않는다 */
export const canHandOver = (worry: string) => worry.trim().length > 0;

export const WORRY_BOX_INTRO = {
  title: "걱정상자",
  description: "무거운 걱정을 카피바라에게 잠시 맡겨보세요",
} as const;

/**
 * 무엇이 일어날지 알려 주는 두 줄 — **매번** 보인다(2026-10-01 기본안 · 「처음 한 번만」은
 * 기기에 기록을 남겨야 하는데 앱에 영속 저장소가 아직 없다).
 *
 * 처음에는 「걱정 쓰기 → 카피바라가 받기 → 상자에 넣기 → 내려놓기」였는데, 화살표로 나열한
 * 절차가 사용 설명서처럼 읽혔다(2026-10-05 · 사용자 피드백). 같은 흐름을 말을 건네는
 * 문장으로 쓴다.
 */
export const WORRY_BOX_GUIDE = "걱정을 적어 건네주세요\n카피바라가 상자에 고이 담아줄 거예요";

export const WORRY_BOX_INPUT = {
  label: "지금 가장 마음에 걸리는 걱정",
  placeholder: "내일 발표가 잘 안될까 봐 걱정돼요",
  cta: "상자에 맡기기",
} as const;

/** 상자에 들어간 뒤 — 위에 서는 한마디와 둘 중 하나를 고르게 하는 물음 */
export const WORRY_BOX_BOXED = {
  title: "걱정을 상자에 고이 담았어요",
  description: "이 걱정을 어떻게 할까요?",
} as const;

export const WORRY_BOX_CHOICES: readonly {
  id: WorryBoxChoice;
  title: string;
  description: string;
}[] = [
  { id: "keep", title: "잠시 맡겨둘게요", description: "카피바라가 곁에서 지켜줄 거예요" },
  { id: "release", title: "흘려보낼게요", description: "카피바라가 저 멀리 데려가 줄 거예요" },
];

/** 고른 끝마다 위에 서는 한마디 */
export const WORRY_BOX_ENDINGS: Record<WorryBoxChoice, { title: string; description: string }> = {
  keep: { title: "제가 잠시 맡아둘게요", description: "지금은 마음 놓고 쉬어도 괜찮아요" },
  // 걷는 동안의 말 — 끝나면 `WORRY_BOX_RELEASE_DONE` 으로 바뀐다(2026-10-05 · 사용자 피드백)
  release: { title: "걱정이 멀어지고 있어요", description: "" },
};

/** 「흘려보낼게요」 — 카피바라가 길 끝으로 사라진 뒤 위에 서는 말 */
export const WORRY_BOX_RELEASE_DONE = {
  title: "이제 걱정에서 잠시 멀어졌어요",
  description: "",
} as const;

/**
 * 「흘려보낼게요」 — 카피바라가 길 끝으로 사라진 **뒤** 장면 가운데에 내려앉는 **쪽지**의
 * 한마디(카피바라가 남기고 간 답장). 카피바라가 사라지면 화면이 텅 비었다(2026-10-05 · 사용자 피드백) — 그 빈자리에 건넨다.
 */
export const WORRY_BOX_RELEASED = "방금 했던 고민은\n이제 잊어도 괜찮아요";

/** 그 쪽지의 서명 — 카피바라가 남기고 간 답장이다 */
export const WORRY_BOX_RELEASED_SIGN = "-카피바라-";

export const WORRY_BOX_DONE_CTA = "쉼터로 돌아가기";
