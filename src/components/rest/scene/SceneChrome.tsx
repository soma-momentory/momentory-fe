import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon, type IconName, Text } from "@/components/ds";
import { radius, restScene, restSceneSize, space, withAlpha } from "@/design/ds";

import { VintagePressable } from "./VintagePressable";

/**
 * 쉼터 **장면 위 부품** — 그림이 화면을 채우는 쉼 콘텐츠가 함께 쓴다 (2026-10-05).
 *
 * 감각연못 · 몸에 힘 빼기 · 걱정상자가 같은 뒤로가기 원과, 노을·숲 그림 위에 녹는
 * 크림 알약 · 크림 카드를 쓴다. 셋째가 생기면서 화면마다 따로 들던 것을 여기로 꺼냈다.
 */

const BACK = restSceneSize.back;
const V = restSceneSize.vintage;

/** 왼쪽 위 원형 뒤로가기 — `top` 은 안전 영역을 더한 자리. 빈티지 버튼 결의 작은 원이다 */
export function SceneBackButton({ top, onPress }: { top: number; onPress: () => void }) {
  return (
    <VintagePressable
      accessibilityLabel="뒤로"
      onPress={onPress}
      radius={BACK / 2}
      style={[styles.back, { top }]}
      faceStyle={styles.backFace}
    >
      <Icon name="arrow-left" size={20} color={restScene.ink} />
    </VintagePressable>
  );
}

/**
 * 오른쪽 위 원 — 뒤로가기 원과 마주 서서 그 쉼터의 지난 기록으로 간다(보물함의 「지난 보물」 ·
 * 쉼터마다의 이용 기록 · 2026-10-08).
 */
export function SceneCornerButton({
  top,
  onPress,
  label,
  icon,
}: {
  top: number;
  onPress: () => void;
  label: string;
  icon: IconName;
}) {
  return (
    <VintagePressable
      accessibilityLabel={label}
      onPress={onPress}
      radius={BACK / 2}
      style={[styles.back, styles.corner, { top }]}
      faceStyle={styles.backFace}
    >
      <Icon name={icon} size={20} color={restScene.ink} />
    </VintagePressable>
  );
}

/** 뒤로가기 원 아래에서 글이 시작하도록 — 위 여백 계산에 쓴다 */
export const SCENE_BACK_SIZE = BACK + V.depth;

/**
 * 장면 위의 버튼 — **빈티지 알약** (2026-10-05 · 사용자 레퍼런스). 두꺼운 잉크 외곽선과
 * 단단한 그림자로 그림 위에서도 「누르는 것」으로 또렷하게 읽힌다. 처음의 반투명 크림
 * 알약(외곽선 없음)은 장면에 묻혔다.
 *
 * `accent` 는 크림 카드 **바로 아래** 서는 주 행동이다 — 카드와 같은 크림이면 둘이 한
 * 덩어리로 읽혀서(걱정상자) 꿀빛 면으로 둔다(`restScene.accent`).
 *
 * `compact` 는 낮은 알약이다 — 아래 판이 장면의 주인공을 가리지 않아야 할 때(걱정상자 쓰기).
 */
export function ScenePillButton({
  label,
  onPress,
  disabled,
  tone = "plain",
  compact = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "plain" | "accent";
  compact?: boolean;
}) {
  return (
    <VintagePressable
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      face={tone === "accent" ? restScene.accent : restScene.surface}
      radius={radius.full}
      // 부모가 가운데 정렬이어도 폭을 다 쓴다 — 글자 폭으로 줄면 글자가 버튼 밖으로 넘쳤다
      style={styles.pillOuter}
      faceStyle={[styles.pill, compact ? styles.pillCompact : null]}
    >
      <Text variant="headline1" color={disabled ? restScene.mutedInk : restScene.ink}>
        {label}
      </Text>
    </VintagePressable>
  );
}

/** 장면 위의 정보 카드 — 결이 잔 그림 위에서도 글이 흐려지지 않게 반투명 크림 면을 둔다 */
export function SceneCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  back: { position: "absolute", left: space.lg, width: BACK },
  corner: { left: undefined, right: space.lg },
  backFace: { height: BACK, alignItems: "center", justifyContent: "center" },
  pillOuter: { alignSelf: "stretch" },
  pill: { height: V.pill, alignItems: "center", justifyContent: "center" },
  pillCompact: { height: V.pillCompact },
  card: {
    backgroundColor: withAlpha(restScene.surface, restSceneSize.cardOpacity),
    borderRadius: radius.xlarge,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    gap: space.md,
  },
});
