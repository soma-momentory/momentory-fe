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
  /** `.conv` — 아래에서 위로 쌓고 넘치면 위가 잘린다 */
  gap: 11,
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
 * 입력 줄 — `04` 닉네임 · `08` 시간. `flows/9-mvp.mjs` 의 raw rect 값이다.
 *
 * ⚠ `momentory.css` 에 대응 클래스가 **없다**. `.inp`(r999)는 홈의 순간 입력 알약이라
 * 다른 것이다. 원본 `2-onboarding.mjs` `inputRow()` 와도 다르다 — 높이 52→**56**,
 * 알약(r26)→**r16**, 테두리 primary 20%→**ink 14%**.
 */
export const inputRow = {
  height: 56,
  radius: 16,
  paddingHorizontal: 18,
  /** ink 14% — 0.14 × 255 = 35.7 → 24 */
  border: `${semantic.textPrimary}24`,
  /** placeholder 는 16px legal */
  fontSize: 16,
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
