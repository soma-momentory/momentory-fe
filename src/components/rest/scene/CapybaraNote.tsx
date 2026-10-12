import { type ReactNode, useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ds";
import {
  label as labelColor,
  radius,
  restMood,
  restMoodMotion,
  restMoodSize,
  restScene,
  restSceneSize,
  space,
  withAlpha,
} from "@/design/ds";

/**
 * 장면 위에 내려앉는 **카피바라 쪽지** — 나갈 때 기분 쪽지(`MoodExit` · 2026-10-08)에서 떼어 냈다
 * (2026-10-12 · 처음 들어간 쉼터의 설명 쪽지 `GuideNote` 가 함께 쓴다).
 *
 * 그 장면 위에 크림빛이 옅게 깔리고 가운데에 쪽지가 흔들리며 내려앉는다. 시스템 창(어두운 막 ·
 * 흰 상자)이 아니라 쪽지라 장면이 끊기지 않는다. 쪽지는 걱정상자의 카피바라 쪽지와 같은 결이다 —
 * 종이색 면 · 잉크 선 · 단단한 그림자 · 손글씨 · 「-카피바라-」.
 *
 * 안에 무엇을 쓸지는 부르는 쪽이 정한다(`children`). 쪽지 아래 버튼 자리(`footer`)는 비어 있어도
 * 늘 잡아 둬서 버튼이 붙을 때 쪽지가 움직이지 않는다. 떠 있는 동안 뒤 장면은 낭독기에서도 물러난다.
 */
export function CapybaraNote({
  testID,
  children,
  footer,
}: {
  testID: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [veil] = useState(() => new Animated.Value(0));
  const [land] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const it = Animated.parallel([
      Animated.timing(veil, {
        toValue: 1,
        duration: restMoodMotion.veil,
        useNativeDriver: true,
      }),
      Animated.timing(land, {
        toValue: 1,
        duration: restMoodMotion.land,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
    ]);
    it.start();
    return () => it.stop();
  }, [veil, land]);

  const tilt = restMoodSize.tilt;

  return (
    <View
      testID={testID}
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        styles.exit,
        { paddingTop: insets.top, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, { opacity: veil }]} />
      <Animated.View
        style={[
          styles.wrap,
          {
            // 짙어지기는 내려앉는 시간의 앞 절반에 끝난다 — 늦게 짙어지면 느리게 읽혔다
            opacity: land.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateY: land.interpolate({ inputRange: [0, 1], outputRange: [-space.xl, 0] }) },
              {
                rotate: land.interpolate({
                  inputRange: [0, 1],
                  outputRange: [`${tilt * 3}deg`, `${tilt}deg`],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.shadow} />
        <View style={styles.note}>
          {children}
          <Text variant="label1Hand" color={labelColor.alternative} style={styles.sign}>
            -카피바라-
          </Text>
        </View>
      </Animated.View>
      <View style={styles.footer}>{footer}</View>
    </View>
  );
}

const V = restSceneSize.vintage;

const styles = StyleSheet.create({
  exit: { justifyContent: "center", paddingHorizontal: space.xl, gap: space.xl2 },
  // 장면 위 크림빛 한 겹 — 어둡게 덮지 않는다(시스템 창처럼 읽혔다)
  veil: { backgroundColor: withAlpha(restScene.veil, restMoodSize.veilOpacity) },
  wrap: { alignSelf: "stretch" },
  footer: { height: V.pill + V.depth, alignSelf: "stretch" },
  note: {
    paddingTop: space.lg,
    paddingBottom: space.sm,
    paddingHorizontal: space.md,
    gap: space.md,
    borderRadius: radius.large,
    backgroundColor: restMood.paper,
    borderWidth: V.stroke,
    borderColor: restScene.ink,
  },
  // 쪽지 아래 단단한 그림자 — 빈티지 버튼 · 걱정상자 쪽지와 같은 결(번지지 않는다)
  shadow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: V.depth,
    bottom: -V.depth,
    borderRadius: radius.large,
    backgroundColor: restScene.shadow,
  },
  sign: { textAlign: "right" },
});
