import { StyleSheet, View } from "react-native";

import { Chip } from "@/components/ds";
import { size } from "@/design/ds";
import type { Option } from "@/features/onboarding/data/optionsApi";

/**
 * 빠른 답장 칩 — `Onboarding.dc.html` 「대화 문법」:
 * **「빠른 답장은 Core ChipFilter 그대로, 질문 바로 아래 왼쪽」.**
 *
 * 하단 독이 아니라 **대화 영역 안**에 붙는다(`OnboardingChat` 의 `inline`).
 * 답을 고르는 자리가 대화의 일부라야 고른 것이 「내가 한 말」로 이어진다.
 *
 * 목록이 길면(쉬는 방법 15개) 대화 영역이 스크롤되므로 여기서 높이를 자르지
 * 않는다 — 잘라서 감추면 뒤쪽 칩은 사실상 선택되지 않는다(`07.md`).
 */
type Props = {
  items: readonly Option[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  /**
   * 더 고를 수 없는 상태 — 상한에 닿은 칩을 **끄지는 못하게 하지 않는다**.
   * 켜진 칩은 언제나 누를 수 있어야 무를 길이 남는다.
   */
  full?: boolean;
};

export function QuickReplies({ items, selected, onToggle, full = false }: Props) {
  return (
    <View style={styles.flow}>
      {items.map((o) => {
        const on = selected.includes(o.id);
        return (
          <Chip
            key={o.id}
            label={o.label}
            selected={on}
            // 상한에 닿아도 켜진 것은 끌 수 있다 — 넷째부터 눌러도 켜지지 않을 뿐
            disabled={full && !on}
            onPress={() => onToggle(o.id)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: size.chip.gap,
    alignSelf: "flex-start",
  },
});
