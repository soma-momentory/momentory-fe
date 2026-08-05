import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import theme from "@/design/theme";

/**
 * 카드 면. (`02_디자인시스템/COMPONENTS.md` P0 · 상류 `lib.mjs` `card()`)
 *
 * fill `card` · stroke primary 30% 1px · r14. 안쪽 여백은 상류가 자식을
 * `x:16 y:14` 에 놓는 것과 같은 값이다.
 *
 * 면 색은 `card` 하나로 통합됐다(2026-07-31). 구 `sheet #FBF4E7` 는 육안 구분이
 * 안 됐고, 시트의 위계는 그림자·radius·딤이 이미 만든다 — 그래서 여기서 면을
 * 바꿔 위계를 표현하지 않는다.
 */
export type CardVariant = "default" | "plain";

// style 은 다시 선언하지 않는다 — ViewProps 의 StyleProp<ViewStyle> 을 그대로 물려받아야
// `[a, cond && b]` · null · 등록된 스타일이 전부 들어온다. ViewStyle 로 좁히면 View 는
// 받는 값을 우리 프리미티브만 거부한다.
type Props = ViewProps & {
  /**
   * `default` 는 테두리가 있다.
   * `plain` 은 상류 `textCard` — **테두리 없이 면만** 둔다. 배경 위에 글 한 덩이를
   * 얹을 때 쓴다(온보딩 범위 안내 등). 테두리를 지우는 것 말고는 같은 카드다.
   */
  variant?: CardVariant;
};

export function Card({ variant = "default", style, ...rest }: Props) {
  return <View {...rest} style={[styles.base, VARIANTS[variant], style]} />;
}

const { semantic } = theme.colors;

// 테두리는 primary 30%. primary 는 **장식 전용**이라 테두리·점·바에만 쓴다 —
// 글자를 얹는 면은 accentFill 이다 (RULES 2 · 상류 ISS-03).
// 0.3 × 255 = 76.5 → 4D.
const STROKE = `${semantic.accent}4D`;

const VARIANTS: Record<CardVariant, ViewStyle> = {
  default: { borderWidth: 1, borderColor: STROKE },
  plain: {},
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: semantic.surface,
    borderRadius: theme.radius.control,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
