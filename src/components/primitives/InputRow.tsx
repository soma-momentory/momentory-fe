import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { clearButton, inputRow } from "@/design/tokens.mvp";

/**
 * 한 줄 입력. `momentory.css` `.tfield` — `04` 닉네임 · `05-b` 나이.
 *
 * - **포커스는 `.tfieldOn` 규칙으로만 둔다**(`04.md`) — primaryDeep 테두리 +
 *   3px 링. 상태를 화면으로 그리지 않는다.
 * - **카운터는 상한이 있는 입력에만** 붙는다(`showCounter`). 상한에 닿으면 더
 *   입력되지 않고 **오류 문구 없이 카운터 색만** 바뀐다(`04.md` · `06-c.md`) —
 *   막힌 이유는 글자 수 표시가 이미 말하고 있다.
 * - **값이 들어가면 지우기 × 가 붙는다**(`onClear` 전달 시) — 시각 19px ·
 *   히트 44(hitSlop). "선택을 되돌릴 길이 없으면 선택이 아니다"(`05-b.md`).
 */
type Props = Omit<TextInputProps, "style"> & {
  /** 지금은 쓰지 않지만 08 시간 선택이 탭으로 열릴 자리 */
  onPress?: () => void;
  /** `maxLength` 와 함께 `n/max` 카운터를 보인다 (`04` 닉네임 · 기타 입력) */
  showCounter?: boolean;
  /** 값이 있을 때 지우기 × 를 보인다 (`05-b` 나이) */
  onClear?: () => void;
};

export function InputRow({ onPress, showCounter, onClear, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const value = typeof rest.value === "string" ? rest.value : "";
  const atLimit = rest.maxLength != null && value.length >= rest.maxLength;

  return (
    <View style={styles.wrap}>
      {/* .tfieldOn 의 box-shadow 3px 링 — RN 은 spread 를 못 그려 바깥 테두리로 만든다 */}
      {focused ? <View pointerEvents="none" style={styles.ring} /> : null}
      <View style={[styles.row, focused ? styles.rowOn : null]}>
        <TextInput
          placeholderTextColor={theme.colors.semantic.textSlogan}
          // 입력 자체가 답이라 라벨을 따로 두지 않는다 — 위 말풍선이 이미 물었다.
          // 낭독기에는 placeholder 가 그 역할을 한다.
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={styles.input}
        />

        {showCounter && rest.maxLength != null ? (
          <AppText
            variant="footnote"
            // 상한 도달은 색만 바뀐다 — 오류 문구·아이콘을 만들지 않는다 (04.md)
            tone={atLimit ? "accent" : "caption"}
            style={styles.counter}
          >
            {`${value.length}/${rest.maxLength}`}
          </AppText>
        ) : null}

        {onClear && value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="지우기"
            hitSlop={clearButton.hitSlop}
            onPress={onClear}
            style={styles.clear}
          >
            <AppText tone="body" style={styles.clearMark}>
              ×
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  wrap: { justifyContent: "center" },
  ring: {
    position: "absolute",
    top: -inputRow.focus.ringWidth,
    bottom: -inputRow.focus.ringWidth,
    left: -inputRow.focus.ringWidth,
    right: -inputRow.focus.ringWidth,
    borderRadius: inputRow.radius + inputRow.focus.ringWidth,
    borderWidth: inputRow.focus.ringWidth,
    borderColor: inputRow.focus.ring,
  },
  row: {
    height: inputRow.height,
    borderRadius: inputRow.radius,
    backgroundColor: semantic.surface,
    borderWidth: inputRow.borderWidth,
    borderColor: inputRow.border,
    paddingHorizontal: inputRow.paddingHorizontal,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowOn: { borderColor: inputRow.focus.border },
  input: {
    flex: 1,
    fontFamily: "Pretendard-Regular",
    fontSize: inputRow.fontSize,
    color: semantic.textPrimary,
    // Android 는 TextInput 에 기본 padding 이 붙어 세로 가운데가 어긋난다
    padding: 0,
  },
  counter: { fontVariant: ["tabular-nums"] },
  clear: {
    width: clearButton.size,
    height: clearButton.size,
    borderRadius: clearButton.size / 2,
    backgroundColor: clearButton.background,
    alignItems: "center",
    justifyContent: "center",
  },
  clearMark: { fontSize: 12, lineHeight: 14 },
});
