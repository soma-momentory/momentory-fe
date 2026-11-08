import { Children, type ReactNode } from "react";

/**
 * 한글이 **어절 단위로만** 줄바꿈되게 한다 — 어절 안의 글자 사이에 단어 결합 문자(U+2060)를 넣는다.
 * iOS · Android 둘 다 기본은 한글을 음절마다 끊어서 「맞이했군요.」가 두 줄로 갈렸다(2026-10-27 사용자 요청).
 * 줄보다 긴 어절은 그래도 글자에서 끊긴다(엔진이 넘치는 단어를 강제로 자른다).
 *
 * **두 번 걸어도 결과가 같다** — 공용 `Text` 가 모든 글자에 걸고(2026-11-08), 몇몇 화면은 전부터
 * 직접 걸었다. 이미 든 결합 문자는 걷어 내고 다시 넣는다.
 *
 * **한글이 낀 자리에만 넣는다** — 코드 포인트마다 넣으면 국기 · 가족 · 피부색 이모지 조합 사이에
 * 끼어 이모지가 깨진다. 이모지 조합에는 한글이 없으니 그대로 남고, 한글에 붙은 숫자 · 영문 ·
 * 문장부호(「10번」 · 「AI가」 · 「요.」)는 함께 묶인다. 조합형 자모(U+1100~)는 음절을 이루므로 뺀다.
 */
const WORD_JOINER = "⁠";
/** 완성형 음절 · 호환 자모(ㅋㅋ) */
const HANGUL = /[가-힣ㄱ-ㆎ]/;
const joinWord = (word: string): string => {
  const chars = [...word.replaceAll(WORD_JOINER, "")];
  return chars
    .map((ch, i) =>
      i > 0 && (HANGUL.test(chars[i - 1] ?? "") || HANGUL.test(ch)) ? WORD_JOINER + ch : ch,
    )
    .join("");
};
export const keepWords = (text: string): string =>
  text
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : joinWord(part)))
    .join("");

/**
 * `Text` 의 children 에 `keepWords` 를 건다. 붙어 있는 글자 조각(`{n}개` → "3" · "개")은 하나로 이어서 건다 —
 * 조각 사이에서 끊기지 않게. 안에 든 `Text`(링크 등)는 그것이 제 children 에 건다.
 */
export function keepWordsIn(children: ReactNode): ReactNode {
  if (typeof children === "string") return keepWords(children);
  if (!Array.isArray(children)) return children;
  const out: ReactNode[] = [];
  for (const child of Children.toArray(children)) {
    const last = out.at(-1);
    if (typeof child === "string" || typeof child === "number") {
      if (typeof last === "string") out[out.length - 1] = last + String(child);
      else out.push(String(child));
    } else out.push(child);
  }
  return out.map((child) => (typeof child === "string" ? keepWords(child) : child));
}
