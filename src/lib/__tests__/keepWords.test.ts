import { createElement } from "react";

const { keepWords, keepWordsIn } =
  jest.requireActual<typeof import("@/lib/keepWords")>("@/lib/keepWords");

const J = "⁠";

describe("keepWords", () => {
  it("어절 안 글자 사이에만 결합 문자를 넣는다", () => {
    expect(keepWords("언제 지치고")).toBe(`언${J}제 지${J}치${J}고`);
  });

  it("두 번 걸어도 같다", () => {
    expect(keepWords(keepWords("새 아침을 맞이했군요."))).toBe(keepWords("새 아침을 맞이했군요."));
  });

  it("이모지 조합은 건드리지 않는다 — 국기 · 가족 · 피부색", () => {
    const emojis = ["\u{1F1F0}\u{1F1F7}", "\u{1F468}‍\u{1F469}‍\u{1F467}", "\u{1F44D}\u{1F3FD}"];
    for (const emoji of emojis) {
      expect(keepWords(emoji)).toBe(emoji);
      // 한글과 붙어도 조합 안에는 끼지 않는다 — 한글과의 경계에만 든다
      expect(keepWords(`좋아${emoji}`)).toBe(`좋${J}아${J}${emoji}`);
    }
  });

  it("한글이 없는 어절은 그대로다 — 한글에 붙은 숫자 · 영문만 묶인다", () => {
    expect(keepWords("11.1 ~ 7")).toBe("11.1 ~ 7");
    expect(keepWords("AI가 10번")).toBe(`AI${J}가 10${J}번`);
  });
});

describe("keepWordsIn — Text 의 children", () => {
  it("글자 하나면 그대로 건다", () => {
    expect(keepWordsIn("친구 저녁")).toBe(`친${J}구 저${J}녁`);
  });

  it("붙은 글자 조각은 이어서 건다 — 「3」 · 「개」 사이에서 끊기지 않는다", () => {
    expect(keepWordsIn(["모두 ", 3, "개"])).toEqual([`모${J}두 3${J}개`]);
  });

  it("안에 든 요소는 건드리지 않고, 글자 · 숫자가 아닌 것은 그대로 둔다", () => {
    const link = createElement("span", null, "이용약관");
    const out = keepWordsIn(["로그인하면 ", link, "과"]) as unknown[];
    expect(out[0]).toBe(`로${J}그${J}인${J}하${J}면 `);
    expect((out[1] as { props: { children: string } }).props.children).toBe("이용약관");
    expect(out[2]).toBe("과");
    expect(keepWordsIn(null)).toBeNull();
    expect(keepWordsIn(7)).toBe(7);
  });
});
