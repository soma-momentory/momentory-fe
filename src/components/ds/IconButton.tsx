import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from "react-native";

import { interaction, label as labelColor, layout, overlay, radius } from "@/design/ds";

import { Icon, type IconName } from "./icons/Icon";

/**
 * 아이콘만 있는 버튼 — 알림 종 · 전송 · ⋮ · 월 이동(`DESIGN.md` §10).
 *
 * **히트 영역은 44 다.** 아이콘이 20~24 라도 눌리는 면은 44×44 로 잡는다
 * (`DESIGN.md` §10 「44×44 히트 영역」 · `RULES.md` 터치 최소 44).
 *
 * ⚠ **`accessibilityLabel` 이 필수다.** 글자가 없는 버튼이라 이름이 없으면
 * 낭독기에 「버튼」으로만 읽힌다. 그래서 optional 로 두지 않았다.
 */
type Props = Omit<PressableProps, "style" | "children" | "accessibilityLabel"> & {
  name: IconName;
  /** 낭독기가 읽을 이름 — 「닫기」·「알림」처럼 **행동**을 적는다 */
  accessibilityLabel: string;
  size?: 16 | 20 | 24;
  color?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

export function IconButton({
  name,
  accessibilityLabel,
  size = 24,
  color = labelColor.normal,
  disabled = false,
  accessibilityRole = "button",
  accessibilityState,
  style,
  ...rest
}: Props) {
  return (
    <Pressable
      {...rest}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      style={[styles.base, style]}
    >
      {({ pressed }) => (
        <>
          <Icon name={name} size={size} color={disabled ? interaction.inactive : color} />
          {pressed && !disabled ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  scrim: { backgroundColor: overlay.pressLight, borderRadius: radius.full },
});
