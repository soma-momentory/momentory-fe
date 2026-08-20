import { ScrollView, StyleSheet } from "react-native";

import { Chip } from "@/components/ds";
import { size } from "@/design/ds";
import { EMOTIONS, type EmotionId } from "@/features/emotion/model/emotion";

/**
 * 감정 필터 — `A2` · `Archive.dc.html` 「감정 필터는 9종 칩」.
 *
 * **감정 9종을 전부 둔다**(`A2.md`) — 자주 쓰는 셋만 남기면 나머지 여섯으로
 * 기록한 날은 찾을 길이 없다. 대신 **가로 스크롤**로 한 줄에 담는다.
 *
 * ## ⚠ 칩에 감정색을 쓰지 않는다 — 시안과 갈린 자리
 *
 * 시안은 칩마다 그 감정색을 칠하고 「여기서는 색으로 감정을 구분해요」라고
 * 적었지만, `DESIGN.md` §1 은 「**감정 선택 칩에는 감정색을 쓰지 않고 브랜드
 * 초록 18% + 초록 2px 로 통일**」이다. 값이 어긋나면 `DESIGN.md` 가 이긴다
 * (`PLAN.md` A §0).
 *
 * 규칙으로도 그 편이 맞다 — 감정색으로 선택을 표시하면 「무슨 감정인가」와
 * 「골랐는가」가 같은 채널을 쓰게 되고, 원색 아홉 중 일곱이 대비 3:1 을 못 넘는다.
 * 그래서 여기는 이름만 두고, **색으로 감정을 가리키는 일은 도트가 맡는다**
 * (목록 카드·달력).
 *
 * 그대로인 것: **한 번에 하나만** 고르고 **`[전체]` 칩이 없다** — 고른 칩을 다시
 * 누르면 풀린다(초기화 버튼을 따로 두지 않는다).
 */
type Props = {
  /** `null` 이면 필터 없음 — 그달 전체가 보인다 */
  selected: EmotionId | null;
  onSelect: (emotion: EmotionId | null) => void;
  /**
   * 화면 좌우 여백. 줄이 **화면 끝까지 흐르게** 하려면 부모가 음수 마진으로 20 을
   * 되돌리고 그 값을 여기로 넘긴다 — 스크롤 내용의 여백이라야 칩이 잘리지 않는다.
   */
  edgePadding?: number;
};

export function EmotionFilter({ selected, onSelect, edgePadding = 0 }: Props) {
  return (
    <ScrollView
      testID="emotion-filter"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: edgePadding }]}
    >
      {EMOTIONS.map((e) => (
        <Chip
          key={e.id}
          label={e.name}
          selected={selected === e.id}
          // 같은 칩을 다시 누르면 해제다
          onPress={() => onSelect(selected === e.id ? null : e.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: size.chip.gap },
});
