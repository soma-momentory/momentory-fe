import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { ScenePillButton } from "@/components/rest/scene/SceneChrome";
import { meditation, meditationSize, radius, restScene, restSceneSize, space } from "@/design/ds";
import { MEDITATION_STOP } from "@/features/rest/model/meditation";

const V = restSceneSize.vintage;

/**
 * 멈춤 확인 — 멈춤 원과 화면의 뒤로가기 원이 함께 띄운다. 떠 있는 동안 시간은 멈춰 있고, 일찍 멈춰도
 * 실패로 말하지 않는다.
 */
export function MeditationStopConfirm({
  onResume,
  onStop,
}: {
  onResume: () => void;
  onStop: () => void;
}) {
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.dim]}>
      <View style={styles.wrap}>
        <View style={styles.shadow} />
        <View accessibilityRole="alert" style={styles.card}>
          <Text variant="title3Hand" color={restScene.ink} style={styles.mid}>
            {MEDITATION_STOP.title}
          </Text>
          <Text variant="body1" color={meditation.caption} style={styles.mid}>
            {MEDITATION_STOP.description}
          </Text>
          <View style={styles.actions}>
            <ScenePillButton tone="accent" label={MEDITATION_STOP.resume} onPress={onResume} />
            <ScenePillButton label={MEDITATION_STOP.stop} onPress={onStop} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl2,
    backgroundColor: meditation.dimAsk,
  },
  // alignSelf: "stretch" 를 두면 maxWidth 에 걸리는 넓은 화면에서 카드가 왼쪽에 붙는다
  wrap: { maxWidth: meditationSize.stopCard, width: "100%" },
  shadow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: V.depth,
    bottom: -V.depth,
    borderRadius: radius.xlarge,
    backgroundColor: restScene.shadow,
  },
  card: {
    paddingTop: space.xl3,
    paddingBottom: space.xl,
    paddingHorizontal: space.xl,
    gap: space.sm,
    borderRadius: radius.xlarge,
    borderWidth: V.stroke,
    borderColor: restScene.ink,
    backgroundColor: restScene.surface,
  },
  mid: { textAlign: "center" },
  actions: { marginTop: space.lg, gap: space.md },
});
