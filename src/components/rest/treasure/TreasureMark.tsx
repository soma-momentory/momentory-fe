import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import Svg, { Path } from "react-native-svg";

import { treasureBox } from "@/design/ds";
import type { TreasureMarkName } from "@/features/rest/model/treasureBox";

/**
 * 보물 카드의 작은 표식 — 별 · 하트 · 새싹 (2026-10-05). 이모지는 iOS · 안드로이드에서 모양이
 * 달라 코드로 그린다. 어느 표식인지는 순서가 정한다(`markAt`). 장식이라 낭독기에 읽히지 않는다.
 */
const PATHS: Record<TreasureMarkName, string> = {
  star: "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z",
  heart:
    "M12 20.5s-8-4.9-8-10.6C4 7 6 5 8.5 5c1.5 0 2.8.8 3.5 2 .7-1.2 2-2 3.5-2C18 5 20 7 20 9.9c0 5.7-8 10.6-8 10.6z",
  sprout:
    "M11.2 21v-7.3C7 13.6 4 11 4 6.5c4.3 0 7 2.4 7.2 6V12c.4-4 3.3-6.8 8.3-6.8 0 4.8-3 7.4-6.9 7.6V21z",
};

const FILL: Record<TreasureMarkName, string> = {
  star: treasureBox.star,
  heart: treasureBox.heart,
  sprout: treasureBox.sprout,
};

export function TreasureMark({ name, size }: { name: TreasureMarkName; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorativeAccessibilityProps}>
      <Path d={PATHS[name]} fill={FILL[name]} />
    </Svg>
  );
}
