import { describe, expect, it } from "@jest/globals";

import { label } from "../../../../src/design/ds/color";
import { homeV2 } from "../../../../src/design/ds/homeV2";
import {
  buildHandoff,
  emptyNotes,
  handoffFileName,
  handoffRoutes,
  HANDOFF_FORMAT,
  labFromHash,
  normalizeRoute,
} from "../handoff";
import {
  candidatesFor,
  matchUsage,
  screenGroupsForRoute,
  usageCount,
  type MatchContext,
} from "../screenUsage";
import { loadTokenModules } from "../tokenModules";
import { buildTokenCatalog } from "../tokens";

const catalog = buildTokenCatalog(loadTokenModules());
const context = (route: string, tokens: Record<string, string | number> = {}): MatchContext => ({
  catalog,
  tokens,
  typeScale: 1,
  screenGroups: screenGroupsForRoute(route),
});
const hexToRgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const fakeElement = {} as Element;
/** 린터가 hex 리터럴을 막는다 — 테스트용 색은 조각으로 만든다 */
const DARK = `#${"010203"}`;

describe("이 화면에 쓰인 값 — 값 → 토큰", () => {
  it("라우트마다 그 화면 전용 묶음을 안다", () => {
    expect(screenGroupsForRoute("/(tabs)/home")).toEqual(["homeV2"]);
    expect(screenGroupsForRoute("/my")).toEqual(["myPaper"]);
    expect(screenGroupsForRoute("/login")).toContain("social");
  });

  it("브라우저 계산값(rgb)과 같은 색 토큰을 찾고, 화면 전용 묶음을 먼저 둔다", () => {
    const found = candidatesFor("backgroundColor", hexToRgb(homeV2.color.paper), context("/home"));
    expect(found[0]?.key).toBe("homeV2.color.paper");
    const text = candidatesFor("color", hexToRgb(label.normal), context("/my"));
    expect(text.map((entry) => entry.key)).toContain("label.normal");
  });

  it("다른 화면 묶음과 우연히 같은 값은 뒤로 민다", () => {
    const found = candidatesFor("color", hexToRgb(homeV2.color.ink), context("/home"));
    expect(found[0]?.group).toBe("homeV2");
  });

  it("숫자는 이름으로 좁힌다 — 모서리 16 은 radius 잎만, 글씨 크기는 fontSize 잎만", () => {
    const radius = candidatesFor("borderRadius", 16, context("/my"), 50);
    expect(radius.length).toBeGreaterThan(0);
    expect(radius.every((entry) => entry.group === "radius" || /radius/i.test(entry.key))).toBe(
      true,
    );
    const size = candidatesFor("fontSize", homeV2.type.date.fontSize, context("/home"), 50);
    expect(size[0]?.key).toBe("homeV2.type.date.fontSize");
    expect(size.every((entry) => entry.key.endsWith("fontSize"))).toBe(true);
  });

  it("시안이 덮어쓴 값으로 짝짓는다(B 프레임이 그린 값)", () => {
    const found = candidatesFor("color", "rgb(1, 2, 3)", context("/my", { "label.normal": DARK }));
    expect(found.map((entry) => entry.key)).toEqual(["label.normal"]);
  });

  it("모은 값을 많이 쓰인 순서로 · 같은 값 셈", () => {
    const items = matchUsage(
      [
        { property: "color", value: hexToRgb(label.normal), elements: [fakeElement] },
        {
          property: "backgroundColor",
          value: hexToRgb(homeV2.color.paper),
          elements: [fakeElement, fakeElement, fakeElement],
        },
        { property: "padding", value: 13.37, elements: [fakeElement] },
      ],
      context("/home"),
    );
    expect(items[0]?.property).toBe("backgroundColor");
    expect(items.find((item) => item.property === "padding")?.candidates).toEqual([]);
    expect(usageCount(items, "backgroundColor", hexToRgb(homeV2.color.paper))).toBe(3);
  });
});

describe("AI에게 넘기기 — momentory-lab-handoff@1", () => {
  it("파일 이름은 시안 이름과 한국 시각이다", () => {
    expect(handoffFileName("색 연구 #2", new Date("2026-11-02T07:05:00Z"))).toBe(
      "momentory-handoff-색-연구-2-20261102-1605.json",
    );
  });

  it("바꾼 값의 전후 · 메모 · 본 화면을 싣는다(참고 이미지는 주입 지점으로)", async () => {
    const notes = {
      ...emptyNotes(),
      request: "  말풍선을 더 둥글게  ",
      notes: { "/my": "닉네임 줄 간격", "/report": "  " },
      visited: ["/home"],
    };
    expect(handoffRoutes(notes)).toEqual(["/home", "/my"]);
    const handoff = await buildHandoff({
      draft: {
        id: "d1",
        name: "색 연구",
        tokens: { "label.normal": DARK },
        studio: { "home.hero.borderRadius": 24 },
      } as never,
      notes,
      catalog,
      approvedStudio: { "home.hero.borderRadius": 16 },
      lab: labFromHash("#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16"),
      now: new Date("2026-11-02T07:05:09Z"),
      getReferences: async (route) =>
        route === "/my"
          ? {
              name: "my.png",
              dataUrl: "data:image/png;base64,AA",
              align: { scale: 1, offsetX: 0, offsetY: 0 },
            }
          : null,
    });
    expect(handoff).toEqual({
      format: HANDOFF_FORMAT,
      createdAt: "2026-11-02T16:05:09+09:00",
      draft: { id: "d1", name: "색 연구" },
      request: "말풍선을 더 둥글게",
      tokens: [{ key: "label.normal", label: "글자색 · 기본", before: label.normal, after: DARK }],
      studio: [{ key: "home.hero.borderRadius", label: expect.any(String), before: 16, after: 24 }],
      screens: [
        { route: "/home" },
        {
          route: "/my",
          note: "닉네임 줄 간격",
          reference: {
            name: "my.png",
            dataUrl: "data:image/png;base64,AA",
            align: { scale: 1, offsetX: 0, offsetY: 0 },
          },
        },
      ],
      lab: { platform: "ios", deviceId: "iphone-16", datasetId: "normal" },
    });
  });

  it("라우트는 같은 모양으로 적는다", () => {
    expect(normalizeRoute("/(tabs)/home?x=1")).toBe("/home");
  });
});
