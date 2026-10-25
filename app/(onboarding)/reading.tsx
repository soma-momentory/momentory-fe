import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Text } from "@/components/ds";
import { OnboardingFrame } from "@/components/onboarding/OnboardingParts";
import { label as labelColor, line, onboardingArt, primary, space } from "@/design/ds";
import { READING_LINES } from "@/features/onboarding/model/flow";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const R = 86;
const CIRCUMFERENCE = 2 * Math.PI * R;
/**
 * 약 5초 — 원이 0→100% 차오르며 31% · 68% 에서 0.5초씩 멈추고, 그때마다 한 줄씩 체크한다.
 * 끝나면 이름 화면으로 저절로 넘어간다(10/24 확정 · `proto-v2.html` 「답 정리」).
 */
const STOPS = [31, 68, 100] as const;
const FILL_MS = [1240, 1480, 1280] as const;
const PAUSE_MS = 500;

export default function Reading() {
  const [progress] = useState(() => new Animated.Value(0));
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setPct(Math.round(value)));
    const steps = STOPS.flatMap((to, i) => [
      Animated.timing(progress, {
        toValue: to,
        duration: FILL_MS[i],
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(PAUSE_MS),
    ]);
    Animated.sequence(steps).start(({ finished }) => {
      // 뒤로 가면 이 화면을 다시 돌지 않게 바꿔 끼운다 — 이름에서 뒤로 가면 목표다
      if (finished) router.replace("/name");
    });
    return () => {
      progress.stopAnimation();
      progress.removeAllListeners();
      void id;
    };
  }, [progress]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <OnboardingFrame>
      <View style={styles.root} accessibilityLiveRegion="polite">
        <Text variant="heading1" color={labelColor.strong}>
          바바가 답을 읽고 있어요
        </Text>
        <View style={styles.ring} importantForAccessibility="no-hide-descendants">
          <Svg width={200} height={200} viewBox="0 0 200 200">
            <Circle
              cx={100}
              cy={100}
              r={R}
              fill={onboardingArt.paper}
              stroke={line.neutral}
              strokeWidth={10}
            />
            <AnimatedCircle
              cx={100}
              cy={100}
              r={R}
              fill="none"
              stroke={primary.heavy}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 100 100)"
            />
          </Svg>
          <View style={styles.pct}>
            <Text variant="title1Hand" color={labelColor.strong}>{`${pct}%`}</Text>
          </View>
        </View>
        <View style={styles.lines}>
          {READING_LINES.map((text, i) => {
            const done = pct >= STOPS[i]!;
            const doing = !done && pct >= (STOPS[i - 1] ?? 0);
            return (
              <View key={text} style={[styles.line, !done && !doing && styles.lineWaiting]}>
                <View style={[styles.check, done && styles.checkDone]}>
                  {done ? (
                    <Text variant="caption2" color={labelColor.onFill}>
                      ✓
                    </Text>
                  ) : null}
                </View>
                <Text
                  variant="body2"
                  color={done || doing ? labelColor.strong : labelColor.alternative}
                >
                  {text}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.xl2 },
  ring: { width: 200, height: 200 },
  pct: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  lines: { gap: 10, width: 240 },
  line: { flexDirection: "row", alignItems: "center", gap: 10 },
  lineWaiting: { opacity: 0.45 },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: line.neutral,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: { backgroundColor: primary.heavy, borderColor: primary.heavy },
});
