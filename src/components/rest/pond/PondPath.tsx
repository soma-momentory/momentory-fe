import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { pondScene, pondSceneMotion } from "@/design/ds";

import { artPoint, artScale } from "./layout";
import { useReducedMotion } from "./useReducedMotion";
import { useWave, waveRange } from "./wave";

const ART = {
  pad1: require("../../../../assets/sensory-pond/pad-1.webp"),
  pad2: require("../../../../assets/sensory-pond/pad-2.webp"),
  pad3: require("../../../../assets/sensory-pond/pad-3.webp"),
  bloom: require("../../../../assets/sensory-pond/bloom.webp"),
};
const PADS = ["pad1", "pad2", "pad3"] as const;

/** 물에 뜬 한 장 — 천천히 위아래로 흔들린다. 장마다 시작을 어긋내 같이 움직이지 않게 한다 */
function FloatingPad({
  art,
  x,
  y,
  width,
  phase,
  still,
  landed = 0,
  dip,
}: {
  art: keyof typeof ART;
  x: number;
  y: number;
  width: number;
  phase: number;
  still: boolean;
  /** 바바가 이 연잎으로 뛰어올 때마다 오른다 — 내려앉는 순간 물에 조금 잠겼다 떠오른다 */
  landed?: number;
  dip?: number;
}) {
  const bob = useWave(pondSceneMotion.bob, still);
  const [press] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (landed === 0) return;
    const it = Animated.sequence([
      Animated.delay(pondSceneMotion.padDip.after),
      Animated.timing(press, {
        toValue: 1,
        duration: pondSceneMotion.padDip.down,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(press, { toValue: 0, friction: 4, tension: 26, useNativeDriver: true }),
    ]);
    it.start();
    return () => it.stop();
  }, [landed, press]);

  const height = width / pondScene.artRatio[art];
  const lift = waveRange(0, -3, phase);
  const sway = waveRange(0, 1.4, phase);
  return (
    <Animated.View
      style={[
        styles.pad,
        {
          left: x - width / 2,
          top: y - height / 2,
          width,
          height,
          transform: [
            { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, dip ?? 0] }) },
            { translateY: bob.interpolate(lift) },
            {
              rotate: bob.interpolate({
                inputRange: sway.inputRange,
                outputRange: sway.outputRange.map((d) => `${d}deg`),
              }),
            },
          ],
        },
      ]}
    >
      <Image source={ART[art]} style={styles.fill} contentFit="contain" />
    </Animated.View>
  );
}

/** 끝 화면의 연꽃 연잎 — 마지막 연잎 자리에서 피어난다. 연잎보다 커서 아래 장을 덮는다 */
function BloomPad({ x, y, width, still }: { x: number; y: number; width: number; still: boolean }) {
  const [open] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(open, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
  }, [open]);
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: open.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
          transformOrigin: [x, y, 0],
          transform: [{ scale: open.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
        },
      ]}
    >
      <FloatingPad art="bloom" x={x} y={y} width={width} phase={0} still={still} />
    </Animated.View>
  );
}

/**
 * 연잎 길 일곱 장 — 처음부터 다 보여 준다(바바가 건너갈 길이 한눈에 보이게). 끝 화면에서는 마지막
 * 한 장 위로 연꽃 연잎이 피어난다. 장식이라 낭독기에 읽히지 않고 손짓도 받지 않는다.
 */
export function PondPath({
  width,
  height,
  finished,
  landingPad,
  landed,
}: {
  width: number;
  height: number;
  finished: boolean;
  /** 바바가 지금 뛰어가는 연잎 — 그 장만 내려앉을 때 잠긴다 */
  landingPad: number;
  landed: number;
}) {
  const reduced = useReducedMotion();
  const k = artScale(width, height);
  const end = pondScene.path[pondScene.path.length - 1]!;
  const endAt = artPoint(end.x, end.y, width, height);
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {pondScene.path.map((pad, i) => {
        const at = artPoint(pad.x, pad.y, width, height);
        const small = i % 3 === 2 ? pondScene.pad.smallScale : 1;
        return (
          <FloatingPad
            key={i}
            art={PADS[i % 3]!}
            x={at.x}
            y={at.y}
            width={pondScene.pad.width * pad.scale * small * k}
            phase={(i * 0.37) % 1}
            still={reduced}
            landed={i === landingPad ? landed : 0}
            dip={pondScene.padDip * pad.scale * k}
          />
        );
      })}
      {finished ? (
        <BloomPad x={endAt.x} y={endAt.y} width={pondScene.bloom.width * k} still={reduced} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { position: "absolute" },
  fill: { width: "100%", height: "100%" },
});
