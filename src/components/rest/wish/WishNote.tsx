import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { MaskingTape } from "@/components/ds";
import { wishScene } from "@/design/ds";

const M = wishScene.memo;

/**
 * 소원이 적힌 메모지 — 홈 · 일기 종이와 같은 판판한 면에 체크 테이프를 붙인다.
 *
 * 종이와 테이프만 기울이고 글과 버튼은 곧게 둔다. 통째로 기울이면 iOS 가 둥근 테두리의 가장자리를
 * 다듬지 않아 버튼이 계단처럼 보였다.
 */
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
    <View style={[styles.note, style]}>
      <View style={[styles.paper, { transform: [{ rotate: `${tilt}deg` }] }]}>
        <View style={styles.tape}>
          <MaskingTape color={M.tape} stripeColor={M.tapeStripe} />
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { position: "absolute", left: M.side, right: M.side },
  paper: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  },
});
