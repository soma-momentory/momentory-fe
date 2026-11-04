import Svg, { Circle, Path, Rect } from "react-native-svg";

import type { MeditationConceptId } from "@/features/rest/model/meditation";

/**
 * 3분 명상의 **그림 표식** — Design 시안의 글리프를 그대로 옮겼다. Wanted 세트에 없는 풍경 다섯과 재생
 * 조작이라 `MoodMark` 처럼 이 화면 몫으로 그린다.
 */
const CONCEPT_PATHS: Record<MeditationConceptId, readonly string[]> = {
  wave: [
    "M3 8c2 0 2-1.5 4.5-1.5S10 8 12 8s2-1.5 4.5-1.5S19 8 21 8",
    "M3 13c2 0 2-1.5 4.5-1.5S10 13 12 13s2-1.5 4.5-1.5S19 13 21 13",
    "M3 18c2 0 2-1.5 4.5-1.5S10 18 12 18s2-1.5 4.5-1.5S19 18 21 18",
  ],
  forest: ["M12 3l-5 7h3l-4 6h12l-4-6h3z", "M12 16v5"],
  sunlight: [
    "M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4",
  ],
  rain: [
    "M7 14a4 4 0 0 1-.6-7.95A5 5 0 0 1 16 5.5a4 4 0 0 1 1 8.5H7z",
    "M8 17.5l-1 2.5M12 17.5l-1 2.5M16 17.5l-1 2.5",
  ],
  lantern: [
    "M12 3c2.5 3 4 4.8 4 7.2a4 4 0 0 1-8 0c0-1.7 1-2.8 2-3.9.3 1.4 1 2.2 2 2.4-.4-2 .2-3.9 0-5.7z",
    "M5 20l14-4M5 16l14 4",
  ],
};

/** 고른 풍경은 선이 굵어진다 — 면 색만으로 말하지 않는다 */
export function ConceptMark({
  concept,
  size,
  color,
  picked,
}: {
  concept: MeditationConceptId;
  size: number;
  color: string;
  picked: boolean;
}) {
  const line = {
    fill: "none",
    stroke: color,
    strokeWidth: picked ? 2.6 : 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {concept === "sunlight" ? <Circle cx={12} cy={12} r={4} {...line} /> : null}
      {CONCEPT_PATHS[concept].map((d) => (
        <Path key={d} d={d} {...line} />
      ))}
    </Svg>
  );
}

export function PauseMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9 6v12M15 6v12"
        fill="none"
        stroke={color}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlayMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 5.5v13l10.5-6.5z"
        fill={color}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StopMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6.5} y={6.5} width={11} height={11} rx={2.5} fill={color} />
    </Svg>
  );
}

/** 말하는 사람 — 음성 안내 원. 꺼지면 사선이 그어진다 */
export function VoiceMark({ size, color, off }: { size: number; color: string; off: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={9} cy={8} r={3.5} fill="none" stroke={color} strokeWidth={2.2} />
      <Path
        d={`M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a4 4 0 0 1 0 5M19 3a8 8 0 0 1 0 10${off ? "M3 3l18 18" : ""}`}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 음성 로딩 실패 카드의 느낌표 */
export function AlertMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 7.5v5.5M12 16.5h.01"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
