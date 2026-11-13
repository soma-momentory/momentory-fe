import { EMOTIONS, emotionName, isEmotionId } from "@/features/emotion/model/emotion";
import { EMOTION_KEYS, emotionIdOfKey, emotionKeyOf } from "@/features/retro/model/retro";

/**
 * 감정 12종은 **도메인 정본**이라 값이 조용히 흔들리면 안 된다 (대표 감정 12종 · 긍정→부정 번호).
 *
 * 이 표는 서버 enum 두 벌(`EMOTION_KEYS` 소문자 · `SCHEDULE_EMOTIONS` 대문자)과 번호로 맞물려
 * 있다 — 옮겨 적다 한 칸이 어긋나면 그 감정만 조용히 400 이 되거나 화면에서 다른 이름으로 읽힌다.
 */
describe("감정 12종 도메인 정본", () => {
  it("열두 개이고 번호가 1..12 순서다", () => {
    expect(EMOTIONS).toHaveLength(12);
    expect(EMOTIONS.map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("이름이 긍정→부정 순서 그대로다 — 대표 감정 12종", () => {
    expect(EMOTIONS.map((e) => e.name)).toEqual([
      "기쁨",
      "평온",
      "뿌듯함",
      "애정",
      "슬픔",
      "불안",
      "분노",
      "실망",
      "부끄러움",
      "혼란",
      "미안함",
      "지침",
    ]);
  });

  it("이름이 서로 겹치지 않는다 — 겹치면 화면에서 두 감정을 가를 수 없다", () => {
    expect(new Set(EMOTIONS.map((e) => e.name)).size).toBe(EMOTIONS.length);
  });

  it("회고 서버 키 표가 열둘을 빠짐없이 덮는다", () => {
    for (const e of EMOTIONS) expect(EMOTION_KEYS[e.id]).toBeTruthy();
  });

  it("서버 키가 번호 순서 그대로다 — 한 칸이 어긋나면 그 감정만 다른 이름으로 읽힌다", () => {
    expect(EMOTIONS.map((e) => emotionKeyOf(e.id))).toEqual([
      "joy",
      "calm",
      "proud",
      "affection",
      "sad",
      "anxious",
      "angry",
      "disappointed",
      "ashamed",
      "confused",
      "sorry",
      "exhausted",
    ]);
    for (const e of EMOTIONS) expect(emotionIdOfKey(emotionKeyOf(e.id))).toBe(e.id);
  });

  it("옛 10종 키는 읽을 때만 받아 12종으로 옮긴다 — 보낼 때는 새 키만 쓴다", () => {
    expect(emotionIdOfKey("happy")).toBe(1); // 행복함 → 기쁨
    expect(emotionIdOfKey("depressed")).toBe(5); // 우울함 → 슬픔
    expect(emotionIdOfKey("frustrated")).toBe(7); // 답답함 → 분노
    expect(emotionIdOfKey("stuck")).toBe(10); // 막막함 → 혼란
    expect(emotionIdOfKey("lethargic")).toBe(12); // 무기력 → 지침
    expect(emotionIdOfKey("tired")).toBe(12); // 피곤함 → 지침
    expect(emotionIdOfKey("jealous")).toBeNull();
    // 옛 키가 보내는 표에 섞이지 않는다
    const sent: string[] = Object.values(EMOTION_KEYS);
    for (const old of ["happy", "depressed", "frustrated", "stuck", "lethargic", "tired"])
      expect(sent).not.toContain(old);
  });
});

describe("emotionName", () => {
  it("id 로 이름을 준다", () => {
    expect(emotionName(1)).toBe("기쁨");
    expect(emotionName(12)).toBe("지침");
  });

  // 감정 미선택은 `null` 이다 — 「없음」 감정 값을 만들지 않는다
  it("미선택이면 빈 문자열 — 화면이 `undefined` 를 그리지 않는다", () => {
    expect(emotionName(null)).toBe("");
    expect(emotionName(undefined)).toBe("");
  });
});

describe("isEmotionId", () => {
  it("12종 안이면 통과", () => {
    expect(isEmotionId(1)).toBe(true);
    expect(isEmotionId(12)).toBe(true);
  });

  it("범위 밖·숫자가 아닌 값은 거른다 — 모르는 감정을 그대로 받지 않는다", () => {
    expect(isEmotionId(0)).toBe(false);
    expect(isEmotionId(13)).toBe(false);
    expect(isEmotionId("1")).toBe(false);
    expect(isEmotionId(null)).toBe(false);
  });
});
