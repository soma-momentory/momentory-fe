import { useId } from "react";
import Svg, { Defs, Path, Pattern } from "react-native-svg";

import { homeV2 } from "@/design/ds";

// 반지름 30인 원 네 개를 44 간격으로 겹친 실제 원호 윤곽.
const OUTLINE =
  "M52 9.604 A30 30 0 0 1 96 9.604 A30 30 0 0 1 140 9.604 " +
  "A30 30 0 1 1 140 50.396 A30 30 0 0 1 96 50.396 " +
  "A30 30 0 0 1 52 50.396 A30 30 0 1 1 52 9.604 Z";

/** 원 네 개가 겹쳐 이어진 모양의 체크 스티커. */
export function ScallopedSticker({ color }: { color: string }) {
  const gridId = `cta-grid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Svg width="100%" height="100%" viewBox="-2 -2 196 64" preserveAspectRatio="none">
      <Defs>
        <Pattern id={gridId} patternUnits="userSpaceOnUse" width={12} height={12}>
          <Path
            d="M0 12 V0 H12"
            fill="none"
            stroke={homeV2.color.white}
            strokeOpacity={0.18}
            strokeWidth={0.7}
          />
        </Pattern>
      </Defs>
      <Path d={OUTLINE} transform="translate(0 2)" fill={homeV2.color.shadow} opacity={0.1} />
      <Path testID="home-v2-cta-shape" d={OUTLINE} fill={color} />
      <Path d={OUTLINE} fill={`url(#${gridId})`} />
    </Svg>
  );
}
