import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Text } from "@/components/ds";
import { homeV2, weeklyHappiness } from "@/design/ds";
import { keepWords } from "@/features/letter/model/letter";
import { WEEKLY_HAPPINESS_MAX_LENGTH } from "@/features/rest/model/weeklyHappiness";

const { color, size } = weeklyHappiness;
const ENTRY_MIN_HEIGHT = size.entry.lineHeight + size.entryPaddingY * 2;

/**
 * 기록장의 한 줄 — 왼쪽 칸 이름 · 세로 선 · 오른쪽에 적는 글. 줄 어디를 눌러도 적기 시작한다.
 * 예시 글은 **적으려고 누른 칸에만** 뜬다 — 일곱 칸에 깔아 두면 이미 채워진 기록장처럼 보였다.
 */
export function WeeklyHappinessRow({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [minHeight, setMinHeight] = useState<number>(ENTRY_MIN_HEIGHT);

  return (
    <Pressable
      accessible={false}
      onPress={() => input.current?.focus()}
      style={[styles.row, focused && styles.rowFocused]}
    >
      <View style={styles.label}>
        <Text variant="label1Hand" color={color.text} style={styles.labelText}>
          {keepWords(label)}
        </Text>
      </View>
      <View style={styles.divider} />
      <TextInput
        ref={input}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={focused ? placeholder : undefined}
        placeholderTextColor={color.placeholder}
        maxLength={WEEKLY_HAPPINESS_MAX_LENGTH}
        multiline
        numberOfLines={1}
        scrollEnabled={false}
        submitBehavior="blurAndSubmit"
        returnKeyType="done"
        textAlignVertical="center"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onContentSizeChange={({ nativeEvent }) =>
          setMinHeight(Math.max(ENTRY_MIN_HEIGHT, nativeEvent.contentSize.height))
        }
        style={[styles.entry, value === "" && styles.entryEmpty, { minHeight }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: size.rowMinHeight,
    borderBottomWidth: size.line,
    borderBottomColor: color.line,
  },
  rowFocused: { backgroundColor: color.focus },
  label: {
    width: size.labelWidth,
    paddingHorizontal: size.labelPaddingX,
    alignItems: "center",
    justifyContent: "center",
  },
  labelText: { fontFamily: homeV2.font.regular, textAlign: "center" },
  divider: {
    width: size.line,
    marginVertical: size.dividerMarginY,
    backgroundColor: color.line,
  },
  entry: {
    flex: 1,
    paddingHorizontal: size.entryPaddingX,
    paddingVertical: size.entryPaddingY,
    fontFamily: homeV2.font.bold,
    fontSize: size.entry.fontSize,
    lineHeight: size.entry.lineHeight,
    color: color.entry,
  },
  /** 예시 글은 적은 글(굵게)보다 가늘다 — 입력칸의 글꼴을 따라가서 비었을 때 바꾼다 */
  entryEmpty: { fontFamily: homeV2.font.regular },
});
