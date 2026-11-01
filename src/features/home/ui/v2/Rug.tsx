import Svg, { Path } from "react-native-svg";

import { homeV2 } from "@/design/ds";

const OUTLINE =
  "M3 33 C2 22 19 13 40 9 C63 3 84 2 103 3 " +
  "C128 2 150 7 170 13 C186 18 198 25 197 36 " +
  "C196 48 180 54 158 59 C135 64 110 65 88 63 " +
  "C65 63 44 59 27 53 C12 49 4 42 3 33 Z";

/** 바바 발밑의 연노랑 단색 타원형 러그. */
export function Rug() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 66" fill="none">
      <Path
        d={OUTLINE}
        fill={homeV2.color.rugYellow}
        stroke={homeV2.color.rugEdge}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
