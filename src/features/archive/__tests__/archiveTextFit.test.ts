import { readFileSync } from "fs";
import { join } from "path";

import { archiveType } from "@/design/ds";
import { EMOTIONS } from "@/features/emotion/model/emotion";

/**
 * 보관함 글자가 자리에 들어가는지 **실제 글꼴 폭**으로 잰다.
 * 교보손글씨의 글자별 폭은 고르지 않아 추정값으로는 줄바꿈을 미리 알 수 없다.
 * 보관함은 390 비례 캔버스 안에 있어서(`TabScreen`) iPhone SE 도 같은 폭으로 놓인다.
 */
const font = readFileSync(join(__dirname, "../../../../assets/fonts/KyoboHandwriting2025lyb.ttf"));

const table = (tag: string) => {
  const count = font.readUInt16BE(4);
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    if (font.toString("latin1", at, at + 4) === tag) return font.readUInt32BE(at + 8);
  }
  throw new Error(`no ${tag}`);
};

const head = table("head");
const hhea = table("hhea");
const unitsPerEm = font.readUInt16BE(head + 18);
const longLoca = font.readInt16BE(head + 50) === 1;
const metricCount = font.readUInt16BE(hhea + 34);
const hmtx = table("hmtx");

/** cmap 형식 12 또는 4 에서 글자 번호를 찾는다 */
const glyphOf = (code: number) => {
  const cmap = table("cmap");
  const subtables = font.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i += 1) {
    const sub = cmap + font.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = font.readUInt16BE(sub);
    if (format === 12) {
      const groups = font.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g += 1) {
        const at = sub + 16 + g * 12;
        const start = font.readUInt32BE(at);
        if (code >= start && code <= font.readUInt32BE(at + 4)) {
          return font.readUInt32BE(at + 8) + code - start;
        }
      }
    }
    if (format === 4) {
      const segments = font.readUInt16BE(sub + 6) / 2;
      for (let s = 0; s < segments; s += 1) {
        const end = font.readUInt16BE(sub + 14 + s * 2);
        if (code > end) continue;
        const start = font.readUInt16BE(sub + 16 + segments * 2 + s * 2);
        if (code < start) break;
        const delta = font.readUInt16BE(sub + 16 + segments * 4 + s * 2);
        const rangeAt = sub + 16 + segments * 6 + s * 2;
        const range = font.readUInt16BE(rangeAt);
        if (range === 0) return (code + delta) & 0xffff;
        return (font.readUInt16BE(rangeAt + range + (code - start) * 2) + delta) & 0xffff;
      }
    }
  }
  throw new Error(`no glyph ${code}`);
};

const widthOf = (value: string, fontSize: number) =>
  ([...value].reduce((sum, ch) => {
    const glyph = Math.min(glyphOf(ch.codePointAt(0) ?? 0), metricCount - 1);
    return sum + font.readUInt16BE(hmtx + glyph * 4);
  }, 0) *
    fontSize) /
  unitsPerEm;

/** 숫자 글리프의 윗끝 · 아랫끝(글꼴 단위) */
const digitBounds = () => {
  const loca = table("loca");
  const glyf = table("glyf");
  let top = -Infinity;
  let bottom = Infinity;
  for (const digit of "0123456789") {
    const glyph = glyphOf(digit.charCodeAt(0));
    const at =
      glyf +
      (longLoca ? font.readUInt32BE(loca + glyph * 4) : font.readUInt16BE(loca + glyph * 2) * 2);
    bottom = Math.min(bottom, font.readInt16BE(at + 4));
    top = Math.max(top, font.readInt16BE(at + 8));
  }
  return { top, bottom };
};

/** 7칸 달력의 한 칸 — 캔버스 390 · 좌우 20 · 달력 종이 안쪽 10 · 3배 기기 한 픽셀 여유 */
const CELL = (Math.floor(((390 - 40 - 20) / 7) * 3) - 1) / 3;
/** 기록 카드 머리 폭 — 달력의 종이(350 의 72% · 안쪽 12) · 목록의 카드(안쪽 16 · `›` 16 + 간격 8) */
const DAY_PAPER = 350 * 0.72 - 24;
const LIST_HEAD = 350 - 32 - 24;
/**
 * 달력 카드 머리 폭 두 가지 — 지금의 비례 캔버스(360 기기도 390 으로 놓인다)와,
 * 캔버스 없이 360 폭에 그대로 놓였을 때(320 의 72% · 안쪽 12)
 */
const DAY_PAPER_WIDTHS = [DAY_PAPER, 320 * 0.72 - 24];
/** 조약돌 12 + 간격 4 */
const tagWidth = (name: string, scale: number) =>
  16 + widthOf(name, archiveType.emotionName.fontSize * scale);
/** 글꼴에서 폭이 가장 넓은 감정 이름의 칸 폭 */
const widestTag = (scale: number) =>
  Math.max(...EMOTIONS.map((emotion) => tagWidth(emotion.name, scale)));
const twoTags = (scale: number) => widestTag(scale) * 2 + 8;
/** 1년의 모든 날 중 폭이 가장 넓은 제목 — 숫자마다 폭이 달라 재서 고른다 */
const widestTitle = (fontSize: number) =>
  Math.max(
    ...Array.from({ length: 12 }, (_, m) =>
      Math.max(
        ...Array.from({ length: 31 }, (_, d) => widthOf(`${m + 1}월 ${d + 1}일의 일기`, fontSize)),
      ),
    ),
  );

const SCALES = [1, 1.3, 1.5];

describe("달력 숫자", () => {
  it.each(SCALES)("글씨 %s 배에서 두 자리 숫자가 고른 날 알약과 칸 안에 든다", (scale) => {
    const digits = widthOf("30", archiveType.date.fontSize * scale);
    const pill = Math.min(CELL, Math.round(30 * scale));
    expect(digits).toBeLessThan(pill - 4);
    expect(pill).toBeLessThanOrEqual(CELL);
  });

  it.each(SCALES)("글씨 %s 배에서 숫자의 획이 날짜 줄 안에 있어 점을 누르지 않는다", (scale) => {
    const { fontSize, lineHeight } = archiveType.date;
    const ascent = font.readInt16BE(hhea + 4);
    const descent = font.readInt16BE(hhea + 6);
    const px = (fontSize * scale) / unitsPerEm;
    const row = Math.ceil(lineHeight * scale);
    const baseline = (lineHeight * scale - (ascent - descent) * px) / 2 + ascent * px;
    const { top, bottom } = digitBounds();

    expect(baseline - top * px).toBeGreaterThanOrEqual(0);
    expect(baseline - bottom * px).toBeLessThanOrEqual(row);

    // 고른 날 알약(날짜 줄 위 2 × 배율 ~ 줄 끝)의 가운데와 숫자의 가운데가 크게 어긋나지 않는다
    const inkCenter = baseline - ((top + bottom) / 2) * px;
    const pillCenter = (Math.round(2 * scale) + row) / 2;
    expect(Math.abs(inkCenter - pillCenter)).toBeLessThanOrEqual(2);
  });

  it("요일은 칸 안에 들고 날짜보다 작다", () => {
    expect(widthOf("월", archiveType.weekday.fontSize * 1.5)).toBeLessThan(CELL);
    expect(archiveType.weekday.fontSize).toBeLessThan(archiveType.date.fontSize);
  });
});

describe("기록 카드 머리", () => {
  describe.each(DAY_PAPER_WIDTHS)("달력 카드 폭 %s", (width) => {
    it.each(SCALES)("글씨 %s 배에서 가장 긴 제목이 말줄임 없이 한 줄에 든다", (scale) => {
      expect(widestTitle(archiveType.diaryTitle.fontSize * scale)).toBeLessThanOrEqual(width);
    });

    it.each(SCALES)("글씨 %s 배에서 감정 이름 하나는 낱말 가운데서 접히지 않는다", (scale) => {
      expect(widestTag(scale)).toBeLessThanOrEqual(width);
    });
  });

  it.each([1, 1.05])("글씨 %s 배 목록 카드는 제목과 감정 둘이 한 줄에 든다", (scale) => {
    const title = widestTitle(archiveType.diaryTitle.fontSize * scale);
    expect(title + 8 + twoTags(scale)).toBeLessThanOrEqual(LIST_HEAD);
  });

  it.each([1.3, 1.5])("글씨 %s 배 목록 카드의 내려앉은 제목이 한 줄에 든다", (scale) => {
    expect(widestTitle(archiveType.diaryTitle.fontSize * scale)).toBeLessThanOrEqual(LIST_HEAD);
  });
});

describe("줄 하나에 서는 글자", () => {
  it.each(SCALES)("글씨 %s 배에서 하단 「이번 달 기록」이 한 줄에 든다", (scale) => {
    const size = archiveType.dock.fontSize * scale;
    // 안쪽 330 = 제목 + 간격 10 + 조약돌 셋과 셈 + 간격 10 + 스위처 70
    const used =
      widthOf("이번 달 기록", size) + 10 + (13 + 4) * 3 + widthOf("31일", size) + 10 + 70;
    expect(used).toBeLessThanOrEqual(330);
  });

  it.each(SCALES)("글씨 %s 배에서 「기록 N건」과 기간이 한 줄에 든다", (scale) => {
    const size = archiveType.listMeta.fontSize * scale;
    const used = widthOf("기록 100건", size) + widthOf("2026년 12월", size) + 4 + 16;
    expect(used).toBeLessThanOrEqual(350);
  });

  it("칩 글자는 글씨 1.5 배에도 높이 36 안에 든다", () => {
    expect(archiveType.chip.lineHeight * 1.5).toBeLessThanOrEqual(36);
  });
});
