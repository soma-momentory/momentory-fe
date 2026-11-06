import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { restCards } from "@/design/ds";
import { PAPER_OUTLINE } from "@/features/home/ui/v2/HomeStickers";

const { color, size } = restCards;

/**
 * 바람카드 화면의 종이 한 장 — 홈 메모와 같은 손으로 오린 윤곽이다. 둥근 카드 · 안쪽 칸을 쓰지 않는다.
 * 내용만큼 자라고 윤곽이 그 크기로 늘어난다.
 */
export function RestPaperSheet({
  tilt,
  decoration,
  style,
  testID,
  children,
}: {
  tilt?: string;
  /** 종이 위에 놓이는 문구(클립 · 압정) */
  decoration?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}) {
  return (
    <View
      testID={testID}
      style={[styles.sheet, tilt != null ? { transform: [{ rotate: tilt }] } : null, style]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        <Svg width="100%" height="100%" viewBox="0 0 172 111" preserveAspectRatio="none">
          <Path d={PAPER_OUTLINE} transform="translate(0 1)" fill={color.shadow} opacity={0.08} />
          <Path
            d={PAPER_OUTLINE}
            fill={color.paper}
            stroke={color.edge}
            strokeWidth={1.4}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
      </View>
      {children}
      {decoration}
    </View>
  );
}

/** 쪽지를 위에서 집은 쑥색 종이 클립 */
export function RestPaperClip() {
  const clip = size.clip;
  return (
    <View
      testID="rest-card-clip"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.decoration, { top: clip.top, left: clip.left }]}
    >
      <Svg width={clip.width} height={clip.height} viewBox="0 0 22 48">
        <Path
          d="M16.5 12 V34 a7 7 0 0 1 -14 0 V9 a5.2 5.2 0 0 1 10.4 0 V32 a2.4 2.4 0 0 1 -4.8 0 V12"
          fill="none"
          stroke={color.clip}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/** 달력을 가운데 위에 꽂은 꿀색 압정 */
export function RestPaperPin() {
  const pin = size.pin;
  return (
    <View
      testID="rest-calendar-pin"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.decoration, styles.pinSeat, { top: pin.top }]}
    >
      <Svg width={pin.size} height={pin.size} viewBox="0 0 26 26">
        <Circle cx={13} cy={14.5} r={9} fill={color.shadow} opacity={0.12} />
        <Circle cx={13} cy={13} r={9} fill={color.pin} stroke={color.ink} strokeWidth={1.4} />
        <Circle cx={10} cy={10} r={2.4} fill={color.pinShine} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: size.sheetPaddingX,
    paddingTop: size.sheetPaddingTop,
    paddingBottom: size.sheetPaddingBottom,
  },
  decoration: { position: "absolute" },
  pinSeat: { left: 0, right: 0, alignItems: "center" },
});
