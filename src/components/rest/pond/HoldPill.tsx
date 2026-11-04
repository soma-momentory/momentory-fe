import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

import { Text } from "@/components/ds";
import { VintagePressable } from "@/components/rest/scene/VintagePressable";
import {
  pond,
  pondScene,
  pondSceneMotion,
  radius,
  restScene,
  restSceneSize,
  withAlpha,
} from "@/design/ds";

const ACTIONS = [{ name: "activate" as const }];

/**
 * 「꾸욱 누르면서 느끼기」 — 누르는 동안 알약이 왼쪽부터 차오르고(`pondSceneMotion.hold`), 다 차면 하나를
 * 찾은 것이다. 일찍 떼면 세지 않고 알약이 한 번 흔들린다. 낭독기의 활성화는 누르기를 대신한다.
 */
export function HoldPill({
  label,
  locked,
  onHoldStart,
  onHoldCancel,
  onDone,
}: {
  label: string;
  /** 바바가 건너가는 중 — 모양은 그대로 두고 손짓만 받지 않는다 */
  locked: boolean;
  onHoldStart: () => void;
  onHoldCancel: () => void;
  onDone: () => void;
}) {
  const [fill] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  const pressIn = () => {
    if (locked) return;
    onHoldStart();
    Animated.timing(fill, {
      toValue: 1,
      duration: pondSceneMotion.hold,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      onDone();
    }, pondSceneMotion.hold);
  };

  const pressOut = () => {
    if (timer.current == null) return;
    clear();
    fill.stopAnimation();
    fill.setValue(0);
    onHoldCancel();
    const step = pondSceneMotion.miss / 4;
    Animated.sequence(
      [-5, 5, -5, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: step, useNativeDriver: true }),
      ),
    ).start();
  };

  return (
    <Animated.View style={{ transform: [{ translateX: shake }] }}>
      <VintagePressable
        accessibilityLabel={label}
        onPress={() => {}}
        face={restScene.accent}
        radius={radius.full}
        faceStyle={styles.face}
        pressable={{
          onPressIn: pressIn,
          onPressOut: pressOut,
          accessibilityActions: ACTIONS,
          onAccessibilityAction: () => {
            if (locked) return;
            clear();
            onDone();
          },
        }}
      >
        <Animated.View style={[styles.fill, { transform: [{ scaleX: fill }] }]} />
        <Text variant="headline1" color={restScene.ink}>
          {label}
        </Text>
      </VintagePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  face: {
    height: restSceneSize.vintage.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: withAlpha(pond.markHand, pondScene.holdFill),
    transformOrigin: "left",
  },
});
