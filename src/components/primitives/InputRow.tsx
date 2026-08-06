import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import theme from "@/design/theme";
import { inputRow } from "@/design/tokens.mvp";

/**
 * 한 줄 입력. `04` 닉네임 · `08` 회고 시각 공용.
 *
 * 값은 `flows/9-mvp.mjs` 의 입력창 rect 에서 왔다 — h56 · r16 · fill card ·
 * 테두리 ink 14% · placeholder 16px legal · 왼쪽 여백 18.
 *
 * ⚠ `momentory.css` 에 대응 클래스가 없다. `.inp`(r999)는 **홈의 순간 입력 알약**이고
 * 이것과 다르다. 원본 `inputRow()`(h52 · 알약 · primary 테두리)와도 다르다.
 *
 * **카운터·지우기 × 를 두지 않는다.** 그 둘은 `04-b`·`04-c` 에 사는데 MVP 범위 밖이다
 * (`09_MVP/docs/04.md` — "상태 변형 없이 이 한 장으로 대표한다"). 글자 수를 세어
 * 보여주는 것은 숫자로 압박하지 않는다는 규칙과도 부딪힌다.
 */
type Props = Omit<TextInputProps, "style"> & {
  /** 지금은 쓰지 않지만 08 시간 선택이 탭으로 열릴 자리 */
  onPress?: () => void;
};

export function InputRow({ onPress, ...rest }: Props) {
  return (
    <View style={styles.row}>
      <TextInput
        placeholderTextColor={theme.colors.semantic.textLegalInk}
        // 입력 자체가 답이라 라벨을 따로 두지 않는다 — 위 말풍선이 이미 물었다.
        // 낭독기에는 placeholder 가 그 역할을 한다.
        {...rest}
        style={styles.input}
      />
    </View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  row: {
    height: inputRow.height,
    borderRadius: inputRow.radius,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: inputRow.border,
    justifyContent: "center",
    paddingHorizontal: inputRow.paddingHorizontal,
  },
  input: {
    fontFamily: "Pretendard-Regular",
    fontSize: inputRow.fontSize,
    color: semantic.textPrimary,
    // Android 는 TextInput 에 기본 padding 이 붙어 세로 가운데가 어긋난다
    padding: 0,
  },
});
