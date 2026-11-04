import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, space, wishScene } from "@/design/ds";

const BABA = require("../../../../assets/home/v2/baba-composite.png");
const A = wishScene.avatar;

/** 쓴 사람 줄 — 익명이라 모두 같은 기본 바바다 */
export function WishAuthorRow({ name }: { name: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Image source={BABA} contentFit="contain" transition={0} style={styles.image} />
      </View>
      <Text variant="label1Hand" color={labelColor.alternative}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  avatar: {
    width: A.size,
    height: A.size,
    borderRadius: A.size / 2,
    overflow: "hidden",
    backgroundColor: A.face,
  },
  image: {
    position: "absolute",
    width: A.image,
    height: A.image * 1.4,
    left: (A.size - A.image) / 2,
    top: 0,
  },
});
