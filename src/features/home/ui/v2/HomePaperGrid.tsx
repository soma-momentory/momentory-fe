import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { homeV2 } from "@/design/ds";

/**
 * 홈 v2 의 **모눈 종이** — 22px 칸(시안 `PaperGrid`). 장식이라 낭독기에서 숨고 손짓을 받지 않는다.
 *
 * 바닥 면(`paper`)과 선을 함께 그린다. `TabScreen` 이 깔아 둔 그라디언트 위를 **body 안에서 덮는다**
 * (계획 §2.6 — 새 prop 없이 먼저 시도하는 안). 탭바 뒤까지 잇는 일은 P3 에서 실기기로 보고 고른다.
 * 크기는 스스로 잰다 — 부르는 쪽이 화면 크기를 넘기지 않는다.
 */
export function HomePaperGrid() {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const step = homeV2.size.grid;

  return (
    <View
      testID="home-v2-grid"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.fill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height },
        );
      }}
    >
      {box.width > 0 ? (
        <Svg width={box.width} height={box.height}>
          {Array.from({ length: Math.ceil(box.width / step) + 1 }, (_, i) => (
            <Line
              key={`v${i}`}
              x1={i * step}
              y1={0}
              x2={i * step}
              y2={box.height}
              stroke={homeV2.color.grid}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: Math.ceil(box.height / step) + 1 }, (_, i) => (
            <Line
              key={`h${i}`}
              x1={0}
              y1={i * step}
              x2={box.width}
              y2={i * step}
              stroke={homeV2.color.grid}
              strokeWidth={1}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: homeV2.color.paper },
});
