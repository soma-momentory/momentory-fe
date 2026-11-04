import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, Text } from "@/components/ds";
import { label as labelColor, primary, radius, space, wishScene } from "@/design/ds";
import { WISH_RULES } from "@/features/rest/model/wish";
import { openExternalLink } from "@/lib/links";

const BABA = require("../../../../assets/home/v2/baba-composite.png");

/** 소원 연못 이용 규칙 — 첫 소원 전에 한 번. 공개되는 글이라 건너뛸 수 없다 */
export function WishRules({ onAgree, onLater }: { onAgree: () => void; onLater: () => void }) {
  return (
    <View style={styles.dim}>
      <View style={styles.card}>
        <Image source={BABA} contentFit="contain" transition={0} style={styles.baba} />
        <Text variant="title3" color={labelColor.strong} style={styles.title}>
          {WISH_RULES.title}
        </Text>
        <View style={styles.items}>
          {WISH_RULES.items.map((item) => (
            <View key={item} style={styles.item}>
              <View style={styles.dot} />
              <Text variant="body2" color={labelColor.normal} style={styles.itemText}>
                {item}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => void openExternalLink("terms")}
          style={styles.more}
        >
          <Text variant="label1" color={primary.heavy}>
            {`${WISH_RULES.more} ›`}
          </Text>
        </Pressable>
        <Button label={WISH_RULES.agree} onPress={onAgree} fill />
        <Pressable accessibilityRole="button" onPress={onLater} style={styles.more}>
          <Text variant="label1" color={labelColor.alternative}>
            {WISH_RULES.later}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: wishScene.rulesDim,
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  card: {
    backgroundColor: wishScene.memo.paper,
    borderRadius: radius.xlarge,
    padding: space.xl,
    gap: space.md,
  },
  baba: { width: 72, height: 90, alignSelf: "center" },
  title: { textAlign: "center" },
  items: { gap: space.sm },
  item: { flexDirection: "row", gap: space.sm },
  dot: {
    width: 6,
    height: 6,
    marginTop: 9,
    borderRadius: 3,
    backgroundColor: primary.heavy,
  },
  itemText: { flex: 1 },
  more: { minHeight: 44, alignItems: "center", justifyContent: "center" },
});
