import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme, { type EmotionId } from "@/design/theme";
import { emotionGrid } from "@/design/tokens.mvp";

/**
 * 감정 9종 격자 — `momentory.css` `.egrid` · `.em` · `.emOn` · `.emd`.
 *
 * **감정은 `theme.emotions` 9종뿐**이고 이모지 척도로 대체하지 않는다(§9-1).
 * 아홉을 다 보이고 접지 않는다 — 감춘 감정은 사실상 선택되지 않는다.
 *
 * **선택을 색만으로 표시하지 않는다**(`RULES.md` 「접근성」):
 * 테두리 1→**2px** + 그 감정의 `ink` 색 · 글자 굵기 500→**600** · 면 색까지
 * 함께 바뀐다. 색각 이상에서도 굵기와 두께로 읽힌다.
 *
 * **다시 누르면 취소되는 토글**이고 확인 모달을 두지 않는다(`12-c.md`).
 */
type Props = {
  /** 켜진 감정들. 단일 선택이면 길이 1 로 넘긴다 */
  selected: readonly EmotionId[];
  onToggle: (id: EmotionId) => void;
};

export function EmotionGrid({ selected, onToggle }: Props) {
  return (
    <View style={styles.grid}>
      {theme.emotions.map((e) => {
        const on = selected.includes(e.id);
        return (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={e.name}
            onPress={() => onToggle(e.id)}
            style={[
              styles.cell,
              on ? { backgroundColor: `${e.base}${emotionGrid.onAlpha}`, borderColor: e.ink, borderWidth: 2 } : null,
            ]}
          >
            {/* 점은 꺼짐이면 감정색, 켜지면 진한 잉크 — 대비가 함께 올라간다 */}
            <View style={[styles.dot, { backgroundColor: on ? e.ink : e.base }]} />
            <AppText
              weight={on ? "600" : "500"}
              style={[styles.label, { color: on ? e.ink : theme.colors.semantic.textBody }]}
            >
              {e.name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: emotionGrid.gap },
  cell: {
    // 3열 — gap 두 칸을 뺀 나머지를 셋으로 나눈다
    width: `${100 / emotionGrid.columns}%`,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: emotionGrid.cell.minHeight,
    borderRadius: emotionGrid.cell.radius,
    backgroundColor: emotionGrid.cell.background,
    borderWidth: 1,
    borderColor: emotionGrid.cell.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: emotionGrid.cell.gap,
  },
  dot: {
    width: emotionGrid.cell.dot,
    height: emotionGrid.cell.dot,
    borderRadius: emotionGrid.cell.dot / 2,
  },
  label: { fontSize: emotionGrid.cell.fontSize, lineHeight: emotionGrid.cell.fontSize * 1.3 },
});
