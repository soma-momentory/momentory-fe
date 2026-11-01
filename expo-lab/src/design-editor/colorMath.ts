/**
 * 색 문자열 다루기 — 검사 · RGBA 해석 · WCAG 대비. 셈은 `src/design/ds/__tests__/contrast.test.ts` 와 같다
 * (그 테스트가 정본 게이트이고, 여기는 편집 중에 미리 보여 주는 읽기 값이다).
 */

export type Rgba = { r: number; g: number; b: number; a: number };

const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_RE =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+|1\.0+)\s*)?\)$/;

export function parseColor(value: unknown): Rgba | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (HEX_RE.test(text)) {
    let v = text.slice(1);
    if (v.length <= 4)
      v = v
        .split("")
        .map((c) => c + c)
        .join("");
    const n = (i: number) => parseInt(v.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: v.length === 8 ? n(6) / 255 : 1 };
  }
  const m = RGB_RE.exec(text);
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number) as [number, number, number];
  if (r > 255 || g > 255 || b > 255) return null;
  return { r, g, b, a: m[4] === undefined ? 1 : Number(m[4]) };
}

export const isColor = (value: unknown): value is string => parseColor(value) !== null;

/** 브라우저 `getComputedStyle` 의 `rgb(…)` · `rgba(…)` 도 같은 해석기로 읽는다 */
export const sameColor = (a: unknown, b: unknown) => {
  const x = parseColor(a);
  const y = parseColor(b);
  if (!x || !y) return false;
  return x.r === y.r && x.g === y.g && x.b === y.b && Math.abs(x.a - y.a) < 0.01;
};

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, "0").toUpperCase();
/** `<input type="color">` 가 받는 #RRGGBB. 투명도는 버린다 */
export const toHex6 = (c: Rgba) => `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;

/** α 합성 — 반투명 색을 불투명 바탕 위에 섞는다 */
export function flatten(fg: Rgba, bg: Rgba): Rgba {
  const mix = (f: number, b: number) => Math.round(f * fg.a + b * (1 - fg.a));
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 };
}

const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (c: Rgba) =>
  0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);

/** 두 색의 대비비. 반투명이면 바탕(`base`, 없으면 흰색) 위에 먼저 섞는다 */
export function contrastRatio(fg: string, bg: string, base?: string): number | null {
  const f = parseColor(fg);
  const b0 = parseColor(bg);
  if (!f || !b0) return null;
  const ground = parseColor(base ?? "") ?? { r: 255, g: 255, b: 255, a: 1 };
  const b = b0.a < 1 ? flatten(b0, ground) : b0;
  const solid = f.a < 1 ? flatten(f, b) : f;
  const [hi, lo] = [luminance(solid), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
