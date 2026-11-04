import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { MaskingTape } from "@/components/ds";
import { wishScene } from "@/design/ds";

const M = wishScene.memo;

/** 소원이 적힌 메모지 — 홈 · 일기 종이와 같은 판판한 면에 체크 테이프를 붙인다 */
export function WishNote({
  children,
  tilt = -1,
  style,
}: {
  children: ReactNode;
  /** 살짝 기운 각도(도) */
  tilt?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.note, { transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <View style={styles.tape}>
        <MaskingTape color={M.tape} stripeColor={M.tapeStripe} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    position: "absolute",
    left: M.side,
    right: M.side,
    backgroundColor: M.paper,
    borderRadius: M.radius,
    shadowColor: M.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 9,
    shadowOffset: { width: 3, height: 8 },
    elevation: 6,
  },
  tape: {
    position: "absolute",
    alignSelf: "center",
    top: -M.tapeHeight / 2,
    width: M.tapeWidth,
    height: M.tapeHeight,
    transform: [{ rotate: "-1.5deg" }],
    zIndex: 2,
  },
});
