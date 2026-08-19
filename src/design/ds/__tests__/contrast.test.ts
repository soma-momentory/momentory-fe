import { background, emotion, interaction, label, primary, status, withAlpha } from "@/design/ds";
import { EMOTIONS } from "@/features/emotion/model/emotion";

/**
 * 대비 검수를 **테스트로 고정한다.**
 *
 * `design-reference/design.md` §1 의 값 여섯이 WCAG 2.1 AA 에 미달이라 보정했다
 * (`src/design/ds/color.ts` 머리말의 표). 주석만 남기면 다음 사람이 "시안과 다르네"
 * 하고 되돌린다 — 되돌리면 여기가 깨진다.
 *
 * 기준: 본문 4.5 · 큰 글자(18.66px+ bold) 3.0 · 비텍스트 UI 3.0.
 */

const luminance = (hex: string) => {
  const v = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};

/** 두 **불투명** 색의 대비비 */
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** α 합성 — 반투명 면 위의 글자를 재려면 먼저 배경과 섞어야 한다 */
const flatten = (hex: string, alpha: number, bg: string) => {
  const parse = (h: string) => {
    const v = h.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  const f = parse(hex);
  const b = parse(bg);
  const mix = f.map((c, i) => Math.round((c ?? 0) * alpha + (b[i] ?? 0) * (1 - alpha)));
  return `#${mix.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

/** 화면에 실제로 깔리는 세 면. **가장 어두운 면에서도** 통과해야 한다 */
const SURFACES = [background.normal, background.alternative, background.elevated];
const worstOn = (fg: string) => Math.min(...SURFACES.map((bg) => contrast(fg, bg)));

describe("본문 글자 — 세 배경 전부에서 4.5", () => {
  it.each([
    ["label.strong", label.strong],
    ["label.normal", label.normal],
    ["label.neutral", label.neutral],
    ["label.alternative", label.alternative],
    ["primary.heavy", primary.heavy],
    ["status.negative", status.negative],
    ["status.cautionary", status.cautionary],
    ["interaction.inactive", interaction.inactive],
  ])("%s", (_name, hex) => {
    expect(worstOn(hex)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("비텍스트 UI — 3.0", () => {
  it("primary.normal — 선택 링·아이콘이 배경에서 보인다", () => {
    expect(worstOn(primary.normal)).toBeGreaterThanOrEqual(3);
  });

  it("status.positive — 완료 체크 아이콘", () => {
    expect(worstOn(status.positive)).toBeGreaterThanOrEqual(3);
  });
});

describe("색 면 위 흰 글자", () => {
  it("주 CTA 는 primary.heavy 다 — design.md 의 primary.normal(2.9)로 되돌리면 깨진다", () => {
    expect(contrast(label.onFill, primary.heavy)).toBeGreaterThanOrEqual(4.5);
    // 시안 값이 왜 못 쓰이는지 함께 고정한다
    expect(contrast(label.onFill, "#7C9E86")).toBeLessThan(3);
  });

  it("삭제 버튼 면 — status.negative 한 값이 글자와 면 둘 다 통과한다", () => {
    expect(contrast(label.onFill, status.negative)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("감정 9색", () => {
  it("색이 아홉 개 다 있다 — 도메인과 칸이 맞는다", () => {
    for (const e of EMOTIONS) expect(emotion[e.id]).toMatch(/^#[0-9A-F]{6}$/i);
  });

  // 도트·캡슐은 55% 틴트 면이다(design.md §1). 그 위 글자가 본문 기준을 넘어야 한다
  it.each(EMOTIONS.map((e) => [e.name, e.id] as const))(
    "%s — 55%% 틴트 위 label.normal 이 4.5 를 넘는다",
    (_name, id) => {
      const tint = flatten(emotion[id], 0.55, background.elevated);
      expect(contrast(label.normal, tint)).toBeGreaterThanOrEqual(4.5);
    },
  );

  /**
   * 원색 도트·링은 배경 대비 1.46~3.31 로 일곱이 3:1 에 못 미친다 — **의도한 예외**다.
   * 감정을 색만으로 판단하게 하지 않고 **이름을 늘 함께 쓴다**(`RULES.md` 「보관함」).
   * 이 테스트는 그 예외가 여전히 예외임을 드러내 둔다 — 규칙이 사라지면 근거도 사라진다.
   */
  it("원색 도트는 3:1 을 못 넘는다 — 그래서 이름 없는 감정 도트를 만들지 않는다", () => {
    const below = EMOTIONS.filter((e) => worstOn(emotion[e.id]) < 3);
    expect(below.length).toBeGreaterThan(0);
  });
});

describe("withAlpha", () => {
  it("hex 를 rgba 로 옮긴다 — 화면이 문자열을 잇지 않게", () => {
    expect(withAlpha("#7C9E86", 0.18)).toBe("rgba(124,158,134,0.18)");
  });
});
