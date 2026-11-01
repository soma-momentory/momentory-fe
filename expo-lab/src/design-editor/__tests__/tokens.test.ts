import { describe, expect, it } from "@jest/globals";

import { label, primary } from "../../../../src/design/ds/color";
import { typeScale } from "../../../../src/design/ds/typography";
import { contrastRatio, isColor, parseColor, sameColor } from "../colorMath";
import { loadTokenModules } from "../tokenModules";
import {
  buildTokenCatalog,
  canonicalTokenKey,
  GROUP_LABELS,
  groupLabel,
  groupOf,
  OTHER_GROUP,
  tokenLabel,
  tokenValueError,
} from "../tokens";

const catalog = buildTokenCatalog(loadTokenModules());
const entry = (key: string) => {
  const found = catalog.byKey.get(key);
  if (!found) throw new Error(`no ${key}`);
  return found;
};

describe("토큰 목록", () => {
  it("평범한 리터럴 잎은 승인값과 함께 편집할 수 있다", () => {
    expect(entry("primary.heavy")).toMatchObject({
      module: "color",
      type: "color",
      approved: primary.heavy,
      editable: true,
    });
    expect(entry("label.normal").approved).toBe(label.normal);
    expect(entry("space.lg")).toMatchObject({ type: "number", approved: 16, editable: true });
    expect(entry("homeV2.color.paper").editable).toBe(true);
    expect(entry("gothicFamily.bold")).toMatchObject({ type: "fontFamily", editable: true });
  });

  it("text.* 크기·행간은 기준 pt 로 편집한다 — 런타임 값은 typeScale 을 곱한 것", () => {
    const size = entry("text.body1.fontSize");
    expect(size).toMatchObject({ editable: true, scaled: true, approved: 16 });
    expect(Math.round(16 * typeScale)).toBe(
      (loadTokenModules().typography as { text: { body1: { fontSize: number } } }).text.body1
        .fontSize,
    );
  });

  it("최상위 원시값 · 함수 · 배열 · 계산된 잎은 이유와 함께 읽기 전용이다", () => {
    for (const [key, reason] of [
      ["scheduleDot", /모듈 최상위/],
      ["selectedTint", /모듈 최상위/],
      ["withAlpha", /함수/],
      ["emotionTint", /함수/],
      ["bodyReleaseFinish.motes", /배열/],
      ["fill.normal", /계산된 값/],
      ["chatChoiceSelected.label", /primary\.heavy/],
      ["size.button.radius", /radius\.medium/],
      ["text.buttonLabel.fontSize", /BUTTON_BOOST/],
      ["text.body1.fontFamily", /계산된 값/],
      ["hairline.normal.borderWidth", /hairlineWidth/],
    ] as const) {
      expect(entry(key)).toMatchObject({ editable: false });
      expect(entry(key).reason).toMatch(reason);
    }
  });

  it("묶음 export(color · metrics · typography)는 같은 잎을 두 번 세지 않는다", () => {
    expect(catalog.byKey.has("color.primary.heavy")).toBe(false);
    expect(catalog.entries.filter((item) => item.key === "primary.heavy")).toHaveLength(1);
    expect(canonicalTokenKey("color.primary.heavy", catalog)).toBe("primary.heavy");
    expect(canonicalTokenKey("typography.title2.fontSize", catalog)).toBe("text.title2.fontSize");
    expect(canonicalTokenKey("metrics.space.lg", catalog)).toBe("space.lg");
  });

  it("값 검사 — 색은 hex/rgba, 숫자는 유한, 서체는 로드된 것만", () => {
    const fonts = catalog.fonts;
    expect(tokenValueError(entry("primary.heavy"), "rgba(1,2,3,0.5)", fonts)).toBeNull();
    expect(tokenValueError(entry("primary.heavy"), "#12345", fonts)).not.toBeNull();
    expect(tokenValueError(entry("primary.heavy"), "red", fonts)).not.toBeNull();
    expect(tokenValueError(entry("space.lg"), Number.NaN, fonts)).not.toBeNull();
    expect(tokenValueError(entry("space.lg"), "16", fonts)).not.toBeNull();
    expect(tokenValueError(entry("text.body1.fontSize"), 0, fonts)).not.toBeNull();
    expect(tokenValueError(entry("gothicFamily.bold"), "Comic Sans", fonts)).not.toBeNull();
    expect(tokenValueError(entry("gothicFamily.bold"), "Pretendard-Regular", fonts)).toBeNull();
    expect(tokenValueError(entry("fill.normal"), "rgb(255,255,255)", fonts)).toMatch(/계산된 값/);
  });

  it("한국어 이름표", () => {
    expect(tokenLabel(entry("label.normal"))).toBe("글자색 · 기본");
    expect(tokenLabel(entry("text.body1.fontSize"))).toBe("글자 스타일 · body1 · 글씨 크기");
    expect(tokenLabel(entry("homeV2.color.paper"))).toBe("홈 전용 · 색 · 종이");
  });

  it("모든 묶음에 한국어 이름이 있다 — export 이름이 패널에 새지 않는다", () => {
    const missing = [...new Set(catalog.entries.map((item) => item.group))].filter(
      (group) =>
        !(group in GROUP_LABELS) &&
        catalog.entries.some((item) => item.group === group && item.editable),
    );
    expect(missing).toEqual([]);
    expect(groupOf({ group: "새로운묶음" })).toBe(OTHER_GROUP);
    expect(groupLabel(OTHER_GROUP)).toBe("기타");
  });

  it("편집 가능 · 읽기 전용 수를 고정해 둔다(토큰이 늘면 숫자만 고친다)", () => {
    const editable = catalog.entries.filter((item) => item.editable).length;
    const readOnly = catalog.entries.length - editable;
    expect(editable).toBeGreaterThan(400);
    expect(readOnly).toBeGreaterThan(100);
  });
});

describe("색 셈", () => {
  it("hex · rgb() · rgba() 를 읽고 브라우저 계산값과 맞춘다", () => {
    expect(parseColor(`#${"abc"}`)).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseColor("rgba(140,122,102,0.10)")).toEqual({ r: 140, g: 122, b: 102, a: 0.1 });
    expect(isColor("rgb(300,0,0)")).toBe(false);
    expect(sameColor(primary.heavy, "rgb(86, 117, 95)")).toBe(true);
  });

  it("contrast.test.ts 와 같은 값 — 주 CTA 흰 글자 5.03", () => {
    expect(contrastRatio(label.onFill, primary.heavy)!).toBeCloseTo(5.03, 1);
  });
});
