import { Image } from "expo-image";
import { Animated, StyleSheet } from "react-native";

import { pondScene, pondSceneMotion } from "@/design/ds";

import { useReducedMotion } from "./useReducedMotion";
import { useWave, waveRange } from "./wave";

const LAYERS = [
  require("../../../../assets/sensory-pond/water-1.webp"),
  require("../../../../assets/sensory-pond/water-2.webp"),
  require("../../../../assets/sensory-pond/water-3.webp"),
];

/**
 * 물의 **일렁임** — 물결 선을 그린 투명 그림 세 장을 번갈아 비추고, 함께 좌우로 조금 흔든다.
 * 옛 판의 움직이는 수면(`pond-ambient.webp`)은 실사풍이라 이 그림체에 얹지 못하고, 둥근 물결은
 * 징그럽다는 의견이 있어 길쭉한 선만 쓴다. 그림 안의 물 자리에만 그려 두어 가리개가 필요 없다.
 * 움직임 줄이기가 켜져 있으면 첫 장만 가만히 보인다. 장식이라 낭독기에 읽히지 않는다.
 */
export function PondWater() {
  const reduced = useReducedMotion();
  const shine = useWave(pondSceneMotion.water, reduced);
  const sway = useWave(pondSceneMotion.waterSway, reduced);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [
            {
              // 시작을 곡선의 가운데(0.25)로 잡아 움직임 줄이기가 켜져도 제자리에 선다
              translateX: sway.interpolate(
                waveRange(-pondScene.waterSway, pondScene.waterSway, 0.25),
              ),
            },
          ],
        },
      ]}
    >
      {LAYERS.map((source, i) => (
        <Animated.View
          key={i}
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: reduced
                ? i === 0
                  ? 1
                  : 0
                : shine.interpolate(waveRange(0, 1, i / LAYERS.length)),
            },
          ]}
        >
          <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
      ))}
    </Animated.View>
  );
}
