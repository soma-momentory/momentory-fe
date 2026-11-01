import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { homeV2 } from "@/design/ds";

import { MaskingTape } from "./MaskingTape";
import { Text, useEffectiveFontScale } from "./Text";

/** Home weekday proportions, shared by the archive month and report date range. */
export function NotchedTapeLabel({
  children,
  style,
  fontScale,
  testID,
}: {
  children: string;
  style?: StyleProp<ViewStyle>;
  fontScale?: number;
  testID?: string;
}) {
  const effectiveScale = useEffectiveFontScale();
  const scale = fontScale ?? effectiveScale;
  return (
    <View
      testID={testID}
      style={[
        styles.tape,
        { minWidth: 65 * scale, minHeight: 27 + Math.max(0, 24 * (scale - 1)) },
        style,
      ]}
    >
      <MaskingTape color={homeV2.color.weekday} edge="notched" />
      <Text style={styles.text} color={homeV2.color.ink}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tape: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: homeV2.font.regular, ...homeV2.type.weekday, flexShrink: 1 },
});
