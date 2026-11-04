import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { useReducedMotion } from "@/components/rest/pond/useReducedMotion";
import { useWave, waveRange } from "@/components/rest/pond/wave";
import { wishScene, wishSceneMotion } from "@/design/ds";

export const WISH_FLOWER = require("../../../../assets/wish/flower.webp");
const GLOW = require("../../../../assets/wish/glow.webp");

const GLOW_OPACITY = { none: 0, soft: 0.55, bright: 1 } as const;

/**
 * 물 위에 뜬 연꽃 한 송이 — 감각연못 연꽃의 꽃을 밤색 잎에 얹은 그림이다.
 *
 * 빛은 번진 그림을 뒤에 깐다. 안드로이드는 투명 그림에 그림자가 지지 않아 같은 빛을 낼 수 없었다.
 */
export function WishFlower({
  x,
  y,
  width,
  glow = "soft",
  still = false,
  onPress,
  label,
  pop = 0,
}: {
  /** 꽃 가운데 — 지금 화면의 자리 */
  x: number;
  y: number;
  width: number;
  glow?: keyof typeof GLOW_OPACITY;
  still?: boolean;
  onPress?: () => void;
  label?: string;
  /** 값이 오를 때마다 꽃이 한 번 튕긴다 — 같이 빈 순간 */
  pop?: number;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (pop === 0) return;
    scale.setValue(0.72);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }).start();
  }, [pop, scale]);
  const reduced = useReducedMotion();
  const wave = useWave(wishSceneMotion.bob, reduced || still);
  const height = width * wishScene.flowerAspect;
  const glowSize = width * 1.7;
  const translateY = wave.interpolate(waveRange(0, -wishSceneMotion.bobHeight, (x % 7) / 7));

  const body = (
    <>
      <Image
        source={GLOW}
        contentFit="contain"
        transition={0}
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            left: (width - glowSize) / 2,
            top: (height - glowSize) / 2,
            opacity: GLOW_OPACITY[glow],
          },
        ]}
      />
      <Image source={WISH_FLOWER} contentFit="contain" transition={0} style={{ width, height }} />
    </>
  );

  return (
    <Animated.View
      style={[
        styles.flower,
        { left: x - width / 2, top: y - height / 2, transform: [{ translateY }, { scale }] },
      ]}
    >
      {onPress != null ? (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
          {body}
        </Pressable>
      ) : (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {body}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flower: { position: "absolute" },
  glow: { position: "absolute" },
});
