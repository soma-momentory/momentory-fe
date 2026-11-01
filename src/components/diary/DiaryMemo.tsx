import { useState, type ReactNode } from "react";
import {
  Image,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { Text } from "@/components/ds";
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
        importantForAccessibility="no-hide-descendants"
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

/** 제목 폭에 맞는 단색 테이프. 홈에서 정한 뜯긴 윤곽을 공유한다. */
export function MemoTape({
  tone,
  label,
  style,
}: {
  tone: Tone;
  label: string;
  /** 기존 호출부와의 호환용. 윤곽은 공통 모양으로 통일한다. */
  seed?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tape, style]}>
      <MaskingTape color={diaryMemo[tone].tape} />
      <Text variant="tapeHand" color={diaryMemo[tone].tapeInk}>
        {label}
      </Text>
    </View>
  );
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
