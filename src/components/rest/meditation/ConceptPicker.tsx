import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { VintagePressable } from "@/components/rest/scene/VintagePressable";
import { meditation, meditationSize, restScene, space } from "@/design/ds";
import { MEDITATION_CONCEPTS, type MeditationConceptId } from "@/features/rest/model/meditation";

import { ConceptMark } from "./MeditationMarks";

/**
 * 풍경 고르기 — 동그라미 다섯이 가로로 선다. 누르면 배경과 이름이 바로 바뀐다. 고른 칸은 꿀빛 면 ·
 * 굵은 선 · 밝은 이름이다. 좁은 화면에서는 칸이 함께 줄고 이름은 두 줄까지 접힌다.
 */
export function ConceptPicker({
  value,
  onChange,
}: {
  value: MeditationConceptId;
  onChange: (id: MeditationConceptId) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="쉼 고르기" style={styles.row}>
      {MEDITATION_CONCEPTS.map((c) => {
        const picked = c.id === value;
        return (
          <View key={c.id} style={styles.cell}>
            <VintagePressable
              accessibilityLabel={c.name}
              selected={picked}
              onPress={() => onChange(c.id)}
              face={picked ? restScene.accent : restScene.surface}
              radius={meditationSize.conceptCircle / 2}
              style={styles.circle}
              faceStyle={styles.face}
            >
              <ConceptMark
                concept={c.id}
                size={meditationSize.conceptGlyph}
                color={restScene.ink}
                picked={picked}
              />
            </VintagePressable>
            <Pressable
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              onPress={() => onChange(c.id)}
            >
              <Text
                variant="label1"
                color={picked ? meditation.onScenePicked : meditation.onScene}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.name}
              >
                {c.name}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xs,
    paddingHorizontal: space.xs,
  },
  cell: {
    flex: 1,
    maxWidth: meditationSize.conceptCell,
    alignItems: "center",
    gap: space.sm,
  },
  circle: { width: meditationSize.conceptCircle },
  face: {
    height: meditationSize.conceptCircle,
    alignItems: "center",
    justifyContent: "center",
  },
  // 칸보다 조금 넓게 — 「비 오는 창가」가 낱말 가운데서 접히지 않게. 옆 이름은 짧아 닿지 않는다
  name: {
    width: meditationSize.conceptLabel,
    textAlign: "center",
    textShadowColor: meditation.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
