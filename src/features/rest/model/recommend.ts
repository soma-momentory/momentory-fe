/**
 * 일기를 쓴 날 쉼터에 들어오면 권하는 **쉼 하나** (2026-10-12 · 사용자와 정함).
 *
 * 고르는 순서는 셋이다.
 *
 * 1. 오늘 일기의 **첫 감정**으로 후보 줄(`REST_BY_EMOTION`)을 고른다. 첫 감정은 감정 탐색에서 고른
 *    감정이 먼저 오고, 없으면 대화에서 뽑힌 순서다 — 서버도 첫 감정을 대표 감정으로 쓴다.
 * 2. 그 후보 안에서 온보딩 「쉬는 방법」(`REST_BY_METHOD`)과 닮은 쉼이 있으면 그것을, 없으면 맨 앞을
 *    고른다. **감정이 먼저다** — 쉬는 방법은 후보 안에서 순서만 바꾼다.
 * 3. 감정이 없으면 쉬는 방법과 닮은 쉼 가운데 하나를, 그것도 없으면 넷 가운데 하나를 무작위로 고른다.
 *    대화에서 감정을 못 뽑은 날(추출 실패 · 옛 서버)에도 시트가 빈손으로 뜨지 않게. 무작위는
 *    **그날로 정해진다**(`dayRandom`) — 하루 안에서는 같고 날마다 달라, 화면을 다시 그려도 바뀌지 않는다.
 *
 * 시트 제목은 **감정만** 말한다(2026-11-02) — 「막막한 날엔, 이걸 해 봐요」. 왜 그 쉼인지까지 적던
 * 긴 이유 줄은 3초 안에 읽히지 않아 뺐고, 감정이 없는 날은 근거를 지어내지 않는다(「오늘은」).
 * 쉬는 방법을 본 추천인지는 계측(`basis`)에만 남는다.
 */
import type { EmotionId } from "@/features/emotion/model/emotion";

import { REST_CONTENTS, type RestContentId } from "./contents";

/** 감정별 후보 — 앞일수록 먼저다 */
export const REST_BY_EMOTION: Record<EmotionId, readonly RestContentId[]> = {
  1: ["treasureBox"], // 행복함
  2: ["treasureBox", "bodyRelease"], // 뿌듯함
  3: ["treasureBox", "bodyRelease"], // 평온함
  4: ["bodyRelease"], // 피곤함
  5: ["worryBox"], // 막막함
  // 무기력 — 걱정상자는 걱정을 글로 적어야 해서 기운 없는 날엔 문턱이 높다. 보고 듣기만 하면 되는 쪽
  6: ["sensePond"],
  7: ["bodyRelease", "worryBox", "sensePond"], // 불안함
  // 우울함 — 「좋았던 일 찾기」는 우울한 날 오히려 부담이 될 수 있어 앞에 두지 않는다
  8: ["sensePond", "treasureBox"],
  // 화남 — 주먹을 꼭 쥐었다 푸는 동작이 화난 몸과 그대로 맞는다
  9: ["bodyRelease", "sensePond"],
  10: ["bodyRelease", "worryBox"], // 답답함
};

/** 시트 제목에 들어가는 감정의 꾸밈말 — 「막막한 날엔」 */
const DAY_OF: Record<EmotionId, string> = {
  1: "행복한",
  2: "뿌듯한",
  3: "평온한",
  4: "피곤한",
  5: "막막한",
  6: "기운 없는",
  7: "불안한",
  8: "우울한",
  9: "화난",
  10: "답답한",
};

/**
 * 온보딩 「쉬는 방법」(서버 `restMethods[].code`) → 닮은 쉼.
 * 음식 · 영화 · 독서 · 카페 · 게임 · 「그때마다 달라요」 · 기타는 닮은 쉼이 없어 빠진다.
 */
export const REST_BY_METHOD: Readonly<Record<string, readonly RestContentId[]>> = {
  MEDITATION: ["sensePond"],
  IDLE_REST: ["sensePond"],
  LISTENING_TO_MUSIC: ["sensePond"],
  WALKING: ["sensePond"],
  EXERCISE: ["bodyRelease"],
  SLEEP: ["bodyRelease"],
  TALKING_WITH_CLOSE_PEOPLE: ["worryBox"],
  WRITING: ["worryBox", "treasureBox"],
};

/** 무엇으로 골랐나 — 계측이 「감정으로 고른 추천이 더 잘 눌리는가」를 가른다 */
export type RestRecommendBasis = "emotion" | "preference" | "random";

export type RestRecommendation = {
  content: RestContentId;
  basis: RestRecommendBasis;
  /** 오늘 일기의 첫 감정 — 시트의 조약돌. 없으면 시트가 쉼터 칸만 세운다 */
  emotion: EmotionId | null;
  title: string;
};

/** 날마다 다르고 하루 안에서는 같은 0 이상 1 미만의 수 — `recommendRest` 의 무작위 자리에 넣는다 */
export const dayRandom = (day: string) => (): number => {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) % DAY_HASH_MOD;
  return h / DAY_HASH_MOD;
};
const DAY_HASH_MOD = 9973;

const NO_EMOTION_TITLE = "오늘은 이걸 해 봐요";

const pickOne = <T>(items: readonly T[], random: () => number): T =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;

export function recommendRest(
  emotions: readonly EmotionId[],
  restMethods: readonly string[],
  random: () => number = Math.random,
): RestRecommendation {
  const liked = [...new Set(restMethods.flatMap((code) => REST_BY_METHOD[code] ?? []))];

  const first = emotions[0];
  if (first != null) {
    const candidates = REST_BY_EMOTION[first];
    const near = candidates.find((content) => liked.includes(content));
    return {
      content: near ?? candidates[0]!,
      basis: near != null ? "preference" : "emotion",
      emotion: first,
      title: `${DAY_OF[first]} 날엔, 이걸 해 봐요`,
    };
  }

  if (liked.length > 0) {
    return {
      content: pickOne(liked, random),
      basis: "preference",
      emotion: null,
      title: NO_EMOTION_TITLE,
    };
  }

  return {
    content: pickOne(
      // 소원 빌기는 권하지 않는다 — 쉼을 권하는 자리에 남의 글을 올리지 않는다
      REST_CONTENTS.filter((c) => c.id !== "wish").map((c) => c.id),
      random,
    ),
    basis: "random",
    emotion: null,
    title: NO_EMOTION_TITLE,
  };
}
