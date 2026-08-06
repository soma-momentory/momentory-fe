import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme, { type EmotionId } from "@/design/theme";
import { emotionPill } from "@/design/tokens.mvp";

/**
 * 감정 알약 — `momentory.css` `.epill`.
 *
 * ```css
 * .epill{display:flex;align-items:center;gap:5px;padding:5px 10px;
 *        border-radius:999px;font:600 11.5px/1}
 * ```
 *
 * 면은 그 감정색 **22%**, 점과 글자는 같은 감정의 `ink` 다.
 *
 * **색만으로 감정을 판단하게 하지 않는다**(`RULES.md` 「보관함」) — 점 옆에
 * 이름을 항상 함께 쓴다. 그래서 이 컴포넌트에는 「점만」 변형이 없다.
 *
 * 감정은 `theme.emotions` **9종뿐**이고 이모지 척도로 대체하지 않는다(§9-1).
 */
type Props = {
  id: EmotionId;
};

export function EmotionPill({ id }: Props) {
  const emotion = theme.emotions[id - 1];
  if (emotion == null) return null;

  return (
    <View
      // 낭독기에는 「불안함 감정」 하나로 읽힌다 — 점과 이름을 따로 읽으면 두 번이다
      accessibilityRole="text"
      accessibilityLabel={`${emotion.name} 감정`}
      style={[styles.pill, { backgroundColor: `${emotion.base}${emotionPill.fillAlpha}` }]}
    >
      <View style={[styles.dot, { backgroundColor: emotion.ink }]} />
      <AppText weight="600" style={[styles.label, { color: emotion.ink }]}>
        {emotion.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: emotionPill.height,
    flexDirection: "row",
    alignItems: "center",
    gap: emotionPill.gap,
    paddingVertical: emotionPill.paddingVertical,
    paddingHorizontal: emotionPill.paddingHorizontal,
    borderRadius: theme.radius.pill,
  },
  dot: {
    width: emotionPill.dot,
    height: emotionPill.dot,
    borderRadius: emotionPill.dot / 2,
  },
  // css 11.5px/1 — 줄간격 1 이라 프리셋(footnote 18)을 쓰면 알약이 세로로 늘어난다
  label: { fontSize: emotionPill.fontSize, lineHeight: emotionPill.fontSize },
});
