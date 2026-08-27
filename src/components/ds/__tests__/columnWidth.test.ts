import { PixelRatio } from "react-native";

import { columnWidth } from "../columnWidth";

/**
 * 격자가 **폭과 무관하게** 같은 열 수를 지키는지 — 감정 3×3 과 달력 한 주(7)가
 * 좁은 기기에서 다음 줄로 넘어가던 버그의 회귀 테스트다.
 *
 * 핵심 단언은 하나다: **칸 폭의 합 + 간격이 부모를 넘지 않는다.** 넘는 순간
 * `flexWrap` 이 마지막 칸을 다음 줄로 밀어낸다.
 *
 * ⚠ **합을 `Math.fround` 로 잰다.** 여기서 나온 배정밀도 값은 Yoga 로 넘어갈 때
 * 32비트 float 으로 좁혀지고, 그때 위로 반올림되면 딱 맞던 격자가 넘친다 —
 * 13 Pro Max·17 Pro Max 에서만 감정 3×3 이 2열로 접히던 원인이다. double 로 재면
 * 그 버그가 테스트를 그냥 통과한다.
 */
const fits = (total: number, columns: number, gap = 0) => {
  const cell = columnWidth(total, columns, gap);
  if (cell == null) throw new Error("잴 수 있는 폭이어야 한다");
  return Math.fround(cell) * columns + gap * (columns - 1) <= total;
};

describe("columnWidth", () => {
  it("아직 재기 전에는 null — 부르는 쪽이 한 프레임 퍼센트로 그린다", () => {
    expect(columnWidth(0, 7)).toBeNull();
    expect(columnWidth(-1, 7)).toBeNull();
  });

  it("간격이 칸보다 크면 null — 그릴 수 없는 격자를 음수 폭으로 만들지 않는다", () => {
    expect(columnWidth(20, 3, 20)).toBeNull();
  });

  it("달력 7칸이 어떤 폭에서도 한 줄에 들어간다", () => {
    // 소수점이 남는 폭들 — 퍼센트로 나눌 때 마지막 칸이 넘어가던 자리다
    for (const total of [280, 293, 320, 335, 355, 375, 411, 428.5]) {
      expect(fits(total, 7)).toBe(true);
    }
  });

  it("감정 3칸은 **간격을 먼저 뺀 뒤** 나눈다", () => {
    for (const total of [255, 280, 293.3, 320, 335, 375]) {
      expect(fits(total, 3, 12)).toBe(true);
    }
  });

  it("float32 로 좁혀져도 3×3 이 유지된다 — 13 Pro Max·17 Pro Max 회귀", () => {
    // ⚠ **밀도를 3 으로 갈아 끼운다.** jest 의 기본은 2 이고, 이 버그는 3배 밀도에서만
    // 난다 — 기본값으로 두면 이 테스트가 아무것도 재현하지 못하고 그냥 통과한다.
    const scale = jest.spyOn(PixelRatio, "get").mockReturnValue(3);
    try {
      // 실기기의 대화 영역 폭(화면 폭 - 좌우 20). 셋 다 남은 폭이 3의 배수라
      // 내림이 아무것도 깎지 않아 「딱 맞는」 격자가 되던 자리다
      for (const total of [353, 388, 400]) {
        expect(fits(total, 3, 12)).toBe(true);
      }
      // 달력 7칸도 같은 밀도에서 한 줄을 지킨다
      for (const total of [353, 388, 400]) {
        expect(fits(total, 7)).toBe(true);
      }
    } finally {
      scale.mockRestore();
    }
  });

  it("기기 픽셀 격자 아래로 내림한다 — 반올림이 합을 부모 위로 밀지 않게", () => {
    const scale = PixelRatio.get();
    const cell = columnWidth(100, 7);
    expect(cell).not.toBeNull();
    // 픽셀 격자에 정확히 얹혀 있다
    expect((cell as number) * scale).toBe(Math.round((cell as number) * scale));
  });
});
