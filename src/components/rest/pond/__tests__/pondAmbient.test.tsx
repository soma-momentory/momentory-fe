import { fireEvent, render, type RenderResult } from "@testing-library/react-native";

import { PondAmbient } from "../PondAmbient";

/**
 * 움직이는 수면(`pond-ambient.webp`)은 **배경 위에 겹치는 한 층**이다 (2026-09-06).
 *
 * 그림 자체는 여기서 볼 수 없지만, 이 층이 지켜야 하는 약속 셋은 볼 수 있다:
 * 못 그리면 물러난다 · 단계가 바뀌어도 다시 시작하지 않는다 · 손짓을 받지 않는다.
 */
const layer = (r: RenderResult) => r.queryByTestId("pond-ambient", { includeHiddenElements: true });

describe("PondAmbient", () => {
  it("못 그리면 조용히 물러난다 — 아래 정지 배경이 그대로 보인다", async () => {
    const r = await render(<PondAmbient width={360} height={640} />);
    const image = layer(r)!;

    await fireEvent(image, "error", { nativeEvent: { error: "decode failed" } });

    // 이 층이 사라지면 `PondBackdrop`(pond-background.png)이 그대로 보인다 —
    // 연못이 한 프레임도 비지 않는다
    expect(layer(r)).toBeNull();
  });

  it("뷰를 재사용하고 페이드도 없다 — 단계가 바뀌어도 물이 끊기지 않는다", async () => {
    const r = await render(<PondAmbient width={360} height={640} />);

    // 고정 `recyclingKey` 라 새 뷰를 만들지 않고, `transition` 0 이라 껌뻑이지 않는다
    expect(layer(r)!.props.recyclingKey).toBe("pond-ambient");
    expect(layer(r)!.props.transition).toMatchObject({ duration: 0 });
  });

  it("손짓을 받지 않는다 — 그 위의 손짓은 수면의 몫이다", async () => {
    const r = await render(<PondAmbient width={360} height={640} />);

    expect(layer(r)!.props.pointerEvents).toBe("none");
  });

  it("잰 크기를 그대로 채운다 — 배경과 같은 상자에 같은 방식으로 앉는다", async () => {
    const r = await render(<PondAmbient width={360} height={640} />);

    expect(layer(r)!.props.contentFit).toBe("cover");
    expect(layer(r)!.props.style).toMatchObject({ width: 360, height: 640 });
  });
});
