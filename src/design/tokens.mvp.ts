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
// 값은 최대한 theme 에서 끌어온다 — 이름만 다르고 값이 같은 것을 다시 타이핑하면
// 상류가 값을 고쳤을 때 여기만 옛 값으로 남는다. 리터럴은 theme 에 아예 없는 둘뿐이다.

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
  /** 채운 버튼·잉크 면 위 — css `--textOnDark`. ⚠ theme 에 아직 없다 */
  onDark: "#FBF4E7",
} as const;

/**
 * 면 색 — 글자가 얹히는 주황은 primaryDeep 이고, primary 는 장식 전용이다.
 * (`09_MVP/docs/RULES.md` · 상류 ISS-03)
 */
export const fill = {
  /** 주 버튼·체크의 면 — theme 의 accentFill 과 같은 값 */
  primaryDeep: palette.primaryDeep,
  /** 눌린 상태 — css `--primaryDeepPress`. ⚠ theme 에 아직 없다 */
  primaryDeepPress: "#9E5626",
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
