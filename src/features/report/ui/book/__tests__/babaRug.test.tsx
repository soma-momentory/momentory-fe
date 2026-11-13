import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import {
  BabaOnRug,
  babaOnRugGap,
  BabaSticker,
  babaStickerFit,
  babaStickerGap,
  PebbleSticker,
} from "../parts";

import { reportBook } from "@/design/ds";

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

describe("말풍선과 바바 사이", () => {
  it.each([96, 112])(
    "표지 바바(폭 %d)는 귀 끝이 말풍선 아래 끝에서 띄움만큼 떨어진다",
    async (width) => {
      const { getByTestId } = await render(<BabaSticker width={width} />);
      const art = boxOf(getByTestId("book-baba-sticker-art", hidden).props.style);
      // 그림 상자 위쪽 투명 여백(픽셀 4/436)을 지나 귀가 시작한다
      const earTop = babaStickerGap(width) + art.top + ((10 + 4) * art.width) / 456;
      expect(earTop).toBeCloseTo(reportBook.size.bubbleGap, 0);
    },
  );

  it.each([120, 130])("속지 바바(폭 %d)도 말풍선과 겹치지 않는다", (width) => {
    // 끌어올리는 만큼은 그림 위쪽의 투명 여백뿐이다
    expect(babaOnRugGap(width)).toBeGreaterThan(-width * 0.2);
  });

  it("남는 높이에 맞춘 폭이면 띄움과 바바가 그 높이에 꼭 들어간다", async () => {
    const room = 140;
    const width = babaStickerFit(room);
    const { getByTestId } = await render(<BabaSticker width={width} />);
    const holder = boxOf(getByTestId("book-baba-sticker", hidden).props.style);
    expect(babaStickerGap(width) + holder.height).toBeCloseTo(room, 5);
  });
});

/**
 * 표지의 감정 스티커 — 조약돌 그림 열두 장에서 흰 테두리를 둘러 구운 것이다
 * (`scripts/make-report-stickers.py`). 감정마다 자기 스티커가 있다.
 */
describe("감정 스티커", () => {
  const uri = (json: unknown) => JSON.stringify(json).match(/"testUri":"[^"]+"/)?.[0];

  it("12종 모두 자기 스티커가 있다 — 빈 스티커도, 같은 그림도 없다", async () => {
    const empty = uri((await render(<PebbleSticker id={null} size={48} />)).toJSON());
    expect(empty).toContain("no-emotion");
    const seen = new Set<string | undefined>();
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const) {
      const got = uri((await render(<PebbleSticker id={id} size={48} />)).toJSON());
      expect(got).toBeDefined();
      expect(got).not.toBe(empty);
      seen.add(got);
    }
    expect(seen.size).toBe(12);
  });
});
