import Svg, { Circle, G, Line, Path } from "react-native-svg";

import { restMood } from "@/design/ds";
import type { RestMood } from "@/features/rest/model/restRecord";

/**
 * 기분 쪽지의 표식 — 나아졌어요는 해, 그대로예요는 구름, 잘 모르겠어요는 깃털 (2026-10-08).
 * 아이콘 세트에 없는 그림이라 코드로 그린다(`TreasureMark` 와 같은 판단). 장식이라 낭독기에
 * 읽히지 않는다 — 칸의 이름이 대신 말한다.
 */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

export function MoodMark({ mood, size }: { mood: RestMood; size: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {mood === "better" ? (
        <G>
          <Circle cx={12} cy={12} r={4.6} fill={restMood.sun} />
          {RAYS.map((deg) => (
            <Line
              key={deg}
              x1={12}
              y1={4.2}
              x2={12}
              y2={2}
              stroke={restMood.sun}
              strokeWidth={1.8}
              strokeLinecap="round"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </G>
      ) : mood === "same" ? (
        <Path
          d="M7 18.5h10.2a4.2 4.2 0 0 0 .5-8.4A5.6 5.6 0 0 0 7 9.4a4.6 4.6 0 0 0 0 9.1z"
          fill={restMood.cloud}
        />
      ) : (
        <Path
          d="M20 3.5c-6.4.2-11.3 4.4-12.6 11L6 20.5l1.7-1C9.2 15.4 12 12.5 15 10.8c-2.2 2.1-4.3 4.9-5.4 8 6-1.5 9.9-7.6 10.4-15.3z"
          fill={restMood.feather}
        />
      )}
    </Svg>
  );
}
