import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { pond, pondScene, restScene } from "@/design/ds";
import type { SensePointKind } from "@/features/rest/model/sensePond";

const ICON = {
  eye: require("../../../../assets/sensory-pond/eye.webp"),
  sound: require("../../../../assets/sensory-pond/sound.webp"),
  hand: require("../../../../assets/sensory-pond/hand.webp"),
};

/** 감각마다의 색 — 표의 테두리 · 셈 알약이 함께 쓴다 */
export const SENSE_COLOR: Record<SensePointKind, string> = {
  eye: pond.markLine,
  sound: pond.markSound,
  hand: pond.markHand,
};

/** 감각 표 하나 — 크림빛 원에 그림을 얹는다. 글이 함께 말하므로 낭독기에는 읽히지 않는다 */
export function SenseMark({ kind, size }: { kind: SensePointKind; size: number }) {
  const icon = size * pondScene.mark.icon;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: SENSE_COLOR[kind],
        },
      ]}
    >
      <Image source={ICON[kind]} style={{ width: icon, height: icon }} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: restScene.surface,
    borderWidth: pondScene.mark.stroke,
    shadowColor: pondScene.mark.shadow,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: pondScene.mark.depth },
    elevation: 2,
  },
});
