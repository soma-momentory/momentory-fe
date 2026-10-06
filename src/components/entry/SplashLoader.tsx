import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { splashLoader, splashLoaderMotion } from "@/design/ds";

/** 전체 지름 — 36 에서 줄였다(2026-10-06 · 사용자 요청 「크기 자체도 좀 줄여」) */
const SIZE = 26;
/** 빗살 수 — iOS 기본 기다림 표시와 같다 */
const SPOKES = 8;
const SPOKE_INNER = 5.5;
const SPOKE_OUTER = 11.5;
const SPOKE_WIDTH = 2.5;
/** 꼬리 끝 빗살의 투명도 — 맨 앞(1)에서 여기까지 고르게 옅어진다 */
const TAIL_OPACITY = 0.18;

/**
 * 한 바퀴를 여덟 칸으로 끊는 회전 — `interpolate` 로 계단을 만든다(네이티브 드라이버 그대로).
 * 각 칸의 끝 바로 앞까지 같은 각을 쥐고 있다가 다음 칸에서 45° 를 건너뛴다.
 */
const STEP_INPUT: number[] = [];
const STEP_OUTPUT: string[] = [];
for (let i = 0; i < SPOKES; i++) {
  const deg = `${(i * 360) / SPOKES}deg`;
  STEP_INPUT.push(i / SPOKES, (i + 1) / SPOKES - 0.0001);
  STEP_OUTPUT.push(deg, deg);
}

/**
 * `S0` 의 기다림 표시 — **iOS 기본 기다림 표시 모양**(2026-10-06 · 사용자 요청).
 *
 * 둥근 빗살 여덟이 맨 앞에서 꼬리로 갈수록 옅어지고, 한 칸씩 끊어 돈다. `ds/Spinner` 는 OS 가
 * 그리는 것이라 안드로이드에서는 원호가 돈다 — 스플래시는 두 플랫폼이 같은 모양이어야 해서
 * 여기만 직접 그린다. 다른 화면의 기다림은 그대로 `Spinner` 다.
 *
 * - **진행률·남은 시간을 말하지 않는다** — `Spinner` 와 같은 규칙(`RULES.md` 4)
 * - 움직임 줄이기가 켜져 있으면 돌지 않는다 — 빗살 모양만 남는다
 * - 장식이라 낭독기에서 숨긴다 — 「준비 중」은 `S0` 가 화면 단위로 말한다
 */
export function SplashLoader() {
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: splashLoaderMotion.turn,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (alive && !reduced) spin.start();
      });
    return () => {
      alive = false;
      spin.stop();
    };
  }, [turn]);

  const rotate = turn.interpolate({ inputRange: STEP_INPUT, outputRange: STEP_OUTPUT });
  const c = SIZE / 2;

  return (
    <View
      style={styles.root}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={SIZE} height={SIZE}>
          {Array.from({ length: SPOKES }, (_, i) => {
            // 12시에서 시계 방향으로 — 12시가 맨 앞(가장 진함), 시계 반대쪽으로 꼬리가 옅어진다
            const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2;
            const opacity = 1 - ((SPOKES - i) % SPOKES) * ((1 - TAIL_OPACITY) / (SPOKES - 1));
            return (
              <Line
                key={i}
                x1={c + Math.cos(a) * SPOKE_INNER}
                y1={c + Math.sin(a) * SPOKE_INNER}
                x2={c + Math.cos(a) * SPOKE_OUTER}
                y2={c + Math.sin(a) * SPOKE_OUTER}
                stroke={splashLoader.spoke}
                strokeOpacity={opacity}
                strokeWidth={SPOKE_WIDTH}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
});
