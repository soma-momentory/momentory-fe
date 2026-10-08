import Svg, { Circle, G, Line, Path } from "react-native-svg";

import { restMood } from "@/design/ds";
import type { RestMood } from "@/features/rest/model/restRecord";

/**
 * 기분 표식 — 나아졌어요는 해, 그대로예요는 무난한 얼굴, 잘 모르겠어요는 구름 (2026-10-08 ·
 * 사용자 요청). 아이콘 세트에 없는 그림이라 코드로 그린다(`TreasureMark` 와 같은 판단).
 * 쪽지와 기록 화면이 같은 표식을 쓴다. `mood` 가 없으면 「잠깐 들렀어요」의 빈 동그라미다.
 * 장식이라 낭독기에 읽히지 않는다 — 곁의 글이 대신 말한다.
 */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

export function MoodMark({ mood, size }: { mood: RestMood | null; size: number }) {
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
        <G>
          <Circle cx={12} cy={12} r={9.5} fill={restMood.face} />
          <Circle cx={8.8} cy={10.4} r={1.2} fill={restMood.faceInk} />
          <Circle cx={15.2} cy={10.4} r={1.2} fill={restMood.faceInk} />
          <Line
            x1={9}
            y1={15.2}
            x2={15}
            y2={15.2}
            stroke={restMood.faceInk}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </G>
      ) : mood === "unsure" ? (
        <Path
          d="M7 18.5h10.2a4.2 4.2 0 0 0 .5-8.4A5.6 5.6 0 0 0 7 9.4a4.6 4.6 0 0 0 0 9.1z"
          fill={restMood.cloud}
        />
      ) : (
        <Circle cx={12} cy={12} r={6} fill="none" stroke={restMood.visit} strokeWidth={2} />
      )}
    </Svg>
  );
}
