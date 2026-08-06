import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme, { type EmotionId } from "@/design/theme";
import { archive } from "@/design/tokens.mvp";

/**
 * 감정 필터 — `A2`. `momentory.css` `.fchips` · `.fchip` · `.fchipOn`.
 *
 * **감정 9종을 전부 둔다**(`A2.md`) — 자주 쓰는 셋만 남기면 나머지 여섯으로
 * 기록한 날은 찾을 길이 없다. 대신 **가로 스크롤**로 한 줄에 담는다.
 *
 * - **한 번에 하나만 고른다.** 다른 감정을 누르면 앞 선택이 풀리고 `[전체]` 는
 *   초기화다. 다중 선택은 결과 해석이 어려워 뒤로 미뤘다
 * - 고른 칩은 **색뿐 아니라 테두리·글자 굵기**로도 표시한다
 * - `.fchip` 은 시각 **34** 이고 **히트는 44** 다 — 시각 크기를 키우지 않는다
 * - `전체 24` 의 24 는 **감정 기록 수**다. 「12편」과 다른 값이라는 것이 라벨로
 *   구분돼야 한다
 */
type Props = {
  /** `전체` 칩에 붙는 수 — 감정 기록 총 개수 */
  totalCount: number;
  /** `null` 이면 전체 */
  selected: EmotionId | null;
  onSelect: (emotion: EmotionId | null) => void;
};

export function EmotionFilter({ totalCount, selected, onSelect }: Props) {
  return (
    <ScrollView
      testID="emotion-filter"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip label={`전체 ${totalCount}`} on={selected == null} onPress={() => onSelect(null)} />
      {theme.emotions.map((e) => (
        <Chip
          key={e.id}
          label={e.name}
          dot={e.base}
          on={selected === e.id}
          onPress={() => onSelect(e.id)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  dot,
  on,
  onPress,
}: {
  label: string;
  dot?: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      // 시각 34 · 히트 44 — (44 - 34) / 2
      hitSlop={archive.filterChip.hitSlop}
      onPress={onPress}
      style={[styles.chip, on ? styles.chipOn : null]}
    >
      {dot != null ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <AppText tone={on ? "onDark" : "body"} weight={on ? "600" : "500"} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: archive.filterChip.gap },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: archive.filterChip.gap,
    height: archive.filterChip.height,
    paddingHorizontal: archive.filterChip.paddingHorizontal,
    borderRadius: theme.radius.pill,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: archive.filterChip.border,
  },
  // 켜진 칩은 잉크 면 — 색·테두리·글자 굵기가 함께 바뀐다
  chipOn: { backgroundColor: semantic.textPrimary, borderColor: semantic.textPrimary },
  dot: {
    width: archive.filterChip.dot,
    height: archive.filterChip.dot,
    borderRadius: archive.filterChip.dot / 2,
  },
  label: { fontSize: archive.filterChip.fontSize, lineHeight: archive.filterChip.fontSize },
});
