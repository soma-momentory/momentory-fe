import { CATALOG, LAYER_ORDER } from "../model/catalog.generated";
import { figureLayers } from "../model/figure";
import { NO_OUTFIT } from "../model/types";
import { attendanceCells, rewardMessage } from "../model/wardrobe";

const part = (name: string) => {
  const layer = LAYER_ORDER[LAYER_ORDER.findIndex((l) => "when" in l && l.when === name)];
  return layer != null && "source" in layer ? layer.source : undefined;
};
const art = (id: string) => CATALOG.find((a) => a.id === id)!;

describe("figureLayers", () => {
  it("입은 것이 없으면 기본 바바 부품만 그린다", () => {
    const layers = figureLayers(NO_OUTFIT);
    expect(layers).toContain(part("lowerBody"));
    expect(layers).toContain(part("baseEyes"));
    expect(layers).not.toContain(part("headTop"));
  });

  it("귀를 덮는 모자는 귀 대신 정수리를 그리고, 표정은 기본 눈을 끈다", () => {
    const layers = figureLayers({ hat: "hat-sheep-towel", eyes: "eyes-face-smile", clothes: null });
    expect(layers).toContain(part("headTop"));
    expect(layers).not.toContain(part("ears"));
    expect(layers).not.toContain(part("baseEyes"));
    // 얼굴 칸은 모자 위에 그린다
    expect(layers.indexOf(art("eyes-face-smile").layer)).toBeGreaterThan(
      layers.indexOf(art("hat-sheep-towel").layer),
    );
  });

  it("옷은 목 아래 몸을 대신하고, 앱이 모르는 id 는 입지 않은 것으로 본다", () => {
    const layers = figureLayers({ hat: "hat-unknown", eyes: null, clothes: "clothes-yukata" });
    expect(layers).toContain(art("clothes-yukata").layer);
    expect(layers).not.toContain(part("lowerBody"));
    expect(layers).toHaveLength(figureLayers({ ...NO_OUTFIT, clothes: "clothes-yukata" }).length);
  });

  it("모자와 옷에 같은 cowboy 가 있어도 칸-아이디로 갈린다", () => {
    expect(art("hat-cowboy").slot).toBe("hat");
    expect(art("clothes-cowboy").slot).toBe("clothes");
    expect(CATALOG).toHaveLength(53);
  });
});

describe("attendanceCells", () => {
  it("오늘 칸 앞은 지난 칸, 뒤는 받을 귤이다", () => {
    const cells = attendanceCells(3, [10, 10, 20, 20, 30, 40, 50]);
    expect(cells.map((c) => c.state)).toEqual([
      "past",
      "past",
      "today",
      "next",
      "next",
      "next",
      "next",
    ]);
    expect(cells[6]).toEqual({ day: 7, amount: 50, state: "next" });
  });
});

it("받은 귤은 사유가 하나면 이유를 말하고, 여럿이면 합쳐서 말한다", () => {
  expect(rewardMessage([])).toBeNull();
  expect(rewardMessage([{ reason: "DIARY", amount: 30 }])).toBe("일기를 써서 귤 30개를 받았어요");
  expect(
    rewardMessage([
      { reason: "DIARY", amount: 30 },
      { reason: "REST", amount: 10 },
    ]),
  ).toBe("귤 40개를 받았어요");
});

it("카탈로그가 manifest 와 같다", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { execFileSync } = require("node:child_process");
  expect(() =>
    execFileSync(process.execPath, ["scripts/gen-wardrobe.mjs", "--check"], { stdio: "pipe" }),
  ).not.toThrow();
});
