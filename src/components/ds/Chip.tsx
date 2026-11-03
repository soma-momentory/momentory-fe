import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from "react-native";

import {
  background,
  chatChoiceSelected,
  label as labelColor,
  line,
  overlay,
  primary,
  radius,
  raised,
  selectedTint,
  size,
  space,
} from "@/design/ds";

import { Text } from "./Text";

/**
 * 칩 — `DESIGN.md` §9. **필터·선택에만 쓴다.** 정보 장식용 칩을 만들지 않는다.
 *
 * | 상태 | 스펙                                                                  |
 * | ---- | --------------------------------------------------------------------- |
 * | 기본 | Elevated 면 · `line.neutral` 1px · `label.neutral` · Full · 높이 36    |
 * | 선택 | 초록 18% 면 · **초록 2px** · `label.strong` **600**                   |
 *
 * ## 선택을 색만으로 표시하지 않는다
 *
 * `RULES.md` 「접근성」이 요구하는 것이고, 다행히 `DESIGN.md` §9 가 이미 셋을
 * 함께 바꾼다 — **면 + 테두리 두께(1→2) + 글자 굵기·색**. 셋 중 하나만 남기지 않는다.
 * 테두리 자리는 꺼져 있을 때도 잡아 둔다(2px 투명) — 켤 때 글자가 밀리지 않게.
 *
 * ## 감정 칩에는 감정색을 쓰지 않는다
 *
 * 도트·캡슐만 감정색(55% 틴트)이고 **선택 칩은 브랜드 초록으로 통일**한다
 * (`DESIGN.md` §1 · 검토 과정에서 확정). 감정색으로 선택을 표시하면 「무슨 감정인가」와
 * 「골랐는가」가 같은 채널을 쓴다.
 */
type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  /** 채팅 선택지는 테두리 변화 없이 은은한 면과 들림으로 선택을 표시한다. */
  selectedStyle?: "outlined" | "soft";
  /** 글자 크기를 덮는다 — 기본은 `label2`. 보관함 필터만 자기 값을 준다(`archiveType.chip`) */
  labelStyle?: TextStyle;
};

export function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
  style,
  selectedStyle = "outlined",
  labelStyle,
}: Props) {
  const soft = selected && selectedStyle === "soft";

  return (
    <Pressable
      accessibilityRole="button"
      // 낭독기가 「선택됨」을 읽는다 — 시각 신호 셋과 같은 것을 말한다
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        selected ? (soft ? styles.selectedSoft : styles.selected) : styles.unselected,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          <Text
            variant="label2"
            color={
              soft ? chatChoiceSelected.label : selected ? labelColor.strong : labelColor.neutral
            }
            numberOfLines={1}
            style={labelStyle}
          >
            {label}
          </Text>
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
    height: size.chip.height,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.full,
  },
  // 1px → 2px. **두께 변화가 선택 신호의 일부**라 여기서 같게 맞추지 않는다
  // (§9 · `RULES.md` 「색만으로 선택 표시 금지」). 칩 테두리는 카드의 hairline 이
  // 아니라 시안이 지정한 실선 1px 이다
  unselected: {
    backgroundColor: background.elevated,
    borderWidth: 1,
    borderColor: line.neutral,
  },
  selected: {
    backgroundColor: chatChoiceSelected.surface,
    borderWidth: size.chip.selectedBorderWidth,
    borderColor: primary.normal,
  },
  selectedSoft: {
    backgroundColor: selectedTint,
    borderWidth: 1,
    borderColor: "transparent",
    transform: [{ translateY: -1 }],
    boxShadow: `0px ${raised.depth}px ${space.sm}px ${chatChoiceSelected.shadow}`,
  },
  scrim: { backgroundColor: overlay.pressLight, borderRadius: radius.full },
});
