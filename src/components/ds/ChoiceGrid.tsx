import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  background,
  label as labelColor,
  line,
  primary,
  radius,
  selectedTint,
  size,
  space,
} from "@/design/ds";

import { columnWidth } from "./columnWidth";
import { Text } from "./Text";

/**
 * Momentory DS — 3열 선택 그리드 (`Diary.dc.html` ② 「감정 선택」).
 *
 * 칩(`Chip`)과 **다른 물건이다.** 칩은 문장 옆에 흐르는 알약이고, 이건 격자에
 * 줄지어 서서 **전부 한 화면에 보여야 하는** 목록이다 — 스크롤로 감추면 뒤쪽은
 * 사실상 선택되지 않는다(`C3.md`). 그래서 높이 48 · r12 로 크고, 3열로 고정된다.
 *
 * ## 감정색을 쓰지 않는다
 *
 * `DESIGN.md` §1: 「**감정 선택 칩에는 감정색을 쓰지 않는다** — 브랜드 초록 18% +
 * 초록 2px 로 통일한다」. 아홉 개를 각자 제 색으로 칠하면 고른 것이 어느
 * 것인지가 색의 밝기 싸움이 된다.
 *
 * ## 선택을 색만으로 표시하지 않는다
 *
 * `RULES.md` 3 — 면 색과 함께 **테두리 굵기(1→2)와 글자 굵기**가 같이 바뀐다.
 *
 * ## 3열은 **화면 폭과 무관하게** 3열이다
 *
 * 예전엔 `flexBasis: 33.33%` + `maxWidth: 31%` 로 세웠는데, 간격(12)이 퍼센트
 * 밖에서 더해져 좁은 기기에서는 세 칸이 한 줄에 들어가지 못하고 마지막 칸이
 * 다음 줄로 넘어갔다 — 3×3 이 3·3·2·1 로 흩어졌다. 지금은 폭을 재서 칸을
 * **픽셀로** 나눈다(`columnWidth`).
 */
export type Choice = { id: string; label: string };

type Props = {
  items: readonly Choice[];
  /** 하나만 고른다. `null` 이면 아직 고르지 않은 것이다 */
  selected: string | null;
  onSelect: (id: string) => void;
};

export function ChoiceGrid({ items, selected, onSelect }: Props) {
  const [width, setWidth] = useState(0);
  const tile = columnWidth(width, COLUMNS, GAP);

  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {items.map((it) => {
        const on = it.id === selected;
        return (
          <Pressable
            key={it.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(it.id)}
            style={[
              styles.tile,
              // 재기 전 한 프레임만 퍼센트로 선다
              tile == null ? styles.measuring : { width: tile },
              on ? styles.on : styles.off,
            ]}
          >
            <Text
              variant={on ? "label1" : "body2"}
              color={on ? labelColor.strong : labelColor.neutral}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 3열 — 한 줄에 셋. 간격을 빼고 남은 폭을 셋이 나눈다 */
const COLUMNS = 3;
const GAP = space.md;

const styles = StyleSheet.create({
  // 왼쪽부터 채운다 — 마지막 줄이 셋보다 적을 때 가운데로 모으면 열이 어긋난다.
  // 내림하고 남는 1px 남짓은 오른쪽 끝에 둔다
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    minHeight: size.button.large,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
    borderRadius: radius.medium,
  },
  measuring: { flexBasis: `${100 / COLUMNS}%`, flexShrink: 1, minWidth: 0 },
  off: {
    backgroundColor: background.elevated,
    borderWidth: 1,
    borderColor: line.neutral,
  },
  on: {
    backgroundColor: selectedTint,
    borderWidth: size.chip.selectedBorderWidth,
    borderColor: primary.normal,
  },
});
