import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { homeV2 } from "@/design/ds";

/**
 * 다섯 탭이 공유하는 **홈 모눈 종이** — 22px 칸(시안 `PaperGrid`). 장식이라 낭독기에서 숨고 손짓을 받지 않는다.
 *
 * 바닥 면(`paper`)과 선을 함께 그린다. 모든 탭과 미리보기의 Screen backdrop으로 한 번만 깔아
 * 시스템 안전 영역과 상단 여백에서도 종이 색·격자 간격·시작점이 끊기지 않게 한다.
 * 크기는 스스로 잰다 — 부르는 쪽이 화면 크기를 넘기지 않는다.
 */
export function TabPaperBackground() {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const step = homeV2.size.grid;

  return (
    <View
      testID="tab-paper-background"
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
