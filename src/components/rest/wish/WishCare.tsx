import { Image } from "expo-image";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ds";
import { ScenePillButton } from "@/components/rest/scene/SceneChrome";
import { label as labelColor, radius, restScene, space, wishScene } from "@/design/ds";
import { WISH_CARE, WISH_PILL } from "@/features/rest/model/wish";

const IVORY = require("../../../../assets/backgrounds/warm-ivory.png");
const BABA = require("../../../../assets/home/v2/baba-composite.png");

/** 위기 표현이 걸렸을 때 — 글을 띄우지 않고 저장하지도 않는다. 번호마다 눌러서 건다 */
export function WishCare({ onLeave }: { onLeave: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={IVORY} contentFit="cover" transition={0} style={StyleSheet.absoluteFill} />
      <View style={[styles.body, { paddingTop: insets.top + space.xl4 }]}>
        <Text variant="title1Hand" color={restScene.ink} style={styles.center}>
          {WISH_CARE.title}
        </Text>
        <Text variant="body1" color={labelColor.normal} style={styles.center}>
          {WISH_CARE.body}
        </Text>
        <Image source={BABA} contentFit="contain" transition={0} style={styles.baba} />
        <View style={styles.lines}>
          {WISH_CARE.lines.map((line, i) => (
            <Pressable
              key={line.number}
              accessibilityRole="link"
              accessibilityLabel={`${line.label} ${line.number} ${WISH_CARE.call}`}
              onPress={() => void Linking.openURL(`tel:${line.number}`)}
              style={[styles.line, i === 0 && styles.lineMain]}
            >
              <Text variant="label1" color={labelColor.strong} style={styles.lineLabel}>
                {line.label}
              </Text>
              <Text variant="headline1" color={labelColor.strong}>
                {line.number}
              </Text>
              <Text variant="caption1" color={labelColor.strong}>
                {WISH_CARE.call}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.foot, { bottom: Math.max(insets.bottom, space.md) + space.md }]}>
        <ScenePillButton label={WISH_PILL.leave} onPress={onLeave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.xl, gap: space.md },
  center: { textAlign: "center" },
  baba: { width: 88, height: 112, alignSelf: "center" },
  lines: { backgroundColor: wishScene.memo.paper, borderRadius: radius.medium, padding: space.sm },
  line: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    gap: space.sm,
    paddingHorizontal: space.sm,
    borderTopWidth: 1,
    borderTopColor: wishScene.line,
  },
  lineMain: { backgroundColor: wishScene.careFace, borderRadius: radius.medium, borderTopWidth: 0 },
  lineLabel: { flex: 1 },
  foot: { position: "absolute", left: space.xl, right: space.xl },
});
