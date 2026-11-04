import { EMOTIONS } from "@/features/emotion/model/emotion";

import { settledMemory } from "../data/recommendMemory";
import { REST_CONTENTS } from "../model/contents";
import { dayRandom, recommendRest, REST_BY_EMOTION } from "../model/recommend";

/**
 * 쉼 추천 — 감정이 먼저, 쉬는 방법은 후보 안에서 순서만, 둘 다 없으면 그날의 무작위.
 * 표 자체(어느 감정에 어느 쉼)는 사용자와 정한 값이라 여기서 하나하나 고정하지 않고,
 * **고르는 규칙**과 **표가 지켜야 할 전제**만 본다.
 */
describe("쉼 추천 고르기", () => {
  it("감정 열 개 모두 후보가 있고, 후보는 화면이 있는 쉼뿐이다", () => {
    const routed = REST_CONTENTS.filter((c) => c.route != null).map((c) => c.id);
    for (const { id } of EMOTIONS) {
      expect(REST_BY_EMOTION[id].length).toBeGreaterThan(0);
      for (const content of REST_BY_EMOTION[id]) expect(routed).toContain(content);
    }
  });

  it("첫 감정의 맨 앞 후보를 고르고, 제목과 조약돌로 그 감정을 말한다", () => {
    // 불안함(7) 다음 우울함(8) — 첫 감정만 본다
    expect(recommendRest([7, 8], [])).toEqual({
      content: "bodyRelease",
      basis: "emotion",
      emotion: 7,
      title: "불안한 날엔, 이걸 해 봐요",
    });
  });

  it("쉬는 방법은 그 감정의 후보 안에서만 순서를 바꾼다", () => {
    // 불안함의 후보에는 감각연못이 있다 — 명상하기를 즐기면 그쪽이다
    expect(recommendRest([7], ["MEDITATION"])).toEqual({
      content: "sensePond",
      basis: "preference",
      emotion: 7,
      title: "불안한 날엔, 이걸 해 봐요",
    });
    // 피곤함의 후보는 몸에 힘 빼기 하나 — 명상하기를 즐겨도 감정이 이긴다
    expect(recommendRest([4], ["MEDITATION"]).content).toBe("bodyRelease");
    // 닮은 쉼이 없는 쉬는 방법(게임)은 아무것도 바꾸지 않는다
    expect(recommendRest([7], ["GAMING"]).basis).toBe("emotion");
  });

  it("감정이 없으면 쉬는 방법과 닮은 쉼을, 그것도 없으면 무작위로 — 근거를 지어내지 않는다", () => {
    expect(recommendRest([], ["EXERCISE"])).toEqual({
      content: "bodyRelease",
      basis: "preference",
      emotion: null,
      title: "오늘은 이걸 해 봐요",
    });

    const picked = new Set(
      [0, 0.2, 0.4, 0.6, 0.99].map((r) => recommendRest([], [], () => r).content),
    );
    // 소원 연꽃은 권하지 않는다
    expect(picked).toEqual(new Set(REST_CONTENTS.map((c) => c.id).filter((id) => id !== "wish")));
    expect(recommendRest([], [], () => 0)).toMatchObject({
      basis: "random",
      emotion: null,
      title: "오늘은 이걸 해 봐요",
    });
  });

  it("감정 열 개 모두 제목이 있다 — 「~ 날엔, 이걸 해 봐요」", () => {
    for (const { id } of EMOTIONS) {
      expect(recommendRest([id], []).title).toMatch(/^\S+( \S+)? 날엔, 이걸 해 봐요$/);
    }
  });

  it("무작위는 그날로 정해진다 — 하루 안에서는 같고, 0 이상 1 미만이다", () => {
    const a = dayRandom("2026-10-12");
    expect(a()).toBe(dayRandom("2026-10-12")());
    for (const day of ["2026-10-12", "2026-10-13", "2026-12-31"]) {
      const v = dayRandom(day)();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("쉼 추천의 기억", () => {
  const before = { day: "2026-10-11", dismissStreak: 2 };

  it("닫으면 하나 더, 해 보면 0, 건너뛰면(위기 안내) 그대로 — 셋 다 오늘을 매듭짓는다", () => {
    expect(settledMemory(before, "2026-10-12", "dismissed")).toEqual({
      day: "2026-10-12",
      dismissStreak: 3,
    });
    expect(settledMemory(before, "2026-10-12", "accepted")).toEqual({
      day: "2026-10-12",
      dismissStreak: 0,
    });
    expect(settledMemory(before, "2026-10-12", "skipped")).toEqual({
      day: "2026-10-12",
      dismissStreak: 2,
    });
  });

  it("AsyncStorage 가 없는 옛 빌드에서도 던지지 않는다 — 못 읽으면 띄우지 않는 쪽으로 닫힌다", async () => {
    let memory: typeof import("../data/recommendMemory") | undefined;
    jest.isolateModules(() => {
      jest.doMock("@react-native-async-storage/async-storage", () => {
        throw new Error("[@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.");
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      memory = require("../data/recommendMemory");
    });

    await expect(memory!.readRecommendationMemory()).resolves.toBeNull();
    await expect(memory!.settleRecommendation("2026-10-12", "skipped")).resolves.toBeUndefined();
    await expect(memory!.clearRecommendationMemory()).resolves.toBeUndefined();
  });
});
