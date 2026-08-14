import { StyleSheet, View, type ViewProps } from "react-native";
import Svg, { Ellipse } from "react-native-svg";

import { paperColors, paperHill } from "@/design/paper";

/**
 * 곡선 언덕 — 섹션 전환 장식 (`docs/design/design-system.md` §3).
 *
 * 프로토타입의 `border-radius:50% 50% 0 0 / 100% 100% 0 0`, 폭 140%(좌 -20%),
 * 높이 54~64 를 26~34 컨테이너로 잘라 쓰는 규칙을 svg 타원으로 옮겼다.
 *
 * 이 컴포넌트는 **곡선 캡만** 그린다 — 이어지는 언덕 면은 화면이 같은 색
 * View 로 바로 아래에 잇는다 (캡과 면 사이에 틈을 만들지 않도록 gap 0).
 */
type Props = Omit<ViewProps, "children"> & {
  color?: string;
  /** 잘라 쓰는 높이 — sm 26 · md 30 · lg 34. px 직접 지정도 받는다 */
  height?: keyof typeof paperHill.height | number;
};

export function Hill({ color = paperColors.bg.hill, height = "md", style, ...rest }: Props) {
  const h = typeof height === "number" ? height : paperHill.height[height];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...rest}
      style={[styles.crop, { height: h }, style]}
    >
      <Svg
        style={styles.curve}
        viewBox={`0 0 100 ${paperHill.curveHeight}`}
        preserveAspectRatio="none"
      >
        <Ellipse
          cx={50}
          cy={paperHill.curveHeight}
          rx={50}
          ry={paperHill.curveHeight}
          fill={color}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  crop: { overflow: "hidden" },
  // 화면보다 넓게 그려 곡률을 완만하게 만든다 — 프로토타입의 left:-20% · width:140%
  curve: {
    position: "absolute",
    left: "-20%",
    width: "140%",
    height: paperHill.curveHeight,
  },
});
