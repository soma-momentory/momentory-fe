import { EMOTIONS, emotionName, isEmotionId } from "@/features/emotion/model/emotion";
import { EMOTION_KEYS } from "@/features/retro/model/retro";

/**
 * 감정 9종은 **도메인 정본**이라 값이 조용히 흔들리면 안 된다.
 *
 * 이 표는 서버 enum 두 벌(`EMOTION_KEYS` 소문자 · `SCHEDULE_EMOTIONS` 대문자)과
 * 번호로 맞물려 있다 — 옮겨 적다 한 칸이 어긋나면 그 감정만 조용히 400 이 되거나
 * 화면에서 다른 이름으로 읽힌다. 실제로 이 파일을 만들 때 `막막함`(5)을
 * `무기력`(6)으로 두 번 적는 오타가 났고, 그걸 잡는 것이 이 테스트다.
 */
describe("감정 9종 도메인 정본", () => {
  it("아홉 개이고 번호가 1..9 순서다", () => {
    expect(EMOTIONS).toHaveLength(9);
    expect(EMOTIONS.map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("이름이 스키마 값 그대로다", () => {
    expect(EMOTIONS.map((e) => e.name)).toEqual([
      "불안함",
      "우울함",
      "화남/답답",
      "행복함",
      "막막함",
      "무기력",
      "피곤함",
      "뿌듯함",
      "평온함",
    ]);
  });

  it("이름이 서로 겹치지 않는다 — 겹치면 화면에서 두 감정을 가를 수 없다", () => {
    expect(new Set(EMOTIONS.map((e) => e.name)).size).toBe(EMOTIONS.length);
  });

  it("회고 서버 키 표가 아홉을 빠짐없이 덮는다", () => {
    for (const e of EMOTIONS) expect(EMOTION_KEYS[e.id]).toBeTruthy();
  });
});

describe("emotionName", () => {
  it("id 로 이름을 준다", () => {
    expect(emotionName(1)).toBe("불안함");
    expect(emotionName(9)).toBe("평온함");
  });

  // 감정 미선택은 `null` 이다 — 「없음」 감정 값을 만들지 않는다
  it("미선택이면 빈 문자열 — 화면이 `undefined` 를 그리지 않는다", () => {
    expect(emotionName(null)).toBe("");
    expect(emotionName(undefined)).toBe("");
  });
});

describe("isEmotionId", () => {
  it("9종 안이면 통과", () => {
    expect(isEmotionId(1)).toBe(true);
    expect(isEmotionId(9)).toBe(true);
  });

  it("범위 밖·숫자가 아닌 값은 거른다 — 모르는 감정을 그대로 받지 않는다", () => {
    expect(isEmotionId(0)).toBe(false);
    expect(isEmotionId(10)).toBe(false);
    expect(isEmotionId("1")).toBe(false);
    expect(isEmotionId(null)).toBe(false);
  });
});
