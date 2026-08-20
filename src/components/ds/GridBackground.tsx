import { StyleSheet } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

import { grid } from "@/design/ds";

/**
 * 배경 격자 — **32px 정격자**(`DESIGN.md` §5).
 *
 * **기기 프레임에 고정되고 스크롤과 무관하다.** 그래서 스크롤 컨테이너 안이 아니라
 * 화면 바닥(`Screen`)에 깔린다 — 격자가 콘텐츠를 따라 움직이면 종이가 아니라
 * 무늬가 된다.
 *
 * 콘텐츠 카드는 **불투명 Elevated 면**이라 격자 위에 올라간다(`DESIGN.md` §5) —
 * 카드에 반투명 배경을 주면 격자가 비쳐 글자가 읽기 어려워진다.
 *
 * 웹은 인라인 SVG `<pattern>` 이고 RN 도 `react-native-svg` 의 `Pattern` 을 그대로 쓴다.
 */
export function GridBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="mmt-grid" width={grid.size} height={grid.size} patternUnits="userSpaceOnUse">
          {/* 칸의 오른쪽·아래 두 변만 그린다 — 네 변을 다 그리면 선이 겹쳐 두 배로 진해진다 */}
          <Path
            d={`M ${grid.size} 0 L 0 0 0 ${grid.size}`}
            fill="none"
            stroke={grid.stroke}
            strokeWidth={1}
          />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#mmt-grid)" />
    </Svg>
  );
}
