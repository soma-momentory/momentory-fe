import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import { paperColors, paperHomeCard, paperRadius, paperShadows } from "@/design/paper";
import theme from "@/design/theme";
import { card } from "@/design/tokens.mvp";

/**
 * 카드 면. **MVP 값 정본은 `momentory.css` `.card` 다.**
 *
 * ```css
 * .card{background:#FBF6EC;border:1px solid rgba(36,31,25,.1);
 *       border-radius:18px;padding:15px 17px;gap:8px}
 * ```
 *
 * ⚠ `02_디자인시스템/COMPONENTS.md` 의 P0 표는 **원본을 서술한다**
 * ("stroke primary 30% 1px, r14"). 그 줄을 보고 만들면 어긋난다 — 실제로 그렇게
 * 만들었다가 고쳤다(`06_운영문서/OPEN-ISSUES.md` `R-42`). MVP 28화면을 그리는 것은
 * `05_도구/flows/ui.mjs` `card2()` 이고 기본값이 **r18 · ink 10%** 다.
 *
 * 면 색은 `card` 하나로 통합됐다(2026-07-31). 구 `sheet #FBF4E7` 는 육안 구분이
 * 안 됐고, 시트의 위계는 그림자·radius·딤이 이미 만든다 — 그래서 여기서 면을
 * 바꿔 위계를 표현하지 않는다.
 */
export type CardVariant = "default" | "plain" | "paperSoft" | "paperOpaque" | "paperHome";

// style 은 다시 선언하지 않는다 — ViewProps 의 StyleProp<ViewStyle> 을 그대로 물려받아야
// `[a, cond && b]` · null · 등록된 스타일이 전부 들어온다. ViewStyle 로 좁히면 View 는
// 받는 값을 우리 프리미티브만 거부한다.
type Props = ViewProps & {
  /**
   * `default` 는 테두리가 있다.
   * `plain` 은 **테두리 없이 면만** 둔다. 배경 위에 글 한 덩이를 얹을 때 쓴다
   * (온보딩 범위 안내 등). `card2()` 도 `stroke: null` 을 받는다.
   *
   * 새 디자인 3종 (`PLAN.md` Phase 2 — 리스킨된 화면만 쓴다):
   * `paperSoft` 반투명 흰 면 + 얕은 그림자 (쉼터·보관함·리포트 카드),
   * `paperOpaque` 불투명 면 (시트·상세 카드),
   * `paperHome` 홈 전용 — 그림자 대신 1.5px 잉크 테두리 + 3px 오프셋.
   */
  variant?: CardVariant;
};

export function Card({ variant = "default", style, ...rest }: Props) {
  return <View {...rest} style={[styles.base, VARIANTS[variant], style]} />;
}

const VARIANTS: Record<CardVariant, ViewStyle> = {
  default: { borderWidth: 1, borderColor: card.border },
  plain: {},
  paperSoft: {
    backgroundColor: paperColors.bg.cardSoft,
    borderRadius: paperRadius.card,
    ...paperShadows.flat,
  },
  paperOpaque: {
    backgroundColor: paperColors.bg.cardOpaque,
    borderRadius: paperRadius.cardLg,
    ...paperShadows.raised,
  },
  paperHome: {
    backgroundColor: paperColors.bg.card,
    borderRadius: paperRadius.cardHome,
    borderWidth: paperHomeCard.borderWidth,
    borderColor: paperHomeCard.borderColor,
    ...paperHomeCard.shadow,
  },
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.semantic.surface,
    borderRadius: card.radius,
    paddingVertical: card.paddingVertical,
    paddingHorizontal: card.paddingHorizontal,
    gap: card.gap,
  },
});
