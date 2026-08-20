import { Pressable, StyleSheet, View } from "react-native";

import {
  interaction,
  label as labelColor,
  primary,
  radius,
  selectedTint,
  space,
} from "@/design/ds";
import { formatKoreanMonth } from "@/lib/day";

import { IconButton } from "./IconButton";
import { Text } from "./Text";

/**
 * 월 달력 — `Archive.dc.html` A1 · `Rest.dc.html` R2 가 **같은 그리드**를 쓴다.
 *
 * ## 그리드는 공유하고 **표시 규칙만 주입받는다**
 *
 * 보관함은 그날 감정을 점으로 찍고 쉼터는 수행한 날을 초록 점으로 찍는다 —
 * 같은 달력에 다른 뜻의 점이 붙는다. 그래서 이 컴포넌트는 **무슨 점인지 모른다**:
 * `markOf(date)` 가 칸마다 점 색·강조·잠금을 돌려주고 여기는 그대로 그린다.
 * 감정 팔레트를 여기서 import 하면 쉼터가 쓰지 않는 것을 들고 다니게 된다.
 *
 * ## 점에는 이름이 없다 — 그래서 아래에 카드가 있다
 *
 * 「**색만으로 판단하게 하지 않는다**」(`RULES.md`)는 규칙을 이 격자 안에서는
 * 지킬 수 없다 — 38px 칸에 감정 이름이 들어가지 않는다. 대신 **날짜를 누르면
 * 아래 카드가 이름을 글자로 말한다**(`A1.md`). 이 달력만 따로 떼어 쓰면 그
 * 규칙이 함께 오지 않는다는 뜻이다.
 *
 * ## 기록이 없는 날도 누를 수 있다
 *
 * 시안 주석은 「기록 없는 날은 비활성」이라고 적었지만 `DESIGN.md` 「보관함」은
 * A1 을 「선택한 날의 **일기+일정**」으로 정한다 — 일기가 없어도 일정이 있는 날이
 * 있고, 빈 날도 「같은 자리의 한 장」으로 답해야 한다(`A1.md`). 값이 어긋나면
 * `DESIGN.md` 가 이긴다. 정말 못 고르는 날은 `markOf` 가 `disabled` 로 말한다.
 */
export type CalendarMark = {
  /** 칸 아래 점. 없으면 찍지 않는다 — **점의 뜻은 부르는 쪽이 안다** */
  dotColor?: string;
  /** 기록이 있는 날 — 날짜 글자를 진하게 */
  emphasized?: boolean;
  /** 고를 수 없는 날 (쉼터의 카드 없는 날) */
  disabled?: boolean;
};

type Props = {
  /** `2026-08` */
  month: string;
  /** `2026-08-13` · 고른 날이 없으면 `null` */
  selectedDate: string | null;
  onSelect: (date: string) => void;
  /** `-1` 이전 달 · `1` 다음 달 */
  onMonthStep: (step: -1 | 1) => void;
  markOf?: (date: string) => CalendarMark;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const NO_MARK: CalendarMark = {};

/** `2026-08` + `13` → `2026-08-13` */
const isoOf = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;

export function Calendar({ month, selectedDate, onSelect, onMonthStep, markOf }: Props) {
  const [y = "2026", m = "1"] = month.split("-");
  // 1일의 요일만큼 앞을 비운다 — 요일 머리글과 줄이 맞아야 달력으로 읽힌다
  const lead = new Date(Number(y), Number(m) - 1, 1).getDay();
  const days = new Date(Number(y), Number(m), 0).getDate();

  return (
    <View style={styles.root}>
      <View style={styles.monthRow}>
        <IconButton
          name="chevron-left"
          size={20}
          accessibilityLabel="이전 달"
          onPress={() => onMonthStep(-1)}
          style={styles.monthButton}
        />
        <Text variant="label1" color={labelColor.strong}>
          {formatKoreanMonth(month)}
        </Text>
        <IconButton
          name="chevron-right"
          size={20}
          accessibilityLabel="다음 달"
          onPress={() => onMonthStep(1)}
          style={styles.monthButton}
        />
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.head}>
            <Text variant="caption2" color={labelColor.assistive}>
              {d}
            </Text>
          </View>
        ))}

        {/* 앞의 빈 칸에는 누를 것이 없다 — 자리만 지킨다 */}
        {Array.from({ length: lead }, (_, i) => (
          <View key={`lead-${i}`} style={styles.cell} />
        ))}

        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const date = isoOf(month, day);
          const mark = markOf?.(date) ?? NO_MARK;
          const selected = date === selectedDate;

          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={`${day}일`}
              accessibilityState={{ selected, disabled: mark.disabled === true }}
              disabled={mark.disabled === true}
              onPress={() => onSelect(date)}
              style={[styles.cell, selected ? styles.cellSelected : null]}
            >
              <Text
                variant={mark.emphasized === true ? "label2" : "caption1"}
                color={cellColor(mark)}
              >
                {day}
              </Text>
              {/* 점 자리는 늘 잡아 둔다 — 있고 없고에 따라 숫자가 오르내리지 않게 */}
              <View
                style={[
                  styles.dot,
                  mark.dotColor != null ? { backgroundColor: mark.dotColor } : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function cellColor(mark: CalendarMark) {
  if (mark.disabled === true) return labelColor.disabled;
  return mark.emphasized === true ? labelColor.strong : interaction.inactive;
}

const CELL_HEIGHT = 38;
const DOT = 6;

const styles = StyleSheet.create({
  root: { gap: space.md },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  // 히트 44 는 유지하되 칸 높이를 밀지 않게 세로로 당긴다
  monthButton: { height: 32, marginVertical: -6 },

  // 7칸 고정 — `flexBasis` 로 나눈다. gap 은 시안의 2px
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 2, columnGap: 0 },
  head: { width: `${100 / 7}%`, height: 24, alignItems: "center", justifyContent: "center" },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: radius.small,
  },
  /**
   * 선택은 **면 + 테두리 2px** 이다(`A1.md`) — 색 하나로 말하지 않는다.
   * 시안은 1.5px 이지만 스펙이 2px 을 못박았고, 선택 표시는 접근성 규칙이
   * 걸린 자리라 두꺼운 쪽을 쓴다.
   */
  cellSelected: { backgroundColor: selectedTint, borderWidth: 2, borderColor: primary.normal },
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
});
