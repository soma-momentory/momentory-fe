import { ScrollView, StyleSheet } from "react-native";

import { Chip } from "@/components/ds";
import { size } from "@/design/ds";
import { EMOTIONS_BY_SENTIMENT, type EmotionId } from "@/features/emotion/model/emotion";

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
 * ## 여러 감정을 함께 고른다 (2026-08-24 · 스펙의 「한 번에 하나만」에서 바꿈)
 *
 * `A2.md`·`DESIGN.md` 는 「한 번에 하나만」이었지만, 여러 감정을 훑어보려면 **여러
 * 칩을 함께** 고를 수 있어야 한다. 고른 감정들의 **합집합**으로 거른다 — 고른 감정
 * 중 **하나라도** 붙은 일기가 남는다(칩을 더 고를수록 **넓어진다**).
 *
 * ⚠ 2026-08-24 에는 교집합(모두 다 가진 일기)이었는데 2026-08-28 에 합집합으로
 * 바꿨다 — 칩을 더 누를수록 결과가 사라지는 것이 필터를 「끄는」 것처럼 읽혔다.
 * 이제 칩 하나는 「이 감정도 보여줘」다.
 *
 * 이 거르기는 **선택한 기간(달·전체) 안에서만** 돈다. 여전히 **`[전체]` 칩은 없다** —
 * 고른 칩을 다시 누르면 그 하나만 풀리고, 전부 풀면 그 기간 전체가 보인다.
 * 차이 기록: `docs/PRODUCT.md` 「상류와 차이」.
 */
type Props = {
  /** 고른 감정들. **빈 배열이면 필터 없음** — 그달 전체가 보인다 */
  selected: readonly EmotionId[];
  /** 칩 하나를 켜고 끈다 — 부모가 합집합 목록을 관리한다 */
  onToggle: (emotion: EmotionId) => void;
  /**
   * 화면 좌우 여백. 줄이 **화면 끝까지 흐르게** 하려면 부모가 음수 마진으로 20 을
   * 되돌리고 그 값을 여기로 넘긴다 — 스크롤 내용의 여백이라야 칩이 잘리지 않는다.
   */
  edgePadding?: number;
};

export function EmotionFilter({ selected, onToggle, edgePadding = 0 }: Props) {
  return (
    <ScrollView
      testID="emotion-filter"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: edgePadding }]}
    >
      {EMOTIONS_BY_SENTIMENT.map((e) => (
        <Chip
          key={e.id}
          label={e.name}
          selected={selected.includes(e.id)}
          // 필터는 테두리 굵기(1→2)로 고른 칩을 표시한다 — 색만으로 선택을 말하지 않는다(CLAUDE.md 규칙 3).
          // 채팅 선택지의 은은한 면(soft)은 여기 쓰지 않는다
          // 같은 칩을 다시 누르면 그 하나만 해제다
          onPress={() => onToggle(e.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: size.chip.gap },
});
