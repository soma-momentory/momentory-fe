import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { paperColors, paperSky } from "@/design/paper";
import theme from "@/design/theme";
import { gradients, type ScreenGradient } from "@/design/tokens.mvp";

/**
 * 새 디자인 배경 4종 (`PLAN.md` Phase 2 — 화면이 리스킨될 때 opt-in):
 * - `paperHome` 홈 종이 · `paperDim` 기본 종이 · `paperFlat` 회고·일기·리포트
 * - `paperSky` 쉼터·보관함·마이 — 하늘 → 종이로 내려오는 세로 그라디언트
 */
const PAPER_SOLID = {
  paperHome: paperColors.bg.paper,
  paperDim: paperColors.bg.paperDim,
  paperFlat: paperColors.bg.flat,
  paperSky: paperColors.bg.flat, // 그라디언트 꼬리색 — svg 폴백
} as const;

export type BackgroundVariant = keyof typeof gradients | keyof typeof PAPER_SOLID;

type Props = {
  children?: ReactNode;
  /**
   * 기본 `screen` 은 옛(웜) 라디얼 — 아직 리스킨 전인 화면과
   * 리스킨 제외 화면(로그인·온보딩 — `entry` 포함)이 그대로 쓴다.
   */
  variant?: BackgroundVariant;
  /** SafeArea 를 끄고 화면 끝까지 그린다 (스플래시 등) */
  edgeToEdge?: boolean;
  /**
   * 종이 변형의 바닥색을 덮어쓴다 — **상태바 밑까지** 그 색이 되므로,
   * 화면 맨 위가 다른 면일 때 이음매가 생기지 않는다(홈의 날씨 하늘).
   * SafeArea 위쪽은 화면이 못 그리는 자리라 여기서만 맞출 수 있다.
   */
  surfaceColor?: string;
};

/**
 * 모든 화면의 바닥.
 *
 * 옛 변형은 `momentory.css` 의 radial-gradient 를 svg 로 그린다 —
 * objectBoundingBox 단위(0~1)라 `120% 90% at 50% 18%` 가 그대로 옮겨진다.
 *
 * 다크모드에서도 반전하지 않는다. 종이 톤이 앱의 정체성이다.
 */
export function ScreenBackground({
  children,
  variant = "screen",
  edgeToEdge = false,
  surfaceColor,
}: Props) {
  const Container = edgeToEdge ? View : SafeAreaView;

  if (isPaper(variant)) {
    return (
      <View style={[styles.root, { backgroundColor: surfaceColor ?? PAPER_SOLID[variant] }]}>
        {variant === "paperSky" ? (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                {paperSky.stops.map((color, i) => (
                  <Stop key={color} offset={paperSky.locations[i]} stopColor={color} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#sky)" />
          </Svg>
        ) : null}
        <Container style={styles.content}>{children}</Container>
      </View>
    );
  }

  const g: ScreenGradient = gradients[variant];
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

function isPaper(v: BackgroundVariant): v is keyof typeof PAPER_SOLID {
  return v in PAPER_SOLID;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // 그라디언트가 못 뜨는 순간의 폴백 — 단색 배경
    backgroundColor: theme.colors.semantic.background,
  },
  content: {
    flex: 1,
    // 시안은 절대좌표지만 구현은 flex 다.
    // 다른 폭에서 비율로 스케일하지 않고 여백만 유지한다.
    paddingHorizontal: theme.layout.screenMargin,
  },
});
