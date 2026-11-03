import type { ReactNode } from "react";
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
  color = homeV2.color.weekday,
  trailing,
}: {
  children: string;
  /** 글자 오른쪽에 함께 붙는 것(보관함 기간의 `›`) — 없으면 글자만 가운데에 선다 */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fontScale?: number;
  testID?: string;
  color?: string;
}) {
  const effectiveScale = useEffectiveFontScale();
  const scale = fontScale ?? effectiveScale;
  return (
    <View
      testID={testID}
      style={[
        styles.tape,
        { minWidth: 65 * scale, minHeight: 27 + Math.max(0, 24 * (scale - 1)) },
        trailing != null && styles.tapeWithTrailing,
        style,
      ]}
    >
      <MaskingTape color={color} edge="notched" />
      <Text style={styles.text} color={homeV2.color.ink}>
        {children}
      </Text>
      {/* 뷰로 감싼다 — 웹에서 맨 SVG 는 절대 배치된 테이프 아래에 깔려 보이지 않는다 */}
      {trailing != null ? <View>{trailing}</View> : null}
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
  tapeWithTrailing: { flexDirection: "row", gap: 4 },
  text: { fontFamily: homeV2.font.regular, ...homeV2.type.weekday, flexShrink: 1 },
});
