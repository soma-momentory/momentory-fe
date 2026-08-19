import { useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import {
  background,
  fontFamily,
  hairline,
  label as labelColor,
  primary,
  radius,
  size,
  space,
  text,
} from "@/design/ds";

import { Text } from "./Text";

/**
 * 한 줄·여러 줄 입력 — `design.md` §7.
 *
 * | 항목       | 값                                                              |
 * | ---------- | --------------------------------------------------------------- |
 * | 높이       | large 52 / medium 48 · 여러 줄은 최대 3줄 뒤 내부 스크롤        |
 * | radius     | 12 (`pill` 변형은 Full — 온보딩 답장·마이 수정)                 |
 * | 면         | Elevated + `line.alternative` hairline                          |
 * | 포커스     | **`primary` 1px**                                               |
 * | 플레이스홀더 | `label.assistive` · **Regular 400**                            |
 *
 * ## 입력값은 Regular 400 이다
 *
 * 본문 기본은 Medium 500 이지만 **입력값·플레이스홀더는 Regular** 다(`design.md` §2).
 * 그래서 여기서 `body1Reading`(16/26 400)을 쓴다 — `body1`(500)을 쓰면 입력칸만
 * 본문보다 무거워진다.
 *
 * ## 오류를 모달로 띄우지 않는다
 *
 * `helper` 한 줄로 흡수한다(`RULES.md` 4) — 아이콘·붉은 점멸·재시도 버튼을 붙이지 않는다.
 * 상한이 있는 입력은 `showCounter` 로 **카운터만** 둔다. 상한에 닿아도 문구를 띄우지
 * 않는다 — 더 입력되지 않는다는 사실은 카운터가 이미 말한다.
 */
type Props = Omit<TextInputProps, "style"> & {
  /** 입력 위 라벨. 없으면 두지 않는다 — 말풍선이 이미 물었을 때가 그렇다 */
  fieldLabel?: string;
  /** 아래 한 줄 안내. 오류도 여기로 흡수한다 */
  helper?: string;
  /** `maxLength` 와 함께 `n/max` 를 보인다 */
  showCounter?: boolean;
  /** 기본 `large`(52). `pill` 은 radius Full · 패딩 11/18 */
  variant?: "large" | "medium" | "pill";
};

export function TextField({
  fieldLabel,
  helper,
  showCounter = false,
  variant = "large",
  multiline = false,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const value = typeof rest.value === "string" ? rest.value : "";

  return (
    <View style={styles.wrap}>
      {fieldLabel != null ? (
        <Text variant="label1" color={labelColor.neutral}>
          {fieldLabel}
        </Text>
      ) : null}

      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={labelColor.assistive}
        selectionColor={primary.normal}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          VARIANT[variant],
          // 여러 줄은 높이를 고정하지 않는다 — 3줄까지 늘고 그 뒤 내부 스크롤(§7)
          multiline ? styles.multiline : null,
          focused ? styles.focused : null,
        ]}
      />

      {helper != null || showCounter ? (
        <View style={styles.foot}>
          {helper != null ? (
            <Text variant="caption1" color={labelColor.alternative} style={styles.helper}>
              {helper}
            </Text>
          ) : null}
          {showCounter && rest.maxLength != null ? (
            <Text variant="caption1" color={labelColor.alternative}>
              {`${value.length}/${rest.maxLength}`}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const VARIANT = {
  large: { minHeight: size.input.large, borderRadius: radius.medium },
  medium: { minHeight: size.input.medium, borderRadius: radius.medium },
  // 입력 pill — 패딩 11/18 · radius Full (`design.md` §7)
  pill: {
    minHeight: size.input.medium,
    borderRadius: radius.full,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
} as const;

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  input: {
    backgroundColor: background.elevated,
    paddingHorizontal: space.lg,
    // 입력값은 Regular 400 — 본문(500)과 다르다
    fontFamily: fontFamily.regular,
    fontSize: text.body1Reading.fontSize,
    lineHeight: text.body1Reading.lineHeight,
    color: labelColor.normal,
    ...hairline.alternative,
  },
  // 3줄 = lineHeight 26 × 3 + 상하 패딩
  multiline: { maxHeight: text.body1Reading.lineHeight * size.input.maxLines + space.xl2 },
  // 포커스는 테두리 색·두께로만 말한다 — 링을 겹쳐 그리지 않는다
  focused: { borderWidth: 1, borderColor: primary.normal },
  foot: { flexDirection: "row", alignItems: "center", gap: space.sm },
  helper: { flex: 1 },
});
