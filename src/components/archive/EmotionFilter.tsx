import { Pressable, ScrollView, StyleSheet } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperEmotions, paperRadius, paperTypography } from "@/design/paper";
import type { EmotionId } from "@/features/emotion/model/emotion";

/**
 * 감정 필터 — `A2` · 새 디자인(`design-system.md` §4.4 · `보관함.dc.html`).
 *
 * **감정 9종을 전부 둔다**(`A2.md`) — 자주 쓰는 셋만 남기면 나머지 여섯으로
 * 기록한 날은 찾을 길이 없다. 대신 **가로 스크롤**로 한 줄에 담는다.
 *
 * 새 디자인에서 바뀐 것 둘 (`PLAN.md` Phase 3 — 보관함 행):
 * - **`[전체]` 칩이 없다.** 고른 칩을 **다시 누르면 필터가 풀린다** — 초기화
 *   버튼을 따로 두지 않는다(§4.4)
 * - 칩의 면이 **감정색 원색**이고, 고르지 않은 칩은 `opacity .42` 로 물러난다
 *
 * 그대로인 것: **한 번에 하나만** 고른다. 다중 선택은 결과 해석이 어려워
 * 뒤로 미뤘다(`A2.md`).
 *
 * **선택을 색만으로 표시하지 않는다**(`RULES.md` · `PLAN.md` §3-1) — 시안은
 * `opacity`·`scale` 만 바꾸지만 여기서는 **테두리 1→2px 과 글자 굵기**를 함께
 * 바꾼다. 히트 영역은 시각 크기를 키우지 않고 `hitSlop` 으로 44 를 채운다.
 */
type Props = {
  /** `null` 이면 필터 없음 — 그달 전체가 보인다 */
  selected: EmotionId | null;
  onSelect: (emotion: EmotionId | null) => void;
};

export function EmotionFilter({ selected, onSelect }: Props) {
  return (
    <ScrollView
      testID="emotion-filter"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {paperEmotions.map((e) => {
        const on = selected === e.id;
        return (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            // 시각 32 · 히트 44 — (44 - 32) / 2
            hitSlop={6}
            // 같은 칩을 다시 누르면 해제다 (§4.4)
            onPress={() => onSelect(on ? null : e.id)}
            style={[
              styles.chip,
              { backgroundColor: e.base },
              on ? styles.chipOn : null,
              selected != null && !on ? styles.chipOff : null,
            ]}
          >
            <AppText weight={on ? "700" : "400"} style={styles.label}>
              {e.name}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 7, paddingBottom: 2 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: paperRadius.chip,
    // 고르면 2px 이 된다 — 자리가 흔들리지 않게 평소에도 테두리를 둔다
    borderWidth: 1,
    borderColor: "transparent",
  },
  // 고른 칩 — 테두리·굵기·크기가 함께 바뀐다 (색만으로 표시하지 않는다)
  chipOn: {
    borderWidth: 2,
    borderColor: paperColors.text.primary,
    transform: [{ scale: 1.04 }],
  },
  // 다른 칩을 고른 동안 물러난다 (시안 `opacity:.42`)
  chipOff: { opacity: 0.42 },
  label: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.fontSize + 5,
    // 감정색 9종 위에서 4.5~7.8 — 대비 검수 통과 (PLAN §4 Phase 1)
    color: paperColors.text.primary,
  },
});
