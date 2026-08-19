import { Pressable, StyleSheet } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, layout } from "@/design/ds";

/**
 * 우상단 건너뛰기 — `design.md` 「온보딩」: **「선택사항 항목은 우상단 건너뛰기」**.
 *
 * 옛 화면은 「선택사항」 배지로 선택 항목임을 말했는데, 새 디자인은 **빠져나갈 길을
 * 보여주는 것**으로 대신한다. 배지는 "안 해도 된다"고 말만 하고, 이 버튼은 그 길이다.
 *
 * `Button variant="text"` 를 쓰지 않는 이유 — 그쪽은 높이 48 의 CTA 위계이고
 * 여기는 상단바 안(44)에 들어가는 보조 행동이다. 색도 `label.alternative` 로
 * 낮춰 주 행동과 경쟁하지 않게 한다.
 */
export function SkipButton({
  onPress,
  label = "건너뛰기",
}: {
  onPress: () => void;
  label?: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.base}>
      <Text variant="label1" color={labelColor.alternative}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 글자가 작아도 눌리는 면은 44 를 지킨다
  base: {
    minHeight: layout.minTouch,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
});
