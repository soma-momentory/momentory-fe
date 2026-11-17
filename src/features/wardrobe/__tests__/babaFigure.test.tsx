import { act, render } from "@testing-library/react-native";

import { CATALOG } from "../model/catalog.generated";
import { NO_OUTFIT } from "../model/types";
import { BabaFigure } from "../ui/BabaFigure";

const yukata = CATALOG.find((a) => a.id === "clothes-yukata")!.layer;
type R = Awaited<ReturnType<typeof render>>;
const layers = (r: R) => r.getAllByTestId("baba-layer", { includeHiddenElements: true });
/** expo-image 는 출처를 배열로 바꿔 넘긴다 — 글자로 맞춰 비교한다 */
const key = (source: unknown) => JSON.stringify([source].flat());
const visible = (r: R) =>
  layers(r)
    .filter((img) => !JSON.stringify(img.props.style).includes('"opacity":0'))
    .map((img) => key(img.props.source));
const layerOf = (r: R, source: number) =>
  layers(r).find((l) => key(l.props.source) === key(source))!;

it("새 옷 그림이 읽힐 때까지 앞 모습(목 아래 몸)을 그대로 보인다", async () => {
  const r = await render(<BabaFigure width={120} />);
  const before = visible(r);
  await act(async () =>
    r.rerender(<BabaFigure width={120} outfit={{ ...NO_OUTFIT, clothes: "clothes-yukata" }} />),
  );
  expect(visible(r)).toEqual(before);

  await act(async () => layerOf(r, yukata).props.onLoad({ nativeEvent: {} }));
  expect(visible(r)).toContain(key(yukata));
  expect(visible(r).length).toBeLessThan(before.length);
});

it("더할 그림 없이 벗기만 하면(귀를 남기는 모자) 기다리지 않고 바로 바꾼다", async () => {
  const beanie = CATALOG.find((a) => a.id === "hat-purple-beanie")!.layer;
  const r = await render(
    <BabaFigure width={120} outfit={{ ...NO_OUTFIT, hat: "hat-purple-beanie" }} />,
  );
  await act(async () => r.rerender(<BabaFigure width={120} />));
  expect(visible(r)).not.toContain(key(beanie));
});

it("옷이 읽히는 사이에 모자를 또 바꿔도 두 그림이 읽히면 새 모습으로 바뀐다", async () => {
  const bucket = CATALOG.find((a) => a.id === "hat-bucket")!.layer;
  const r = await render(<BabaFigure width={120} />);
  await act(async () =>
    r.rerender(<BabaFigure width={120} outfit={{ ...NO_OUTFIT, clothes: "clothes-yukata" }} />),
  );
  await act(async () =>
    r.rerender(
      <BabaFigure
        width={120}
        outfit={{ hat: "hat-bucket", eyes: null, clothes: "clothes-yukata" }}
      />,
    ),
  );
  for (const source of [yukata, bucket]) {
    await act(async () => layerOf(r, source).props.onLoad({ nativeEvent: {} }));
  }
  expect(visible(r)).toEqual(expect.arrayContaining([key(yukata), key(bucket)]));
});
