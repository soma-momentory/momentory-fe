// MVP 전용 토큰 — 상류가 아직 흡수하지 않은 값만 모은다.
//
// 상류 리팩토링본 `momentory.css` 는 글자색을 semantic 6종 체계로 다시 짰고
// (`09_MVP/docs/RULES.md` 「접근성」 — "글자색은 semantic 6토큰만, Raw hex 금지"),
// 배경 그라디언트도 개정했다. 그런데 `05_도구/lib.mjs` → `theme.ts` 는 아직
// 옛 이름 체계(textPrimary·textSlogan·textLegalInk…)를 쓴다.
//
// **이 파일은 임시다.** 상류가 lib.mjs 에 반영하고 export-theme.mjs 를 다시 돌리면
// 여기를 지우고 화면 코드가 theme 을 직접 읽게 바꾼다. 그때까지 오버라이드는
// 화면 코드에 흩지 않고 이 한 곳에만 둔다.
//
// 2026-08-05 — 상류가 `textOnDark` 와 `primaryDeepPress` 를 흡수해서 **리터럴이 0개가 됐다.**
// 이제 이 파일은 순수한 이름 매핑이라 값이 어긋날 수 없다. 남은 일은 상류가 semantic 별칭을
// 6종 이름(textStrong·textCaption…)으로 바꾸는 것뿐이고, 그때 이 파일을 지운다.
//
// 2026-08-06 — **리터럴이 다시 생겼다.** MVP 값 정본은 `momentory.css` 인데 `theme.ts` 가
// 아직 그걸 따라오지 못했다. `.card` 의 반경 18 · 테두리 ink 10% · 여백 15/17 은
// `theme.radius`(sm 6 · image 12 · control 14 · sheet 22 · pill 999) 어디에도 없다.
// 화면 코드에 18 을 흩어 적는 것보다 여기 한 곳에 모으는 편이 낫고, 상류가 흡수하면 지운다.
// 근거는 `06_운영문서/OPEN-ISSUES.md` `R-42`.

import theme from "./theme";

const { palette, semantic } = theme.colors;

/**
 * 글자색 6종 — 화면 코드는 이것만 쓴다.
 * `momentory.css` 의 `--textStrong` … `--textOnDark` 와 1:1.
 */
export const text = {
  /** 제목·본문 강조 · 최소 4.5:1 (실측 11.9+) — css `--textStrong` */
  strong: semantic.textPrimary,
  /** 본문·설명·탭·보조 버튼 · 최소 4.5:1 — css `--textBody` */
  body: semantic.textBody,
  /** 각주·힌트·타임스탬프·placeholder·비활성 · 최소 3:1 — css `--textCaption` */
  caption: semantic.textSlogan,
  /** 반드시 읽혀야 하는 법적·안전 줄 · 최소 4.5:1 — css `--textLegal` */
  legal: semantic.textLegalInk,
  /** 강조 라벨·알림 제목·활성 탭 · 최소 4.5:1 — css `--textAccent` */
  accent: semantic.accentInk,
  /** 채운 버튼·잉크 면 위 — css `--textOnDark` */
  onDark: semantic.textOnDark,
  /** 삭제 등 되돌릴 수 없는 동작의 글자·테두리 — css `--dangerInk`. 면을 채우지 않는다 */
  danger: semantic.textDanger,
} as const;

/**
 * 면 색 — 글자가 얹히는 주황은 primaryDeep 이고, primary 는 장식 전용이다.
 * (`09_MVP/docs/RULES.md` · 상류 ISS-03)
 */
export const fill = {
  /** 주 버튼·체크의 면 — theme 의 accentFill 과 같은 값 */
  primaryDeep: palette.primaryDeep,
  /** 눌린 상태 — css `--primaryDeepPress` */
  primaryDeepPress: semantic.accentFillPress,
} as const;

/**
 * 카드 — `momentory.css` `.card` 그대로.
 *
 * ```css
 * .card{background:#FBF6EC;border:1px solid rgba(36,31,25,.1);
 *       border-radius:18px;padding:15px 17px;gap:8px}
 * ```
 *
 * ⚠ 원본 `05_도구/lib.mjs` `card()` 는 **r14 · 테두리 primary 30%** 로 다르다.
 * MVP 를 만들 때 그쪽을 보면 어긋난다 — MVP 판은 `flows/ui.mjs` `card2()` 다.
 */
export const card = {
  /** theme.radius 에 18 이 없다 */
  radius: 18,
  /** ink 10% — 0.1 × 255 = 25.5 → 1A */
  border: `${semantic.textPrimary}1A`,
  paddingVertical: 15,
  paddingHorizontal: 17,
  gap: 8,
} as const;

/**
 * 채팅 — `momentory.css` 의 `.conv` `.bub` `.bubme` `.ba` `.chip` `.chipOn` 그대로.
 *
 * ⚠ `COMPONENTS.md` 는 `BabaBubble` 을 "크림 카드, **테두리 없음**" 이라고 적지만
 * MVP 는 **테두리가 있다**(ink 10%). 칩 높이도 52 가 아니라 **44** 다(52 는 `.opt` 선택지 행).
 *
 * 모서리는 css 순서(TL TR BR BL)를 그대로 옮긴다 — 꼬리가 붙는 쪽만 6 이다.
 */
export const chat = {
  /** `.conv` + `.convTop` — **위에서부터** 쌓는다. gap 11 · 위 8 · 아래 4 */
  gap: 11,
  /**
   * `.convTop{justify-content:flex-start;padding-top:8px;overflow-y:auto}`
   *
   * v2(2026-08-06)가 대화를 **상단 정렬**로 뒤집었다 — 아래로 몰면 키보드가
   * 올라올 때 바바의 말이 가려진다(`RULES.md` 「원본과 다른 것」 `04`~`09`).
   * 시안의 시작 높이 100px 통일은 절대좌표 이야기다 — RN 에서는 모든 질문
   * 화면이 같은 `OnboardingTopBar` 아래에서 이 paddingTop 으로 시작하면 같다.
   */
  convTop: { paddingTop: 8, paddingBottom: 4 },
  /** `.bub` — 바바. 왼쪽 아래 꼬리 */
  baba: {
    maxWidth: 290,
    paddingVertical: 14,
    paddingHorizontal: 17,
    radius: { topLeft: 20, topRight: 20, bottomRight: 20, bottomLeft: 6 },
  },
  /** `.bubme` — 내 답. 오른쪽 아래 꼬리 */
  answer: {
    maxWidth: 280,
    paddingVertical: 12,
    paddingHorizontal: 16,
    radius: { topLeft: 20, topRight: 20, bottomRight: 6, bottomLeft: 20 },
  },
  /** `.ba` 52 · `.bas` 34. 바깥 링은 box-shadow `0 0 0 10px rgba(251,246,236,.5)` */
  avatar: { lg: 52, sm: 34, ring: 10 },
  /** `typing()` — 62×35 버블 안에 7px 점 3개, 12px 간격 */
  typing: { width: 62, height: 35, dot: 7, dotGap: 5 },
  /** `.chip` 44 (·`.opt` 52 는 다른 것) */
  chip: { minHeight: 44, paddingHorizontal: 16, gap: 8 },
} as const;

/** 채팅에서 쓰는 테두리·면 — `theme` 에 이름이 없는 것만 */
export const chatColor = {
  /** `.bub` `.chipOn` 아님 — 기본 칩 테두리 ink 14% (0.14 × 255 = 35.7 → 24) */
  chipBorder: `${semantic.textPrimary}24`,
  /** `.ba` 바깥 링 — rgba(251,246,236,.5). #FBF4E7 = textOnDark */
  avatarRing: `${semantic.textOnDark}80`,
  /** `.ba` 이미지가 없을 때의 바탕 */
  avatarBase: "#EFE5D4",
} as const;

/**
 * 입력 줄 — `momentory.css` `.tfield` 그대로 (`04` 닉네임 · `05-b` 나이).
 *
 * ```css
 * .tfield{min-height:56px;padding:0 18px;background:#FBF6EC;
 *         border:1.5px solid rgba(36,31,25,.24);border-radius:14px}
 * .tfieldOn{border:1.5px solid var(--primaryDeep);
 *           box-shadow:0 0 0 3px rgba(162,91,44,.12)}
 * ```
 *
 * ⚠ `08` 의 시간 선택 칸은 **다른 물건**이다 — 아래 `timeField`.
 */
export const inputRow = {
  height: 56,
  radius: 14,
  paddingHorizontal: 18,
  borderWidth: 1.5,
  /** ink 24% — 0.24 × 255 = 61.2 → 3D */
  border: `${semantic.textPrimary}3D`,
  /** placeholder 는 16px caption */
  fontSize: 16,
  /** `.tfieldOn` — 포커스. 테두리 primaryDeep + 3px 링 */
  focus: {
    border: palette.primaryDeep,
    /** rgba(162,91,44,.12) — primaryDeep 12% */
    ring: `${palette.primaryDeep}1F`,
    ringWidth: 3,
  },
} as const;

/**
 * `08` 시간 선택 칸 — `9-mvp.mjs` 의 raw rect. `.tfield` 와 반경·테두리가 다르다.
 * 탭하면 **OS 피커**가 열린다(`08.md` — 커스텀 휠 금지).
 */
export const timeField = {
  height: 56,
  radius: 16,
  paddingHorizontal: 20,
  borderWidth: 1,
  /** ink 14% — 0.14 × 255 = 35.7 → 24 */
  border: `${semantic.textPrimary}24`,
  fontSize: 15,
} as const;

/**
 * 지우기 × — `05-b` 나이 · `06-c` 기타. 시각 19px 원, **히트는 44**(hitSlop).
 * `05-b.md` — "선택을 되돌릴 길이 없으면 선택이 아니다."
 */
export const clearButton = {
  size: 19,
  /** `.othxi` — ink 14% 판 위 body × */
  background: `${semantic.textPrimary}24`,
  /** (44 - 19) / 2 — hitSlop 으로 44pt 를 채운다 */
  hitSlop: 12.5,
} as const;

/**
 * `.othr` — `06-b`·`06-c` 기타 인라인 입력 줄. 칩 **바로 아래** 한 줄이고
 * 별도 화면·시트로 보내지 않는다(`06-b.md`). 밑줄만 강조한다 — 칩 줄에
 * 사각 입력칸을 넣으면 칩과 같은 것으로 읽힌다.
 */
export const otherRow = {
  gap: 8,
  /** `.othk` 라벨 13px caption */
  labelSize: 13,
  field: {
    minHeight: 44,
    paddingHorizontal: 15,
    gap: 6,
    /** 위쪽만 둥근 사각 — 12 12 0 0 */
    radiusTop: 12,
    underline: 1.5,
  },
  /** `.othv` 값 · `.othp` placeholder — 500 14px */
  fontSize: 14,
  /** `.othc` 카운터 — 11px caption */
  counterSize: 11,
  maxLength: 12,
} as const;

/**
 * `.warn` — 한 줄 경고. 모달이 아니고 입력을 막지 않는다(`06-b.md`).
 * 배지와 같은 accentWash 면 위에 accent 글자.
 */
export const warnRow = {
  radius: 13,
  paddingVertical: 12,
  paddingHorizontal: 14,
  gap: 9,
  fontSize: 12,
  background: semantic.accentWash,
} as const;

/**
 * `.oauth` — `S1` 소셜 버튼. v2 에서 54 → **44 · r12** 로 바뀌었고
 * 공식 마크는 **왼쪽 16px 절대 정렬**이다(`S1.md` — 마크가 라벨과 함께
 * 흐르면 세 버튼의 글자 시작점이 어긋난다).
 */
export const oauth = {
  height: 44,
  radius: 12,
  markLeft: 16,
  markSize: 18,
  fontSize: 15,
} as const;

/**
 * `S0`·`S1` — 바바 발밑 그림자 92×8 / 24% (`9-mvp.mjs`).
 * 150×16 / 30% 는 캐릭터가 떠 있는 것처럼 보였다(`S0.md`).
 */
export const babaShadow = {
  color: "#8C6E4A",
  opacity: 0.24,
} as const;

/**
 * 배경 그라디언트.
 * 상류 `momentory.css` 가 `.scr` 을 `120% 90% at 50% 18%` 로 개정했고,
 * **진입 2장(S0·S1)만** 구 값 `115% 75% at 50% 26%` 를 유지한다.
 * (`09_MVP/docs/RULES.md` 「원본과 다른 것」)
 *
 * center·radius 는 화면 크기 대비 비율이다 — svg RadialGradient 에 그대로 넘긴다.
 */
export const gradients = {
  /** 기본 — MVP 28장 */
  screen: {
    center: [0.5, 0.18],
    radius: [1.2, 0.9],
    stops: theme.gradients.screen.stops,
  },
  /** 진입 2장 전용 — S0 · S1 */
  entry: {
    center: theme.gradients.screen.center,
    radius: theme.gradients.screen.radius,
    stops: theme.gradients.screen.stops,
  },
} as const;

export type ScreenGradient = (typeof gradients)[keyof typeof gradients];
