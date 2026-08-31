/**
 * 감정 10종 — **도메인 정본** (채팅흐름_v2).
 *
 * v2 에서 옛 `화남·답답함`을 `화남`(9)·`답답함`(10)으로 분리했고, **번호를 긍정 → 부정 순으로**
 * 다시 매겼다(1 행복 … 10 답답함). id·이름은 서버 enum 과 맞물리지만 **저장·전송은 문자열 키**로
 * 하므로(EMOTION_KEYS) 번호는 프론트 로컬 규약이다.
 *
 * **여기에 색을 두지 않는다.** 색은 디자인의 몫이고 세대마다 바뀐다(`src/design/`). 화면은 id 로
 * 색을 조회하고, 이 파일은 그 조회의 키만 준다.
 *
 * ⚠ **번호는 서버 enum 두 벌과 맞물려 있다.** `features/retro/model/retro.ts` 의 `EMOTION_KEYS`
 * (소문자 `angry`·`frustrated`)와 `features/home/data/scheduleApi.ts` 의 `SCHEDULE_EMOTIONS`
 * (대문자)가 이 번호를 각자의 코드로 옮긴다 — **번호를 바꾸면 그 두 표를 함께 고쳐야 한다.**
 */
export const EMOTIONS = [
  { id: 1, name: "행복함" },
  { id: 2, name: "뿌듯함" },
  { id: 3, name: "평온함" },
  { id: 4, name: "피곤함" },
  { id: 5, name: "막막함" },
  { id: 6, name: "무기력" },
  { id: 7, name: "불안함" },
  { id: 8, name: "우울함" },
  { id: 9, name: "화남" },
  { id: 10, name: "답답함" },
] as const;

export type Emotion = (typeof EMOTIONS)[number];
export type EmotionId = Emotion["id"];

/**
 * **긍정 → 부정** 순. 보관함 리스트뷰(`A2`)의 감정 필터가 이 순서로 칩을 세운다. v2 에서 `EMOTIONS`
 * 자체가 이미 긍정→부정 순이라, 이 배열은 그 순서를 그대로 쓴다(별도 재정렬 없음).
 */
export const EMOTIONS_BY_SENTIMENT: readonly Emotion[] = EMOTIONS;

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
