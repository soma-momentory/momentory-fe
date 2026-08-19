import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AppText } from "@/components/primitives/AppText";
import {
  paperColors,
  paperEmotionColor,
  paperEmotions,
  paperRadius,
  paperReport,
  paperTypography,
} from "@/design/paper";
import type { EmotionId } from "@/features/emotion/model/emotion";
import type { WeekDay } from "@/features/report/model/report";

/**
 * `W1` · 주간 감정 도넛 (`docs/design/prototype/리포트.dc.html` ·
 * `docs/design/app-flow.md` §2.6).
 *
 * 그 주에 기록한 감정을 **비율로 한 번에** 보여준다 — 막대가 아니라 고리다.
 * 상위 다섯만 그리고(그 아래는 조각이 읽히지 않는다) 나머지 반올림 오차는
 * 마지막 조각이 흡수한다. 기록이 없는 주는 **빈 화면이 아니라 빈 고리**다 —
 * 비어 있는 것은 문제가 아니라 아직 담기지 않은 자리다.
 *
 * **색만으로 판단하게 하지 않는다**(`RULES.md`) — 가운데에 초점 감정의 **이름**이
 * 늘 적혀 있고, 범례 칩도 점·이름·면·테두리를 함께 바꾼다.
 */
export const MAX_SLICES = 5;

export type EmotionSlice = {
  id: EmotionId;
  name: string;
  color: string;
  /** 그 주 감정 기록 중 차지하는 비율(%) — 반올림이라 합이 100 이 아닐 수 있다 */
  percent: number;
};

/** 감정 이름의 정본은 팔레트 한 곳이다 — 화면이 `find` 를 다시 쓰지 않는다 */
const emotionName = (id: EmotionId) => paperEmotions.find((e) => e.id === id)?.name ?? "";

/**
 * 그 주 감정 상위 다섯 — **요일 칸이 세는 것과 같은 값**이다(하루 최대 3개).
 * 「감정 기록 N개」와 분모가 어긋나면 같은 화면이 두 수를 말하게 된다.
 */
export function topWeekEmotions(days: readonly WeekDay[]): EmotionSlice[] {
  const counts = new Map<EmotionId, number>();
  for (const day of days) {
    for (const id of day.emotions) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((n, v) => n + v, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SLICES)
    .map(([id, n]) => ({
      id,
      name: emotionName(id),
      color: paperEmotionColor(id),
      percent: Math.round((n / total) * 100),
    }));
}

const SIZE = paperReport.donut;
const THICKNESS = (paperReport.donut - paperReport.hole) / 2;
const RADIUS = (SIZE - THICKNESS) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** 12시부터 시계 방향으로 — svg 의 0° 는 3시다 */
const START_ANGLE = -90;

export function EmotionDonut({
  slices,
  focus,
}: {
  slices: readonly EmotionSlice[];
  /** 범례에서 고른 조각. 범위를 벗어나면 첫 조각으로 떨어진다 */
  focus: number;
}) {
  const picked = slices[Math.min(focus, slices.length - 1)];

  // 상위 다섯 밖의 나머지와 반올림 오차는 **마지막 조각이 흡수한다** — 고리에
  // 틈을 두면 없는 감정이 하나 더 있는 것처럼 읽힌다(시안과 같은 처리).
  // 그래서 조각의 길이보다 **가운데·범례의 숫자**가 정확한 값이다
  let start = 0;
  const arcs = slices.map((slice, i) => {
    const from = start;
    const to = i === slices.length - 1 ? 100 : Math.min(100, start + slice.percent);
    start = to;
    return { slice, from, length: Math.max(0, to - from) };
  });

  return (
    <View
      style={styles.donut}
      accessibilityRole="image"
      accessibilityLabel={
        picked == null
          ? "이 주에 기록한 감정이 없어요"
          : `주간 감정 비율 · ${slices.map((s) => `${s.name} ${s.percent}%`).join(", ")}`
      }
    >
      <Svg width={SIZE} height={SIZE}>
        {picked == null ? (
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={paperReport.emptyRing}
            strokeWidth={THICKNESS}
            fill="none"
          />
        ) : (
          arcs.map(({ slice, from, length }) => (
            <Circle
              key={slice.id}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={slice.color}
              strokeWidth={THICKNESS}
              fill="none"
              strokeDasharray={`${(CIRCUMFERENCE * length) / 100} ${CIRCUMFERENCE}`}
              originX={SIZE / 2}
              originY={SIZE / 2}
              rotation={START_ANGLE + (from * 360) / 100}
            />
          ))
        )}
      </Svg>

      {/* 가운데는 초점 감정의 이름과 비율 — 고리만 보고 색을 세지 않게 한다 */}
      <View style={styles.center} pointerEvents="none">
        <AppText weight="700" style={styles.focusName}>
          {picked?.name ?? "기록 없음"}
        </AppText>
        {picked == null ? null : (
          <AppText style={styles.focusPercent}>{`${picked.percent}%`}</AppText>
        )}
      </View>
    </View>
  );
}

/**
 * 범례 칩 — 누르면 도넛 가운데가 그 감정으로 바뀐다(`app-flow.md` §2.6).
 *
 * **선택을 색만으로 표시하지 않는다** — 고른 칩은 면이 밝아지고 테두리가 서고
 * 이름이 굵어진다(`RULES.md` · `PLAN.md` §3-1).
 */
export function EmotionLegend({
  slices,
  focus,
  onFocus,
}: {
  slices: readonly EmotionSlice[];
  focus: number;
  onFocus: (index: number) => void;
}) {
  return (
    <View style={styles.legend}>
      {slices.map((slice, i) => {
        const on = i === Math.min(focus, slices.length - 1);
        return (
          <Pressable
            key={slice.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${slice.name} ${slice.percent}%`}
            // 칩 높이가 30 이라 44 를 hitSlop 으로 채운다 (RULES 「접근성」)
            hitSlop={{ top: 7, bottom: 7 }}
            onPress={() => onFocus(i)}
            style={[styles.chip, on ? styles.chipOn : null]}
          >
            <View style={[styles.dot, { backgroundColor: slice.color }]} />
            <AppText weight={on ? "700" : "400"} style={styles.chipLabel}>
              {slice.name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  donut: { width: SIZE, height: SIZE, alignSelf: "center", justifyContent: "center" },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  focusName: {
    fontSize: type.sheetTitle.fontSize,
    lineHeight: type.sheetTitle.lineHeight,
    color: paperColors.text.primary,
  },
  // 「필수 정보」라 장식용 muted 가 아니라 green 이다 (paper.ts 대비 주석)
  focusPercent: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    color: paperColors.text.green,
  },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: paperRadius.chip,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  chipOn: {
    backgroundColor: paperColors.bg.cardSoft,
    borderColor: paperColors.brand.greenBorder,
  },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  chipLabel: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    color: paperColors.text.primary,
  },
});
