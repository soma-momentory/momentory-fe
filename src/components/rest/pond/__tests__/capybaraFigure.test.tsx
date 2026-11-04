import { render, type RenderResult } from "@testing-library/react-native";

import { CapybaraFigure } from "../CapybaraFigure";

/**
 * 카피바라는 장식이라 **낭독기에 읽히지 않는다** — 그래서 접근성 트리에서 숨겨져
 * 있고, 기본 조회로는 잡히지 않는다(`includeHiddenElements`).
 */
const figure = (r: RenderResult) => r.getByTestId("pond-capybara", { includeHiddenElements: true });

/**
 * 카피바라는 연못 **위에 얹힌 층**이다 — 그림이 정지에서 움직이는 것으로 바뀌어도
 * 두 가지는 그대로여야 한다.
 *
 * 1. **손짓을 가로채지 않는다.** 그 위의 손짓은 아래로 내려간다.
 * 2. **찌그러지지 않는다.** 폭만 받고 높이는 그림의 비율이 정한다. 높이를 밖에서
 *    주면 늘어나고, 늘어난 캐릭터는 「잘못 그렸다」가 아니라 「고장 났다」로 읽힌다.
 */
describe("CapybaraFigure", () => {
  it("손짓을 받지 않는다 — 카피바라를 눌러도 그 탭은 연못으로 내려간다", async () => {
    const r = await render(<CapybaraFigure size={120} />);

    expect(figure(r).props.pointerEvents).toBe("none");
  });

  it("폭만 받고 높이는 그림의 비율이 정한다 — 늘어나거나 찌그러지지 않는다", async () => {
    const r = await render(<CapybaraFigure size={120} />);

    const style = figure(r).props.style as {
      width?: number;
      height?: number;
    }[];
    const box = style.find((s) => s.width != null);

    expect(box?.width).toBe(120);
    // 여백을 잘라 낸 그림이 290 × 384 — 세로가 조금 길다
    expect(box?.height).toBeCloseTo(120 / (290 / 384), 3);
  });
});
