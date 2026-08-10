import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { clearButton, otherRow } from "@/design/tokens.mvp";

/**
 * `.othr` — 「기타」 인라인 입력 줄 (`06-b`).
 *
 * 밑줄만 강조한다 — 칩 줄 안에 사각 입력칸을 넣으면 칩과 같은 것으로 읽힌다
 * (`06-b.md`). 12자 상한 · 카운터 · 값이 있을 때 지우기 ×(시각 19 · 히트 44).
 *
 * **원래 `06`(관심 분야) 화면 안에만 있던 것을 꺼냈다.** `07`(쉬는 방법)도
 * 같은 줄이 필요해졌기 때문이다 — 서버가 `OTHER` 와 함께 직접 입력 값을
 * 요구한다(`DISCUSSION.md` §1-7). 복사하면 `06-b` 의 규칙(공백이면 확정하지
 * 않는다 · 상한에서 색만 바뀐다)이 두 곳에 생기고, 한쪽만 고쳐진다.
 *
 * **확정은 이 컴포넌트가 하지 않는다.** 키보드 완료 · 밖 탭(blur) 두 경로를
 * `onCommit` 으로 올려보내고, 세 번째 경로인 `[다음]` 은 화면이 직접 부른다 —
 * 확정 규칙(공백이면 칩까지 끈다)은 그 칩을 아는 화면의 몫이다.
 */
export function OtherRow({
  label = "기타",
  value,
  onChangeText,
  onCommit,
}: {
  /** 접근성 이름이자 줄 앞의 말. 화면마다 무엇의 기타인지 다르다 */
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  onCommit: () => void;
}) {
  const atLimit = value.length >= otherRow.maxLength;

  return (
    <View style={styles.othr}>
      <AppText tone="caption" style={styles.othLabel}>
        {label}
      </AppText>
      <View style={styles.othField}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="직접 입력"
          placeholderTextColor={semantic.textSlogan}
          maxLength={otherRow.maxLength}
          returnKeyType="done"
          onSubmitEditing={onCommit}
          onBlur={onCommit}
          selectionColor={semantic.accentFill}
          accessibilityLabel={`${label} 직접 입력`}
          style={styles.othInput}
        />
        <AppText
          variant="footnote"
          // 상한 도달은 색만 바뀐다 (06-c.md)
          tone={atLimit ? "accent" : "caption"}
          style={styles.othCounter}
        >
          {`${value.length}/${otherRow.maxLength}`}
        </AppText>
        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} 지우기`}
            hitSlop={clearButton.hitSlop}
            onPress={() => onChangeText("")}
            style={styles.othClear}
          >
            <AppText tone="body" style={styles.othClearMark}>
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
  othr: { flexDirection: "row", alignItems: "center", gap: otherRow.gap },
  othLabel: { fontSize: otherRow.labelSize, lineHeight: otherRow.labelSize },
  othField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: otherRow.field.gap,
    minHeight: otherRow.field.minHeight,
    paddingHorizontal: otherRow.field.paddingHorizontal,
    backgroundColor: semantic.surface,
    borderTopLeftRadius: otherRow.field.radiusTop,
    borderTopRightRadius: otherRow.field.radiusTop,
    borderBottomWidth: otherRow.field.underline,
    borderBottomColor: semantic.accentFill, // primaryDeep 밑줄 (.othf)
  },
  othInput: {
    flex: 1,
    fontFamily: "Pretendard-Medium",
    fontSize: otherRow.fontSize,
    color: semantic.textPrimary,
    padding: 0,
  },
  othCounter: { fontVariant: ["tabular-nums"] },
  othClear: {
    width: clearButton.size,
    height: clearButton.size,
    borderRadius: clearButton.size / 2,
    backgroundColor: clearButton.background,
    alignItems: "center",
    justifyContent: "center",
  },
  othClearMark: { fontSize: 12, lineHeight: 14 },
});
