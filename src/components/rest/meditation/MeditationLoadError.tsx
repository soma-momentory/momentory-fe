import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Text } from "@/components/ds";
import { AlertMark } from "@/components/rest/meditation/MeditationMarks";
import { ScenePillButton } from "@/components/rest/scene/SceneChrome";
import { VintagePressable } from "@/components/rest/scene/VintagePressable";
import {
  meditation,
  meditationLayout,
  meditationSize,
  radius,
  restScene,
  restSceneSize,
  space,
} from "@/design/ds";
import { MEDITATION_LOAD_ERROR, type MeditationConcept } from "@/features/rest/model/meditation";

const BACK = restSceneSize.back;

/**
 * 음성 로딩 실패 (Design 시안 「음성 로딩 실패」) — 다시 시도하거나 자막만으로 시작한다. ✕ 는 준비 화면으로
 * 돌아간다. 풍경과 이름은 그대로 두어 어디에 있는지 잃지 않는다.
 */
export function MeditationLoadError({
  concept,
  onRetry,
  onCaptions,
  onClose,
}: {
  concept: MeditationConcept;
  onRetry: () => void;
  onCaptions: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const top = insets.top + space.sm;
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.title, { paddingTop: top + meditationLayout.titleBelowTop }]}>
        <Text variant="meditationName" color={meditation.onScene} style={styles.onScene}>
          {concept.name}
        </Text>
        <Text variant="meditationSub" color={meditation.onSceneSub} style={styles.onScene}>
          {concept.sub}
        </Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
        <View accessibilityRole="alert" style={styles.card}>
          <AlertMark size={meditationSize.alertGlyph} color={restScene.ink} />
          <View style={styles.cardText}>
            <Text variant="headline1" color={restScene.ink}>
              {MEDITATION_LOAD_ERROR.title}
            </Text>
            <Text variant="body2" color={meditation.caption}>
              {MEDITATION_LOAD_ERROR.description}
            </Text>
          </View>
        </View>
        <ScenePillButton tone="accent" label={MEDITATION_LOAD_ERROR.retry} onPress={onRetry} />
        <ScenePillButton compact label={MEDITATION_LOAD_ERROR.captions} onPress={onCaptions} />
      </View>

      <VintagePressable
        accessibilityLabel="닫기"
        onPress={onClose}
        radius={BACK / 2}
        style={[styles.close, { top }]}
        faceStyle={styles.closeFace}
      >
        <Icon name="close" size={20} color={restScene.ink} />
      </VintagePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { alignItems: "center", gap: space.xs, paddingHorizontal: space.xl3 },
  onScene: {
    textAlign: "center",
    textShadowColor: meditation.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  bottom: {
    flex: 1,
    justifyContent: "flex-end",
    gap: meditationLayout.errorGap,
    paddingHorizontal: space.xl,
  },
  card: {
    flexDirection: "row",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xlarge,
    backgroundColor: meditation.alertFace,
  },
  cardText: { flex: 1, gap: space.xs },
  close: { position: "absolute", right: space.lg, width: BACK },
  closeFace: { height: BACK, alignItems: "center", justifyContent: "center" },
});
