import { useId, useState, type ReactNode } from "react";
import {
  Image,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Stop } from "react-native-svg";

import { Text } from "@/components/ds";
import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import { space } from "@/design/ds";
import { diaryMemo } from "@/design/ds/diaryMemo";

/**
 * 일기 확인(`C6`)의 메모지 두 장 — 일기 한 장 · 그날 일정 한 장. 값의 정본은 `ds/diaryMemo.ts`.
 *
 * 종이 결은 **구운 타일**을 반복해 깐다(`scripts/make-memo-paper.py`) — RN 에는 시안이 쓴
 * SVG 엠보싱 필터도 곱하기 블렌드도 없다.
 *
 * ⚠ 반복은 **종이 크기를 재서 타일을 바둑판으로 직접 깐다** — `Image` 의 `resizeMode="repeat"` 는
 * 실기기(안드로이드)에서 타일 한 장만 왼쪽 위에 붙고 나머지가 민무늬로 남았다(2026-10-07).
 * 긴 일기도 타일 수십 장이라 가볍다.
 */
type Tone = "diary" | "schedule";

const PAPER = {
  diary: require("../../../assets/diary/memo-paper-ivory.png"),
  schedule: require("../../../assets/diary/memo-paper-lemon.png"),
} as const;

export function MemoPaper({
  tone,
  style,
  children,
}: {
  tone: Tone;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const tile = diaryMemo.paperTile;
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (size?.width !== width || size?.height !== height) setSize({ width, height });
  };
  const cols = size != null ? Math.ceil(size.width / tile) : 0;
  const rows = size != null ? Math.ceil(size.height / tile) : 0;

  return (
    <View
      style={[styles.paper, { backgroundColor: diaryMemo[tone].paper }, style]}
      onLayout={onLayout}
    >
      {/* 모서리를 따라 결을 자르는 틀 — 종이 자체는 자르지 않는다(테이프가 위로 걸쳐 나간다) */}
      <View
        style={styles.grain}
        pointerEvents="none"
        accessible={false}
        {...decorativeAccessibilityProps}
      >
        {Array.from({ length: rows * cols }, (_, i) => (
          <Image
            key={i}
            source={PAPER[tone]}
            style={{
              position: "absolute",
              left: (i % cols) * tile,
              top: Math.floor(i / cols) * tile,
              width: tile,
              height: tile,
            }}
          />
        ))}
      </View>
      {children}
    </View>
  );
}

/**
 * 제목을 적은 테이프 한 조각. 양 끝은 손으로 뜯은 듯 들쭉날쭉하고, 위쪽에 광택 · 결 방향의
 * 가는 섬유가 있다. **불투명 · 그림자 없음 · 주름 없음**(시안에서 하나씩 뺐다).
 *
 * 폭은 글자가 정한다 — 글자를 먼저 깔고, 잰 크기로 테이프 면을 뒤에 그린다.
 */
export function MemoTape({
  tone,
  label,
  seed = 1,
  style,
}: {
  tone: Tone;
  label: string;
  /** 찢긴 모양을 고르는 수 — 같은 화면의 두 테이프가 똑같이 찢기지 않게 */
  seed?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  // 그라디언트·패턴 id 가 한 화면의 두 테이프 사이에서 겹치지 않게
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (size?.width !== width || size?.height !== height) setSize({ width, height });
  };

  return (
    <View style={[styles.tape, style]} onLayout={onLayout}>
      {size != null ? (
        <Svg
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
          accessible={false}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id={`sheen${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={diaryMemo.tapeSheen} stopOpacity={0.34} />
              <Stop offset="0.22" stopColor={diaryMemo.tapeSheen} stopOpacity={0.1} />
              <Stop offset="0.52" stopColor={diaryMemo.tapeSheen} stopOpacity={0} />
              <Stop offset="1" stopColor={diaryMemo.tapeShade} stopOpacity={0.07} />
            </LinearGradient>
            <Pattern id={`fiber${id}`} width={3} height={4} patternUnits="userSpaceOnUse">
              <Rect width={1} height={4} fill={diaryMemo.tapeSheen} opacity={0.08} />
            </Pattern>
          </Defs>
          <Path d={tornPath(size.width, size.height, seed)} fill={diaryMemo[tone].tape} />
          <Path d={tornPath(size.width, size.height, seed)} fill={`url(#sheen${id})`} />
          <Path d={tornPath(size.width, size.height, seed)} fill={`url(#fiber${id})`} />
        </Svg>
      ) : null}
      <Text variant="tapeHand" color={diaryMemo[tone].tapeInk} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** 위아래 변은 곧고 양 끝만 잘게 들쭉날쭉한 띠. 같은 `seed` 면 늘 같은 모양이다 */
function tornPath(width: number, height: number, seed: number): string {
  let x = seed * 9973;
  const next = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  const steps = 11;
  const depth = diaryMemo.tornDepth;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i++) {
    left.push(`${(next() * depth).toFixed(1)} ${((i / steps) * height).toFixed(1)}`);
  }
  for (let i = steps; i >= 0; i--) {
    right.push(`${(width - next() * depth).toFixed(1)} ${((i / steps) * height).toFixed(1)}`);
  }
  return `M ${left.join(" L ")} L ${right.join(" L ")} Z`;
}

const styles = StyleSheet.create({
  paper: {
    borderRadius: diaryMemo.radius,
    boxShadow: diaryMemo.paperShadow,
  },
  grain: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: diaryMemo.radius,
    overflow: "hidden",
  },
  tape: {
    alignSelf: "flex-start",
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    transform: [{ rotate: diaryMemo.tapeTilt }],
  },
});
