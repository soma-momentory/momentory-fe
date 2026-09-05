/**
 * Momentory DS — **3세대 토큰 정본** (2026-08-20 · `PLAN.md` A).
 *
 * SSOT 는 [`docs/DESIGN.md`](../../../docs/DESIGN.md) 하나다 — 반입 패키지의 나머지
 * (`*.dc.html` · 토큰 CSS · 아이콘 원본)는 이관이 끝나면서 지웠다(`PLAN.md` A-18).
 *
 * ## 이 파일들만 hex 를 든다
 *
 * 린터가 `src/design/**` 밖의 hex 리터럴을 막는다(`eslint.config.js`).
 * 화면은 색을 여기서 가져다 쓰고, 새 색이 필요하면 **여기에 이름을 만든 뒤** 쓴다.
 *
 * ## 이제 토큰은 이것뿐이다
 *
 * `theme.ts`(1세대) · `tokens.mvp.ts`(1.5세대) · `paper.ts`(2세대)가 있었고,
 * **셋 다 참조 0 이 되면서 지웠다**(2026-08-20 · `PLAN.md` A-16). 화면 40장이
 * 전부 3세대다 — 「한 화면에 두 체계를 섞지 않는다」는 규칙은 그 공존기의 것이었다.
 *
 * ## 다크 모드는 없다
 *
 * 2026-08-20 결정(N1). `DESIGN.md` §1 의 다크 팔레트는 구현하지 않는다 —
 * 테마 분기·`useColorScheme()` 를 만들지 않는다.
 */
import { color } from "./color";
import { metrics } from "./metrics";
import { typography } from "./typography";

export {
  background,
  color,
  emotion,
  emotionTint,
  fill,
  grid,
  interaction,
  label,
  cardFrame,
  line,
  overlay,
  primary,
  secondary,
  selectedTint,
  social,
  status,
  withAlpha,
} from "./color";

export {
  fontFamily,
  // 로그인(`S1`) 하나만 쓰는 고딕 — 다른 화면에서 부르지 않는다
  gothic,
  gothicFamily,
  maxFontScale,
  text,
  typography,
  type FontWeightName,
  type TextToken,
} from "./typography";

export {
  bubbleRadius,
  elevation,
  hairline,
  layout,
  metrics,
  radius,
  size,
  space,
  zIndex,
  motion,
} from "./metrics";

/** 묶음 하나로 들고 다닐 때 — `import ds from "@/design/ds"` */
export const ds = { ...color, ...metrics, ...typography } as const;
export default ds;
