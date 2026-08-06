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
