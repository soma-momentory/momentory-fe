import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/**
 * 땅에 깔리는 옅은 그림자 — 가운데가 짙고 가장자리로 사라지는 납작한 타원(`DESIGN.md`
 * 「쉼 콘텐츠 공통 규칙」 1). 카피바라와 물건 밑에 깔아 땅에 앉아 보이게 한다.
 * `id` 는 장면 안에서 겹치지 않아야 한다(SVG 그라디언트 이름).
 */
export function GroundShadow({
  id,
  width,
  height,
  color,
  opacity,
  style,
}: {
  id: string;
  width: number;
  height: number;
  color: string;
  opacity: number;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[{ position: "absolute", width, height }, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2}
          ry={height / 2}
          fill={`url(#${id})`}
        />
      </Svg>
    </View>
  );
}
