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
 * ## 옛 토큰과 섞지 않는다
 *
 * `theme.ts`(1세대 · 동결) · `tokens.mvp.ts`(1.5세대) · `paper.ts`(2세대) 가 아직 있다 —
 * 화면 8장이 `paper.ts` 로, 로그인·온보딩이 옛 토큰으로 그려져 있기 때문이다.
 * **한 화면 안에 두 체계를 섞지 않는다.** 화면을 옮길 때 통째로 이 파일로 갈아탄다.
 * 셋 다 참조 0 이 되면 지운다(`PLAN.md` A-0 Phase 5).
 *
 * ## 다크 모드는 없다
 *
 * 2026-08-20 결정(N1). `design.md` §1 의 다크 팔레트는 구현하지 않는다 —
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
  line,
  overlay,
  primary,
  secondary,
  selectedTint,
  social,
  status,
  withAlpha,
} from "./color";

export { fontFamily, text, typography, type FontWeightName, type TextToken } from "./typography";

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
