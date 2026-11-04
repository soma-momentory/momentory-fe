import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { meditation, meditationMotion } from "@/design/ds";
import type { MeditationConceptId } from "@/features/rest/model/meditation";

const ART: Record<MeditationConceptId, number> = {
  wave: require("../../../../assets/meditation/wave.webp"),
  forest: require("../../../../assets/meditation/forest.webp"),
  sunlight: require("../../../../assets/meditation/sunlight.webp"),
  rain: require("../../../../assets/meditation/rain.webp"),
  lantern: require("../../../../assets/meditation/lantern.webp"),
};

/**
 * 3분 명상의 **풍경 한 장** — 화면 전체를 채우고 움직이지 않는다(`DESIGN.md` 「쉼 콘텐츠 공통 규칙」 1).
 * 움직임이 없어 「동작 줄이기」 설정에도 그대로다. 풍경을 고르면 겹쳐 바뀐다.
 */
export function MeditationScene({ concept }: { concept: MeditationConceptId }) {
  return (
    <View
      testID={`meditation-scene-${concept}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: meditation.scene[concept] }]}
    >
      <Image
        source={ART[concept]}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={meditationMotion.sceneSwap}
      />
    </View>
  );
}
