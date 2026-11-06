import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { BabaOnRug, BabaSticker } from "../parts";

type Box = { left: number; top: number; width: number; height: number };

/** 바바는 장식이라 낭독기에서 숨는다 — 숨은 것까지 찾는다 */
const hidden = { includeHiddenElements: true };

const boxOf = (style: unknown) => StyleSheet.flatten(style) as unknown as Box;

/**
 * 리포트의 바바는 러그 위에 앉는다(`DESIGN.md` 「리포트」 2026-11-06) — 러그 가운데가 바바 상자 가운데와 맞고,
 * 발끝이 러그 앞쪽에 얹히며, 러그가 바바 상자 밖으로 새지 않는다.
 */
describe("바바와 러그", () => {
  it.each([96, 112])("표지 스티커 바바(폭 %d)는 러그 가운데에 발을 얹는다", async (width) => {
    const { getByTestId } = await render(<BabaSticker width={width} />);
    const holder = boxOf(getByTestId("book-baba-sticker", hidden).props.style);
    const rug = boxOf(getByTestId("book-baba-rug", hidden).props.style);

    expect(rug.left + rug.width / 2).toBeCloseTo(width / 2, 0);
    expect(rug.top + rug.height).toBeCloseTo(holder.height, 5);
    // 스티커 그림의 아래 끝(발 + 흰 테두리)이 러그 앞쪽 절반 안에 든다 — 발이 러그 밖으로 삐져나오지 않는다
    const art = boxOf(getByTestId("book-baba-sticker-art", hidden).props.style);
    const artBottom = art.top + art.height;
    expect(artBottom).toBeGreaterThan(rug.top + rug.height / 2);
    expect(artBottom).toBeLessThan(rug.top + rug.height);
  });

  it.each([84, 120, 130])("속지 바바(폭 %d)도 같은 결로 앉는다", async (width) => {
    const { getByTestId } = await render(<BabaOnRug width={width} />);
    const holder = boxOf(getByTestId("book-baba-on-rug", hidden).props.style);
    const rug = boxOf(getByTestId("book-baba-rug", hidden).props.style);

    expect(rug.left + rug.width / 2).toBeCloseTo(width / 2, 0);
    expect(rug.top + rug.height).toBeCloseTo(holder.height, 5);
    expect(rug.width / rug.height).toBeCloseTo(200 / 66, 5);
  });
});
