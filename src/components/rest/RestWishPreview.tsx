import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { homeV2, restThemeCard } from "@/design/ds";

import { REST_WISH_SCENE } from "./restThemes";

/**
 * 바람카드 칸 오른쪽의 **작은 카드 미리보기** — 콘텐츠 칸의 그림과 같은 자리다.
 * 실제 카드 내용을 보여 주지 않는 그림이라 낭독기에는 읽히지 않는다(글 줄은 빈 줄이다).
 */
export function RestWishPreview() {
  return (
    <View
      testID="rest-wish-preview"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.seat}
    >
      <View style={[styles.sheet, styles.back]} />
      <View style={[styles.sheet, styles.front]}>
        <Image
          source={REST_WISH_SCENE.scene}
          style={styles.scene}
          contentFit="cover"
          contentPosition={{ top: REST_WISH_SCENE.position }}
        />
        <View style={[styles.line, styles.lineLong]} />
        <View style={[styles.line, styles.lineShort]} />
        <View style={styles.tape}>
          <MaskingTape color={colors.tapeBase} stripeColor={colors.tapeStripe} />
        </View>
      </View>
    </View>
  );
}

const colors = homeV2.color;
const preview = restThemeCard.wish.preview;

const styles = StyleSheet.create({
  seat: {
    width: preview.seatWidth,
    height: preview.seatHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    position: "absolute",
    width: preview.width,
    height: preview.height,
    borderRadius: preview.radius,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
  },
  back: { backgroundColor: colors.date, transform: [{ rotate: preview.backTilt }] },
  front: {
    backgroundColor: colors.white,
    padding: preview.padding,
    transform: [{ rotate: preview.frontTilt }],
  },
  scene: { height: preview.sceneHeight, borderRadius: preview.sceneRadius },
  line: {
    height: preview.lineHeight,
    marginTop: preview.lineGap,
    borderRadius: preview.lineHeight / 2,
    backgroundColor: colors.emptyBorder,
  },
  lineLong: { width: "86%" },
  lineShort: { width: "56%" },
  tape: {
    position: "absolute",
    alignSelf: "center",
    top: preview.tapeTop,
    width: preview.tapeWidth,
    height: preview.tapeHeight,
  },
});
