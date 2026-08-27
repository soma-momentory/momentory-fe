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

import { IconButton } from "./IconButton";
import { singleLineInput } from "./singleLineInput";
import { Text } from "./Text";

/**
 * 한 줄·여러 줄 입력 — `DESIGN.md` §7.
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
 * 본문 기본은 Medium 500 이지만 **입력값·플레이스홀더는 Regular** 다(`DESIGN.md` §2).
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
  /** 값 뒤에 붙는 단위 — 나이의 「세」처럼 **입력의 일부로 읽혀야 하는** 말 */
  suffix?: string;
  /** 값이 있을 때 지우기 × 를 붙인다. 없으면 두지 않는다 */
  onClear?: () => void;
  /** 지우기의 낭독기 이름 — 「기타 지우기」처럼 **무엇을** 지우는지 밝힌다 */
  clearLabel?: string;
};

export function TextField({
  fieldLabel,
  helper,
  showCounter = false,
  variant = "large",
  suffix,
  onClear,
  clearLabel = "지우기",
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

      {/* 면·테두리는 **바깥이 든다** — 접미(「세」)가 붙어도 같은 칸 안에 있어야
          한 칸으로 읽힌다. 입력만 감싸면 접미가 칸 밖으로 나간다 */}
      <View
        style={[
          styles.field,
          VARIANT[variant],
          multiline ? styles.multiline : null,
          focused ? styles.focused : null,
        ]}
      >
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
          style={[styles.input, multiline ? styles.multilineInput : styles.singleLine]}
        />
        {suffix != null ? (
          <Text variant="body2" color={labelColor.assistive}>
            {suffix}
          </Text>
        ) : null}
        {/* 값이 있을 때만 붙는 지우기 — **선택을 되돌릴 길이 없으면 선택이 아니다**
            (`05-b.md`). 시안에 없는 조각이지만 제품 규칙이라 옮겨 왔다 */}
        {onClear != null && value.length > 0 ? (
          <IconButton
            name="close"
            size={16}
            accessibilityLabel={clearLabel}
            color={labelColor.assistive}
            onPress={onClear}
            style={styles.clear}
          />
        ) : null}
      </View>

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
  // 입력 pill — 패딩 11/18 · radius Full (`DESIGN.md` §7)
  pill: {
    minHeight: size.input.medium,
    borderRadius: radius.full,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
} as const;

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: background.elevated,
    paddingHorizontal: space.lg,
    ...hairline.alternative,
  },
  input: {
    flex: 1,
    // 입력값은 Regular 400 — 본문(500)과 다르다
    fontFamily: fontFamily.regular,
    fontSize: text.body1Reading.fontSize,
    color: labelColor.normal,
    // 높이는 바깥(`field`)이 잡는다 — 안에서 또 잡으면 접미와 세로가 어긋난다
    padding: 0,
  },
  /**
   * 한 줄 입력은 **칸 높이의 가운데**이고 받침이 잘리지 않는다 — 값도 플레이스홀더도.
   * 그 두 가지를 어떻게 잡는지는 한 곳에 적혀 있다(`singleLineInput` 머리말).
   *
   * ⚠ **줄 간격(`lineHeight`)으로 풀려고 하지 말 것.** iOS 는 한 줄 입력에 줄 간격이
   * 있으면 글자를 그 줄 상자의 **바닥에 붙여** 그린다 — 16/26 이라 10 만큼 내려앉아
   * 「맨 아래 붙은」 것으로 보였다.
   */
  singleLine: singleLineInput(text.body1Reading.fontSize),
  // 여러 줄은 위에서부터 쌓인다 — 줄 간격은 여기서만 뜻을 갖는다
  multilineInput: { lineHeight: text.body1Reading.lineHeight },
  // 3줄 = lineHeight 26 × 3 + 상하 패딩. 여러 줄은 위에서부터 쌓인다
  multiline: {
    alignItems: "flex-start",
    paddingVertical: space.md,
    maxHeight: text.body1Reading.lineHeight * size.input.maxLines + space.xl2,
  },
  // 포커스는 테두리 색·두께로만 말한다 — 링을 겹쳐 그리지 않는다
  focused: { borderWidth: 1, borderColor: primary.normal },
  // 히트 44 는 유지하되 칸 높이를 밀지 않게 음수 여백으로 당긴다
  clear: { width: 24, height: 24, marginRight: -4 },
  foot: { flexDirection: "row", alignItems: "center", gap: space.sm },
  helper: { flex: 1 },
});
