import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import theme from "@/design/theme";
import { gradients, type ScreenGradient } from "@/design/tokens.mvp";

type Props = {
  children?: ReactNode;
  /**
   * 진입 2장(S0·S1)만 구 그라디언트를 쓴다.
   * `09_MVP/docs/RULES.md` 「원본과 다른 것」 참조.
   */
  variant?: keyof typeof gradients;
  /** SafeArea 를 끄고 화면 끝까지 그린다 (스플래시 등) */
  edgeToEdge?: boolean;
};

/**
 * 모든 화면의 바닥 — `momentory.css` 의 `.scr` 에 해당한다.
 *
 * radial-gradient 라서 `expo-linear-gradient` 로는 그릴 수 없다.
 * svg 의 RadialGradient 는 objectBoundingBox 단위(0~1)를 쓰므로
 * css 의 `120% 90% at 50% 18%` 가 그대로 옮겨진다 — 화면 크기를 재지 않아도 된다.
 *
 * 다크모드에서도 반전하지 않는다. 크림 톤이 앱의 정체성이다.
 */
export function ScreenBackground({ children, variant = "screen", edgeToEdge = false }: Props) {
  const g: ScreenGradient = gradients[variant];
  const Container = edgeToEdge ? View : SafeAreaView;

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient
            id="scr"
            cx={String(g.center[0])}
            cy={String(g.center[1])}
            rx={String(g.radius[0])}
            ry={String(g.radius[1])}
          >
            {g.stops.map((s) => (
              <Stop key={s.position} offset={s.position} stopColor={s.color} />
            ))}
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#scr)" />
      </Svg>
      <Container style={styles.content}>{children}</Container>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // 그라디언트가 못 뜨는 순간의 폴백 — 단색 배경
    backgroundColor: theme.colors.semantic.background,
  },
  content: {
    flex: 1,
    // 시안은 절대좌표 375×812지만 구현은 flex 다.
    // 다른 폭에서 비율로 스케일하지 않고 여백만 유지한다.
    paddingHorizontal: theme.layout.screenMargin,
  },
});
