import { useEffect, useState, type ReactNode } from "react";
import { Animated, StyleSheet, type ViewProps } from "react-native";

import { useReduceMotion } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { paperChat, paperColors, paperShadows } from "@/design/paper";
import theme from "@/design/theme";
import { chat } from "@/design/tokens.mvp";

/**
 * 바바 말풍선. `momentory.css` `.bub`.
 *
 * ```css
 * .bub{background:#FBF6EC;border:1px solid rgba(36,31,25,.1);
 *      border-radius:20px 20px 20px 6px;padding:14px 17px;
 *      font:400 15px/1.65;color:var(--textStrong);max-width:290px;align-self:flex-start}
 * ```
 *
 * ⚠ `COMPONENTS.md` 는 "크림 카드, **테두리 없음**" 이라고 적지만 MVP 는 테두리가 있다.
 * 꼬리는 **왼쪽 아래**(bottomLeft 6) — 말하는 쪽을 가리킨다.
 *
 * 등장은 `motion.bubble` — Y +10 → 0 + Fade, 220ms. 연속으로 나오면 `index` 만큼
 * +90ms 씩 밀린다. **앞 풍선은 움직이지 않는다**(`MOTION.md`) — 그래서 레이아웃
 * 애니메이션이 아니라 새 풍선 하나의 등장이다.
 */
const { bubble } = theme.motion.spec;

type Props = Omit<ViewProps, "children"> & {
  children: ReactNode;
  /** 연속 등장 순서. 0,1,2… 마다 +90ms 스태거 */
  index?: number;
  /**
   * 새 디자인의 말풍선 — **반투명 흰 면 · 라운드 14/14/14/4 · 최대 84%**
   * (`docs/design/prototype/회고.dc.html` · `paper.ts` `paperChat.baba`).
   * 테두리 대신 얕은 그림자로 떠 있고, 뒤의 언덕이 비쳐 보인다.
   *
   * ⚠ **온보딩(`04`~`09`)도 이 컴포넌트를 쓴다** — 리스킨 범위 밖이라 기본값을
   * 바꾸지 않고, 회고 화면만 켠다(`PLAN.md` Phase 2 「화면이 opt-in 한다」).
   */
  variant?: "default" | "paper";
};

export function BabaBubble({ children, index = 0, variant = "default", style, ...rest }: Props) {
  const paper = variant === "paper";
  const reduceMotion = useReduceMotion();
  const [enter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      // Reduce Motion 이면 이동을 빼고 opacity 만 120ms (theme.motion.reduceMotion)
      duration: reduceMotion ? theme.motion.reduceMotion.duration : bubble.duration,
      delay: reduceMotion ? 0 : index * bubble.stagger,
      useNativeDriver: true,
    }).start();
  }, [enter, index, reduceMotion]);

  return (
    <Animated.View
      accessibilityRole="text"
      {...rest}
      style={[
        styles.bubble,
        paper ? styles.bubblePaper : null,
        {
          opacity: enter,
          transform: reduceMotion
            ? []
            : [
                {
                  translateY: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [bubble.translateY, 0],
                  }),
                },
              ],
        },
        style,
      ]}
    >
      <AppText style={[styles.text, paper ? styles.textPaper : null]}>{children}</AppText>
    </Animated.View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  bubble: {
    alignSelf: "flex-start",
    maxWidth: chat.baba.maxWidth,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: `${semantic.textPrimary}1A`, // ink 10% — .card 와 같은 값
    borderTopLeftRadius: chat.baba.radius.topLeft,
    borderTopRightRadius: chat.baba.radius.topRight,
    borderBottomRightRadius: chat.baba.radius.bottomRight,
    borderBottomLeftRadius: chat.baba.radius.bottomLeft,
    paddingVertical: chat.baba.paddingVertical,
    paddingHorizontal: chat.baba.paddingHorizontal,
  },
  // css 는 15px/1.65 = 24.75. typography 에 없는 조합이라 여기서 맞춘다.
  text: { fontSize: 15, lineHeight: 24.75, color: semantic.textPrimary },

  // ── 새 디자인 ────────────────────────────────────────────────────────
  bubblePaper: {
    maxWidth: paperChat.baba.maxWidth,
    backgroundColor: paperChat.baba.background,
    // 테두리 대신 얕은 그림자 하나다 (design-system.md §3)
    borderWidth: 0,
    borderTopLeftRadius: paperChat.baba.radius.topLeft,
    borderTopRightRadius: paperChat.baba.radius.topRight,
    borderBottomRightRadius: paperChat.baba.radius.bottomRight,
    borderBottomLeftRadius: paperChat.baba.radius.bottomLeft,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...paperShadows.flat,
  },
  // 시안 `font-size:14;line-height:1.6;letter-spacing:-.2`
  textPaper: {
    fontSize: 14,
    lineHeight: 22.4,
    letterSpacing: -0.2,
    color: paperColors.text.primary,
  },
});
