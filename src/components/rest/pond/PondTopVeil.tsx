import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { pond, pondVeil } from "@/design/ds";

/**
 * 장면 위쪽에 까는 **빛 한 겹** — 글이 읽히게 하는 최소한 (2026-09-06).
 *
 * ## 카드가 아니라 빛이다
 *
 * 배경 일러스트의 위쪽은 밝고 잔가지가 많아 짙은 글자도 묻힌다. 흰 카드를 깔면
 * 읽히기는 하지만 「연못 안에 있다」가 곧바로 깨진다 — 상자가 하나 생기는 순간
 * 장면이 그 뒤로 물러나 배경 그림이 된다. 그래서 **면이 아니라 그라디언트**다:
 * 맨 위가 가장 짙고 아래로 가며 완전히 사라져 **경계선이 없다**(`pondVeil.stops`).
 *
 * 물에 닿기 전에 끝난다 — 높이는 장면의 `pondVeil.heightRatio`(0.42)이고 이 그림의
 * 수면은 세로 0.42 부터다. 감각 포인트와 카피바라 위로는 아무것도 덮지 않는다.
 *
 * ## 재지 않는다
 *
 * 폭·높이를 `onLayout` 으로 재지 않고 **비율(%)로만** 선다 — 부모(장면을 덮는
 * 오버레이) 위에서 높이 42% 를 차지하고 그 안을 SVG 가 100% 로 채운다. 잴 것이
 * 없으면 첫 프레임에 빈 자리도 없다.
 *
 * 장식이라 낭독기에 읽히지 않고 손짓도 받지 않는다 — 이 위를 눌러도 아래 연못의
 * 몫이다.
 */
const GRADIENT_ID = "pond-top-veil";

export function PondTopVeil() {
  return (
    <View
      testID="pond-top-veil"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.veil}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            {pondVeil.stops.map((s) => (
              <Stop
                key={s.offset}
                offset={s.offset}
                stopColor={pond.veil}
                stopOpacity={s.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${GRADIENT_ID})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  veil: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: `${pondVeil.heightRatio * 100}%`,
  },
});
