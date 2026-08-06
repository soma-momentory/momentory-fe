import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { archive } from "@/design/tokens.mvp";
import { calendarCells, type CalendarCell } from "@/features/archive/model/archive";
import type { Diary } from "@/features/diary/model/diary";

/**
 * 보관함 달력 — `A1`. `momentory.css` `.cd` · `.cdd` · `.cdo`.
 *
 * **달력으로 언제, 목록으로 어떤 마음이었는지 찾는다**(`A1.md`).
 *
 * - **일기가 있는 날에만 점**이 찍히고 **하루 최대 3개**다. 넘으면 늘리지 않는다
 * - **색만으로 감정을 판단하게 하지 않는다** — 날짜를 누르면 아래 카드가
 *   이름을 글자로 보여준다. 그래서 이 컴포넌트는 점만 그리고 판단하지 않는다
 * - 오늘은 **굵게**, 앞으로 올 날은 **흐리게**. 선택된 날은 **테두리 2px + 면**
 *   — 셋이 서로 다른 표시라 겹쳐도 구분된다
 * - 감정 태그가 없는 일기는 **중립색 점 하나**(기록은 있었다는 표시)
 */
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

type Props = {
  diaries: readonly Diary[];
  /** `2026-07` */
  month: string;
  /** 오늘 날짜의 일(日). 그달이 아니면 `null` */
  today: number | null;
  selected: number | null;
  onSelect: (day: number) => void;
};

export function CalendarMonth({ diaries, month, today, selected, onSelect }: Props) {
  const cells = calendarCells(diaries, month);

  return (
    <View>
      <View style={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <AppText key={d} tone="caption" style={styles.weekday}>
            {d}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, i) => (
          <Cell
            key={cell.day ?? `blank-${i}`}
            cell={cell}
            today={cell.day != null && cell.day === today}
            // 앞으로 올 날 — 오늘이 그달에 있을 때만 판단할 수 있다
            future={today != null && cell.day != null && cell.day > today}
            selected={cell.day != null && cell.day === selected}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
}

function Cell({
  cell,
  today,
  future,
  selected,
  onSelect,
}: {
  cell: CalendarCell;
  today: boolean;
  future: boolean;
  selected: boolean;
  onSelect: (day: number) => void;
}) {
  if (cell.day == null) return <View style={styles.cell} />;

  const day = cell.day;
  // 감정 태그가 없는 일기도 기록이 있었다는 표시는 남긴다
  const dots = cell.hasDiary && cell.emotions.length === 0 ? [null] : cell.emotions;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${day}일`}
      accessibilityState={{ selected }}
      onPress={() => onSelect(day)}
      style={[styles.cell, selected ? styles.cellSelected : null]}
    >
      <AppText
        tone={future ? "caption" : selected || today ? "strong" : "body"}
        weight={selected || today ? "700" : "500"}
        style={styles.number}
      >
        {day}
      </AppText>

      {/* 점은 자리를 늘 차지한다 — 있고 없고에 따라 숫자가 위아래로 흔들리지 않게 */}
      <View style={styles.dots}>
        {dots.map((e, i) => (
          <View
            key={`${e ?? "none"}-${i}`}
            style={[
              styles.dot,
              { backgroundColor: e == null ? semantic.textMuted : theme.emotions[e - 1]?.base },
            ]}
          />
        ))}
      </View>
    </Pressable>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  weekdays: { flexDirection: "row", paddingBottom: 6 },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: archive.calendar.weekdaySize,
    lineHeight: 16,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  // 7열 — 폭을 비율로 주고 정사각으로 만든다(시안의 aspect-ratio 1)
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cellSelected: {
    borderWidth: archive.calendar.selectedBorderWidth,
    borderColor: semantic.accent, // primary — 장식 전용 색이 맞는 자리
    borderRadius: archive.calendar.selectedRadius,
    backgroundColor: semantic.surfaceTone,
  },
  number: { fontSize: archive.calendar.numberSize, lineHeight: archive.calendar.numberSize },
  dots: { flexDirection: "row", gap: archive.calendar.dotGap, height: archive.calendar.dot },
  dot: {
    width: archive.calendar.dot,
    height: archive.calendar.dot,
    borderRadius: archive.calendar.dot / 2,
  },
});
