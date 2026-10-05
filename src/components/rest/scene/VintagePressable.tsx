import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { restScene, restSceneSize } from "@/design/ds";

/**
 * 쉼터 안의 **빈티지 버튼 면** (2026-10-05 · 사용자 레퍼런스).
 *
 * 두꺼운 잉크 외곽선(`restSceneSize.vintage.stroke`) 아래로 **번지지 않는 단단한
 * 그림자**(`depth`)가 깔린다. 그림자는 테두리와 같은 갈색에서 한 톤만 부드럽다
 * (`restScene.shadow`). 누르면 면이 그 깊이만큼 꾹 내려앉아 그림자를 덮는다 —
 * 종이 스티커나 오래된 장난감 버튼을 누르는 손맛이다. 꺼지면 빛바랜 면과 옅은 잉크로
 * 바뀌고 내려앉지 않는다(면과 선 둘 다로 꺼졌다고 말한다).
 *
 * 모양(알약 · 카드 · 원)과 안의 내용은 부르는 쪽이 정한다 — 여기는 면 · 선 · 그림자 ·
 * 눌림만 안다(`SceneChrome` 의 버튼 · 뒤로가기 원 · 걱정상자 선택지).
 */
type Props = {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  /** 면 색 — 기본은 크림(`restScene.surface`) */
  face?: string;
  radius: number;
  /** 면의 크기 · 안쪽 배치(높이 · 패딩 · 정렬) */
  faceStyle?: StyleProp<ViewStyle>;
  /** 바깥 자리(절대 배치 등) */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const V = restSceneSize.vintage;

export function VintagePressable({
  children,
  onPress,
  accessibilityLabel,
  disabled = false,
  face = restScene.surface,
  radius,
  faceStyle,
  style,
  testID,
}: Props) {
  const ink = disabled ? restScene.mutedInk : restScene.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.outer, style]}
    >
      {({ pressed }) => (
        <>
          {/* 단단한 그림자 — 면과 같은 모양이 깊이만큼 아래에 깔린다 */}
          <View
            style={[
              styles.shadow,
              {
                borderRadius: radius,
                backgroundColor: disabled ? restScene.mutedShadow : restScene.shadow,
              },
            ]}
          />
          <View
            style={[
              styles.face,
              {
                borderRadius: radius,
                borderColor: ink,
                backgroundColor: disabled ? restScene.mutedFace : face,
                transform: [{ translateY: pressed && !disabled ? V.depth : 0 }],
              },
              faceStyle,
            ]}
          >
            {children}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 그림자 깊이만큼 아래 자리를 비워 둔다 — 눌린 면이 옆 것과 겹치지 않게
  outer: { paddingBottom: V.depth },
  shadow: { position: "absolute", left: 0, right: 0, top: V.depth, bottom: 0 },
  face: { borderWidth: V.stroke },
});
