import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { homeV2 } from "@/design/ds";

/** Fixed 22px notebook surface shared by the v2 tab screens. */
export function V2PaperGrid({ testID }: { testID?: string }) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const step = homeV2.size.grid;

  return (
    <View
      testID={testID}
      pointerEvents="none"
      {...decorativeAccessibilityProps}
      style={styles.fill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((previous) =>
          previous.width === width && previous.height === height ? previous : { width, height },
        );
      }}
    >
      {box.width > 0 ? (
        <Svg width={box.width} height={box.height}>
          {Array.from({ length: Math.ceil(box.width / step) + 1 }, (_, index) => (
            <Line
              key={`v${index}`}
              x1={index * step}
              y1={0}
              x2={index * step}
              y2={box.height}
              stroke={homeV2.color.grid}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: Math.ceil(box.height / step) + 1 }, (_, index) => (
            <Line
              key={`h${index}`}
              x1={0}
              y1={index * step}
              x2={box.width}
              y2={index * step}
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
