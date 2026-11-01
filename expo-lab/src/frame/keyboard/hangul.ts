/**
 * 두벌식 낱자 조합 — 그려진 키보드의 키를 누르면 입력칸에 **한글로** 들어가게 한다(Lab 전용 · 근사).
 *
 * 상태를 들지 않는다: 커서 앞 한 글자와 새 낱자만 보고 합친다(`ㄱ`+`ㅏ`→`가`, `가`+`ㄴ`→`간`,
 * `간`+`ㅏ`→`가나`, `ㄹ`받침+`ㄱ`→`ㄺ`, `ㅗ`+`ㅏ`→`ㅘ`). 실제 IME 의 조합 중 표시(밑줄)와
 * 낱자 단위 지우기는 흉내 내지 않는다 — 지우기는 글자 하나를 지운다.
 */
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
/** 0 번은 받침 없음 */
const JONG = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];

const VOWEL_PAIRS: Record<string, string> = {
  ㅗㅏ: "ㅘ",
  ㅗㅐ: "ㅙ",
  ㅗㅣ: "ㅚ",
  ㅜㅓ: "ㅝ",
  ㅜㅔ: "ㅞ",
  ㅜㅣ: "ㅟ",
  ㅡㅣ: "ㅢ",
};
const FINAL_PAIRS: Record<string, string> = {
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ",
};
const FINAL_SPLIT: Record<string, [string, string]> = Object.fromEntries(
  Object.entries(FINAL_PAIRS).map(([pair, joined]) => [joined, [pair[0]!, pair[1]!]]),
);

const BASE = 0xac00;
const LAST = 0xd7a3;

const isVowel = (jamo: string) => JUNG.includes(jamo);
const isConsonant = (jamo: string) => CHO.includes(jamo) || JONG.includes(jamo);

type Syllable = { cho: number; jung: number; jong: number };

function split(char: string): Syllable | null {
  const code = char.codePointAt(0) ?? 0;
  if (code < BASE || code > LAST) return null;
  const offset = code - BASE;
  return {
    cho: Math.floor(offset / 588),
    jung: Math.floor((offset % 588) / 28),
    jong: offset % 28,
  };
}

const join = ({ cho, jung, jong }: Syllable) =>
  String.fromCharCode(BASE + cho * 588 + jung * 28 + jong);

/** 커서 앞 글자(`before` 의 마지막)에 낱자 하나를 더한 결과 — `before` 전체를 돌려준다 */
export function typeJamo(before: string, jamo: string): string {
  const head = before.slice(0, -1);
  const prev = before.slice(-1);
  const syllable = prev ? split(prev) : null;

  if (isVowel(jamo)) {
    if (syllable) {
      if (syllable.jong > 0) {
        // 받침이 다음 글자의 첫소리로 넘어간다(겹받침이면 뒤쪽만)
        const final = JONG[syllable.jong]!;
        const [keep, move] = FINAL_SPLIT[final] ?? ["", final];
        const cho = CHO.indexOf(move);
        if (cho < 0) return before + jamo;
        return (
          head +
          join({ ...syllable, jong: JONG.indexOf(keep) }) +
          join({ cho, jung: JUNG.indexOf(jamo), jong: 0 })
        );
      }
      const pair = VOWEL_PAIRS[JUNG[syllable.jung]! + jamo];
      if (pair) return head + join({ ...syllable, jung: JUNG.indexOf(pair) });
      return before + jamo;
    }
    const cho = CHO.indexOf(prev);
    if (prev && cho >= 0) return head + join({ cho, jung: JUNG.indexOf(jamo), jong: 0 });
    const pair = prev ? VOWEL_PAIRS[prev + jamo] : undefined;
    if (pair) return head + pair;
    return before + jamo;
  }

  if (isConsonant(jamo) && syllable) {
    if (syllable.jong === 0) {
      const jong = JONG.indexOf(jamo);
      if (jong > 0) return head + join({ ...syllable, jong });
    } else {
      const pair = FINAL_PAIRS[JONG[syllable.jong]! + jamo];
      if (pair) return head + join({ ...syllable, jong: JONG.indexOf(pair) });
    }
  }
  return before + jamo;
}
