/**
 * 감정 9종 — **도메인 정본**.
 *
 * id 와 이름은 스키마(`docs/spec/momentory.schema.mvp.json`)와 서버 enum 이 쥔
 * 값이지 디자인이 정하는 값이 아니다. 그런데 오랫동안 `src/design/theme.ts` 가
 * `EmotionId` 를 함께 내보내 왔고, 그 결과 **`features/**` 와 `src/mocks/` 가
 * 디자인 파일을 import** 하고 있었다 — 팔레트를 갈아끼우는 순간 도메인 타입이
 * 같이 무너지는 자리다. 그래서 정체(id·이름)만 여기로 옮긴다.
 *
 * **여기에 색을 두지 않는다.** 색은 디자인의 몫이고 디자인 세대마다 바뀐다
 * (`src/design/`). 화면은 id 로 색을 조회하고, 이 파일은 그 조회의 키만 준다.
 *
 * ⚠ **번호는 서버 enum 두 벌과 맞물려 있다.** 1 불안함 … 9 평온함 순서를
 * `features/retro/model/retro.ts` 의 `EMOTION_KEYS`(소문자 `angry`)와
 * `features/home/data/scheduleApi.ts` 의 `SCHEDULE_EMOTIONS`(대문자
 * `ANGRY_FRUSTRATED`)가 각자의 코드로 옮긴다 — **번호를 바꾸면 그 두 표를 함께
 * 고쳐야 한다.** 두 표는 서버에서 이름이 갈리므로 하나로 합치지 않는다.
 */
export const EMOTIONS = [
  { id: 1, name: "불안함" },
  { id: 2, name: "우울함" },
  { id: 3, name: "화남·답답함" },
  { id: 4, name: "행복함" },
  { id: 5, name: "막막함" },
  { id: 6, name: "무기력" },
  { id: 7, name: "피곤함" },
  { id: 8, name: "뿌듯함" },
  { id: 9, name: "평온함" },
] as const;

export type Emotion = (typeof EMOTIONS)[number];
export type EmotionId = Emotion["id"];

/**
 * **긍정 → 부정** 순. 보관함 리스트뷰(`A2`)의 감정 필터가 이 순서로 칩을 세운다 —
 * 골라 좁혀 찾는 자리라 「좋았던 날」부터 훑는 게 자연스럽다. 회고의 감정 선택(`C3`)은
 * 스펙 순서(`EMOTIONS`, id 1~9)를 그대로 쓰므로 **여기와 무관하게** 둔다.
 *
 * id·이름의 정본은 `EMOTIONS` 하나다 — 여기서는 **순서만** 다시 잡는다(값을 베끼지
 * 않는다). 새 감정이 `EMOTIONS` 에 늘면 이 배열의 순서에도 넣어야 한다.
 */
const SENTIMENT_ORDER: readonly EmotionId[] = [4, 8, 9, 7, 5, 6, 1, 2, 3];
export const EMOTIONS_BY_SENTIMENT: readonly Emotion[] = SENTIMENT_ORDER.map((id) =>
  EMOTIONS.find((e) => e.id === id),
).filter((e): e is Emotion => e != null);

/**
 * id → 이름. 못 찾으면 **빈 문자열**이다 — 화면이 이름 자리에 `undefined` 를
 * 그리거나 옵셔널 체이닝을 매번 되풀이하지 않게 한다.
 */
export function emotionName(id: EmotionId | null | undefined): string {
  if (id == null) return "";
  return EMOTIONS.find((e) => e.id === id)?.name ?? "";
}

/**
 * 서버·저장값이 9종 안에 있는지. **모르는 값은 감정으로 받지 않는다** —
 * 새 감정이 서버에 생기면 화면이 조용히 빈 칸을 그리는 대신 걸러진다.
 */
export function isEmotionId(value: unknown): value is EmotionId {
  return typeof value === "number" && EMOTIONS.some((e) => e.id === value);
}
