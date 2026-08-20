import { StyleSheet, TextInput, View } from "react-native";

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

import { Icon } from "./icons/Icon";
import { IconButton } from "./IconButton";

/**
 * 검색 입력 — `Archive.dc.html` A2.
 *
 * `TextField` 와 나누지 않고 따로 둔 이유: 검색은 **앞에 아이콘이 서고 라벨·헬퍼가
 * 없다.** `TextField` 에 leading 을 뚫으면 라벨·카운터·suffix 와 조합이 늘어
 * 어느 조합이 실제로 쓰이는지 알 수 없게 된다. 공유하는 것은 값(면·hairline·
 * 포커스 링·Regular 400)이지 컴포넌트가 아니다.
 *
 * - 면 Elevated · radius 12 · `line.neutral` hairline (`design.md` §7)
 * - 포커스는 **테두리 색·두께로만** 말한다 — 링을 겹쳐 그리지 않는다
 * - 입력값·플레이스홀더는 **Regular 400**(§2)
 * - 값이 있으면 지우기 × — **되돌릴 길이 없으면 선택이 아니다**
 *
 * ⚠ 아이콘은 시안 18 이지만 DS 는 **16/20/24 3단**이다(§10) — 로그인에서 정한
 * 대로 아이콘 스케일이 이긴다(`PLAN.md` A-7).
 */
type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** 낭독기가 읽을 이름 — 무엇을 찾는 칸인지 밝힌다 */
  accessibilityLabel: string;
};

export function SearchField({ value, onChangeText, placeholder, accessibilityLabel }: Props) {
  return (
    <View style={styles.field}>
      <Icon name="search" size={20} color={labelColor.alternative} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={labelColor.assistive}
        selectionColor={primary.normal}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 ? (
        <IconButton
          name="close"
          size={16}
          accessibilityLabel="검색어 지우기"
          color={labelColor.assistive}
          onPress={() => onChangeText("")}
          style={styles.clear}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: size.input.medium,
    paddingHorizontal: space.lg,
    borderRadius: radius.medium,
    backgroundColor: background.elevated,
    ...hairline.neutral,
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    // 입력값은 Regular 400 — 본문(500)과 다르다(`design.md` §2)
    fontFamily: fontFamily.regular,
    fontSize: text.body2.fontSize,
    lineHeight: text.body2.lineHeight,
    color: labelColor.normal,
  },
  // 히트 44 는 유지하되 칸 높이를 밀지 않게 음수 여백으로 당긴다
  clear: { width: 24, height: 24, marginRight: -4 },
});
