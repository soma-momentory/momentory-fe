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
 * 이유 한 줄은 **어떻게 골랐는지를 그대로** 말한다 — 시트 맨 위의 작은 한 줄이라 짧게 쓴다.
 * 무작위로 고른 날은 근거를 지어내지 않는다(「바바가 하나 골라 봤어요」).
 * 조사는 고정이다 — 감정 이름 열은 모두 받침으로 끝나고(「을 · 과」), 쉬는 방법 이름은 모두
 * 「기」로 끝난다(「를 · 와」). 이름을 늘리면 테스트가 이 전제를 지킨다.
 */
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";

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

/**
 * 온보딩 「쉬는 방법」(서버 `restMethods[].code`) → 닮은 쉼과 이유 줄에 쓰는 이름.
 * 음식 · 영화 · 독서 · 카페 · 게임 · 「그때마다 달라요」 · 기타는 닮은 쉼이 없어 빠진다.
 */
export const REST_BY_METHOD: Readonly<
  Record<string, { name: string; contents: readonly RestContentId[] }>
> = {
  MEDITATION: { name: "명상하기", contents: ["sensePond"] },
  IDLE_REST: { name: "멍하니 쉬기", contents: ["sensePond"] },
  LISTENING_TO_MUSIC: { name: "음악 듣기", contents: ["sensePond"] },
  WALKING: { name: "산책하기", contents: ["sensePond"] },
  EXERCISE: { name: "운동하기", contents: ["bodyRelease"] },
  SLEEP: { name: "잠자기", contents: ["bodyRelease"] },
  TALKING_WITH_CLOSE_PEOPLE: { name: "가까운 사람과 대화하기", contents: ["worryBox"] },
  WRITING: { name: "글쓰기", contents: ["worryBox", "treasureBox"] },
};

/** 무엇으로 골랐나 — 계측이 「감정으로 고른 추천이 더 잘 눌리는가」를 가른다 */
export type RestRecommendBasis = "emotion" | "preference" | "random";

export type RestRecommendation = {
  content: RestContentId;
  basis: RestRecommendBasis;
  reason: string;
};

/** 날마다 다르고 하루 안에서는 같은 0 이상 1 미만의 수 — `recommendRest` 의 무작위 자리에 넣는다 */
export const dayRandom = (day: string) => (): number => {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) % DAY_HASH_MOD;
  return h / DAY_HASH_MOD;
};
const DAY_HASH_MOD = 9973;

const pickOne = <T>(items: readonly T[], random: () => number): T =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;

export function recommendRest(
  emotions: readonly EmotionId[],
  restMethods: readonly string[],
  random: () => number = Math.random,
): RestRecommendation {
  const liked = restMethods.flatMap((code) => REST_BY_METHOD[code] ?? []);
  const likedFor = (content: RestContentId) => liked.find((m) => m.contents.includes(content));

  const first = emotions[0];
  if (first != null) {
    const feeling = emotionName(first);
    const candidates = REST_BY_EMOTION[first];
    for (const content of candidates) {
      const method = likedFor(content);
      if (method != null) {
        return {
          content,
          basis: "preference",
          reason: `「${feeling}」과 평소 즐기는 「${method.name}」를 보고 골랐어요`,
        };
      }
    }
    return {
      content: candidates[0]!,
      basis: "emotion",
      reason: `오늘 일기의 「${feeling}」을 보고 골랐어요`,
    };
  }

  const near = [...new Set(liked.flatMap((m) => m.contents))];
  if (near.length > 0) {
    const content = pickOne(near, random);
    return {
      content,
      basis: "preference",
      reason: `평소 즐기는 「${likedFor(content)!.name}」와 닮은 쉼이에요`,
    };
  }

  return {
    content: pickOne(
      REST_CONTENTS.map((c) => c.id),
      random,
    ),
    basis: "random",
    reason: "바바가 하나 골라 봤어요",
  };
}
