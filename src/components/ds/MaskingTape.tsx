import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

// 긴 변은 반듯하게, 짧은 양끝은 둥글고 불규칙한 뜯김으로 표현한다(2026-11-01 사용자 참고 이미지).
const MASKING_TAPE_PATH =
  "M7 2 L213 2 L209 8 Q207 10 213 13 L216 15 L213 20 Q211 23 217 26 " +
  "L214 32 Q211 36 216 39 L213 45 Q211 48 215 52 L213 57 L215 63 " +
  "L6 63 L8 57 Q9 54 5 51 L7 45 Q9 42 4 38 L6 32 Q8 29 4 26 " +
  "L6 21 Q8 18 4 15 L6 11 Q3 7 7 2 Z";

/** 홈에서 정한 두 가지 뜯긴 윤곽을 모든 탭에서 공유한다. 체크무늬는 선택 사항이다. */
export function MaskingTape({
  color,
  stripeColor,
  edge = "torn",
}: {
  color: string;
  stripeColor?: string;
  edge?: "torn" | "notched";
}) {
  const [box, setBox] = useState({ width: 65, height: 28 });
  // Keep each torn end at the home weekday's 65×28 proportions. A longer
  // date extends only the middle, rather than stretching the notches sideways.
  const notchedWidth = (box.width * 28 * 90) / (box.height * 65);
  const notchedPath = `M3 2 H${notchedWidth - 3} L${notchedWidth - 6} 9 L${notchedWidth - 2} 15 L${notchedWidth - 5} 22 L${notchedWidth - 2} 32 H3 L6 25 L2 19 L6 11 Z`;
  const path = edge === "notched" ? notchedPath : MASKING_TAPE_PATH;
  const patternId = `tape-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // Give percentage-sized native SVG a padding-free containing box; otherwise
  // Android subtracts the label's padding from the tape's painted dimensions.
  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={StyleSheet.absoluteFill}
      onLayout={
        edge === "notched"
          ? ({ nativeEvent: { layout } }) => {
              if (layout.width <= 0 || layout.height <= 0) return;
              setBox((previous) =>
                previous.width === layout.width && previous.height === layout.height
                  ? previous
                  : { width: layout.width, height: layout.height },
              );
            }
          : undefined
      }
    >
      <Svg
        testID="masking-tape"
        accessible={false}
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox={edge === "notched" ? `0 0 ${notchedWidth} 34` : "0 0 220 65"}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        {stripeColor != null ? (
          <Defs>
            <Pattern id={patternId} patternUnits="userSpaceOnUse" width={30} height={30}>
              <Rect width={15} height={30} fill={stripeColor} />
              <Rect width={30} height={15} fill={stripeColor} />
            </Pattern>
          </Defs>
        ) : null}
        <Path d={path} fill={color} />
        {stripeColor != null ? <Path d={path} fill={`url(#${patternId})`} /> : null}
      </Svg>
    </View>
  );
}
