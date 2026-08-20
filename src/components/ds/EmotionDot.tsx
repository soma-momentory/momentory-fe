import { StyleSheet, View, type ViewStyle } from "react-native";

import { emotion as emotionColor, emotionTint, fill, line, radius } from "@/design/ds";
import type { EmotionId } from "@/features/emotion/model/emotion";

/**
 * 감정 도트 — `design.md` §1 「도트·캡슐은 **55% 틴트 + 원색 1.5px 링**」.
 *
 * 그 한 문장이 보관함 달력 · 일기 미리보기 · 리포트 7일 흐름 · 기록 상세에
 * 네 번 나오므로 여기 한 곳에 둔다. 네 곳이 각자 그리면 링 두께가 넷으로 갈린다.
 *
 * ## ⚠ 도트만 두면 규칙이 깨진다
 *
 * 감정 원색은 배경 대비 1.46~3.31 이고 **아홉 중 일곱이 3:1 을 못 넘는다**
 * (`src/design/ds/color.ts` 머리말). 그 예외를 떠받치는 것이
 * 「**감정을 색만으로 판단하게 하지 않고 이름을 늘 함께 쓴다**」(`RULES.md` 「보관함」)는
 * 규칙이다 — 이 도트 옆·아래에는 **반드시 감정 이름이 글자로** 있어야 한다.
 * 도트 자신은 장식이라 낭독기에 읽히지 않는다(이름이 이미 읽힌다).
 *
 * `id` 가 `null` 이면 **기록이 없는 자리**다 — 감정색을 쓰지 않고 잔잔한 중립 원으로
 * 자리만 지킨다(리포트의 기록 없는 요일). 빈 칸을 강조하지 않는다.
 */
type Props = {
  id: EmotionId | null;
  /** 지름. 달력 점 6 · 목록 10 · 리포트 흐름 18~26 */
  size?: number;
  style?: ViewStyle;
};

export function EmotionDot({ id, size = 10, style }: Props) {
  const box: ViewStyle = { width: size, height: size, borderRadius: radius.full };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        box,
        id == null
          ? styles.empty
          : { backgroundColor: emotionTint(id), borderColor: emotionColor[id] },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // 링은 1.5px 고정이다 — 지름이 커져도 두께는 같다(§1)
  base: { borderWidth: 1.5 },
  empty: { backgroundColor: fill.alternative, borderColor: line.alternative },
});
