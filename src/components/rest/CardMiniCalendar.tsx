import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperCalendar, paperColors, paperRadius, paperTypography } from "@/design/paper";

/**
 * 행동 카드 달력 — `docs/design/prototype/쉼터.dc.html` 의 작은 달력.
 *
 * **카드가 있는 날만 고를 수 있다**(`app-flow.md` §2.4 — "카드 없는 날은
 * `cursor:default`"). 없는 날을 누를 수 있게 두면 빈 화면으로 데려가게 된다.
 *
 * 보관함의 `CalendarMonth`(셀 54)와 **다른 컴포넌트**다 — 여기 셀은 27 이고
 * 감정 아이콘 대신 **채움만** 쓴다.
 */
type Props = {
  /** `2026-07` */
  month: string;
  /** 이 달에 카드가 있는 날짜들 (`YYYY-MM-DD`) */
  cardDays: readonly string[];
  /** 고른 날짜 (`YYYY-MM-DD`) — 이 달이 아니면 `null` */
  selected: string | null;
  onSelect: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** 더 갈 곳이 없으면 잠근다 */
  canPrev?: boolean;
  canNext?: boolean;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const monthLabel = (month: string) => `${Number(month.slice(5, 7))}월`;

export function CardMiniCalendar({
  month,
  cardDays,
  selected,
  onSelect,
  onPrevMonth,
  onNextMonth,
  canPrev = true,
  canNext = true,
}: Props) {
  const [y, m] = [Number(month.slice(0, 4)), Number(month.slice(5, 7))];
  const first = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const cells = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Arrow label="이전 달" glyph="‹" enabled={canPrev} onPress={onPrevMonth} />
        <AppText weight="700" style={styles.month}>
          {`${y}년 ${monthLabel(month)}`}
        </AppText>
        <Arrow label="다음 달" glyph="›" enabled={canNext} onPress={onNextMonth} />
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <AppText
            key={d}
            style={[
              styles.weekday,
              i === 0 ? styles.sunday : null,
              i === 6 ? styles.saturday : null,
            ]}
          >
            {d}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day == null) return <View key={`pad-${i}`} style={styles.cell} />;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const has = cardDays.includes(date);
          const on = selected === date;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !has }}
              accessibilityLabel={`${Number(month.slice(5, 7))}월 ${day}일${has ? " 행동 카드" : ""}`}
              disabled={!has}
              onPress={() => onSelect(date)}
              style={[styles.cell, has ? styles.cellHas : null, on ? styles.cellOn : null]}
            >
              <AppText
                weight={has ? "700" : "400"}
                style={[styles.day, has ? styles.dayHas : null, on ? styles.dayOn : null]}
              >
                {day}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Arrow({
  label,
  glyph,
  enabled,
  onPress,
}: {
  label: string;
  glyph: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      hitSlop={12}
      onPress={onPress}
    >
      <AppText style={[styles.arrow, enabled ? null : styles.arrowOff]}>{glyph}</AppText>
    </Pressable>
  );
}

const { styles: type } = paperTypography;
const { mini } = paperCalendar;

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: paperRadius.card,
    backgroundColor: paperColors.bg.cardSoft,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  month: {
    fontSize: type.cardTitle.fontSize,
    lineHeight: type.cardTitle.lineHeight,
    color: paperColors.text.primary,
  },
  arrow: { fontSize: 20, lineHeight: 24, color: paperColors.text.primary },
  arrowOff: { color: paperColors.text.faint },

  week: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: paperCalendar.dayHeaderSize,
    lineHeight: paperCalendar.dayHeaderSize + 4,
    color: paperColors.text.mutedWarmText,
  },
  sunday: { color: paperColors.text.sunday },
  saturday: { color: paperColors.text.saturday },

  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: mini.gap },
  cell: {
    width: `${100 / 7}%`,
    height: mini.size,
    alignItems: "center",
    justifyContent: "center",
  },
  // 카드가 있는 날만 채운다 — 없는 날은 누를 수도 없다
  cellHas: { borderRadius: mini.radius },
  cellOn: { borderRadius: mini.radius },
  day: {
    width: mini.size,
    height: mini.size,
    borderRadius: mini.radius,
    textAlign: "center",
    lineHeight: mini.size,
    fontSize: type.caption.fontSize,
    color: paperColors.text.faint,
  },
  dayHas: { backgroundColor: paperColors.brand.green, color: paperColors.text.onFill },
  dayOn: { backgroundColor: paperCalendar.selected, color: paperCalendar.onSelected },
});
