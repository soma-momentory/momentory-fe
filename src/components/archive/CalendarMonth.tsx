import { Image, Pressable, StyleSheet, View } from "react-native";

import { MOOD_ICONS } from "@/components/icons/moodIcons";
import { AppText } from "@/components/primitives/AppText";
import { paperCalendar, paperColors, paperTypography } from "@/design/paper";
import { calendarCells, type CalendarCell } from "@/features/archive/model/archive";
import type { Diary } from "@/features/diary/model/diary";

/**
 * 보관함 달력 — `A1` · 새 디자인(`docs/design/prototype/보관함.dc.html` ·
 * `design-system.md` §4.6).
 *
 * **달력으로 언제, 목록으로 어떤 마음이었는지 찾는다**(`A1.md`).
 *
 * 옛 판의 **감정 점 3개**는 **감정 얼굴 아이콘 하나**로 바뀌었다(시안 §4.6) —
 * 22px 얼굴이 54 짜리 칸 안에 들어간다. 나머지 규칙은 그대로다:
 *
 * - **색만으로 감정을 판단하게 하지 않는다** — 얼굴은 그날이 있었다는 표시일
 *   뿐이고, 이름은 날짜를 눌렀을 때 아래 기록 카드가 글자로 보여준다
 * - 기록이 있는 날은 면이 밝고(`paperCalendar.recorded`) 없는 날은
 *   가라앉는다(`empty`). **선택일은 잉크 면 + 밝은 글자 + 테두리 2px + 굵기** —
 *   색 하나로만 고른 날을 말하지 않는다(`RULES.md` · `PLAN.md` §3-1)
 * - 오늘은 **굵게**, 앞으로 올 날은 **흐리게**(`A1.md`)
 * - 감정 태그가 없는 일기는 얼굴 없이 **밝은 면**만 남는다 — 기록이 있었다는 표시
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
  const weeks = byWeek(calendarCells(diaries, month));

  return (
    <View style={styles.root}>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <AppText
            key={d}
            style={[
              styles.weekday,
              i === 0 ? styles.sunday : null,
              i === WEEKDAYS.length - 1 ? styles.saturday : null,
            ]}
          >
            {d}
          </AppText>
        ))}
      </View>

      {weeks.map((week, w) => (
        <View key={`week-${w}`} style={styles.row}>
          {week.map((cell, i) => (
            <Cell
              key={cell?.day ?? `blank-${w}-${i}`}
              cell={cell}
              today={cell?.day != null && cell.day === today}
              // 앞으로 올 날 — 오늘이 그달에 있을 때만 판단할 수 있다
              future={today != null && cell?.day != null && cell.day > today}
              selected={cell?.day != null && cell.day === selected}
              onSelect={onSelect}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** 7칸씩 끊고 마지막 줄의 남는 칸은 `null` 로 채운다 — 줄마다 폭이 같아야 달력이다 */
function byWeek(cells: readonly CalendarCell[]) {
  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += WEEKDAYS.length) {
    const week: (CalendarCell | null)[] = cells.slice(i, i + WEEKDAYS.length);
    while (week.length < WEEKDAYS.length) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function Cell({
  cell,
  today,
  future,
  selected,
  onSelect,
}: {
  cell: CalendarCell | null;
  today: boolean;
  future: boolean;
  selected: boolean;
  onSelect: (day: number) => void;
}) {
  if (cell?.day == null) return <View style={styles.cell} />;

  const day = cell.day;
  const face = cell.emotions[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${day}일`}
      accessibilityState={{ selected }}
      onPress={() => onSelect(day)}
      style={[
        styles.cell,
        cell.hasDiary ? styles.cellRecorded : styles.cellEmpty,
        selected ? styles.cellSelected : null,
      ]}
    >
      <AppText
        weight={selected || today ? "700" : "400"}
        style={[
          styles.number,
          future ? styles.numberFuture : null,
          selected ? styles.numberSelected : null,
        ]}
      >
        {day}
      </AppText>

      {face != null ? (
        <Image
          source={MOOD_ICONS[face]}
          style={styles.face}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </Pressable>
  );
}

const { styles: type } = paperTypography;
const { cell } = paperCalendar;

const styles = StyleSheet.create({
  root: { gap: cell.gap },

  week: { flexDirection: "row", gap: cell.gap },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: paperCalendar.dayHeaderSize,
    lineHeight: paperCalendar.dayHeaderSize + 5,
    // 시안의 평일 `#8A8474` 는 카드 위 4.2 로 미달 — 같은 역할의 보정 토큰을 쓴다
    color: paperColors.text.mutedWarmText,
  },
  sunday: { color: paperColors.text.sunday },
  saturday: { color: paperColors.text.saturday },

  row: { flexDirection: "row", gap: cell.gap },
  // 폭은 7등분(시안의 `repeat(7,1fr)`)이고 높이만 54 로 고정이다
  cell: {
    flex: 1,
    height: cell.size,
    borderRadius: cell.radius,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  cellRecorded: { backgroundColor: paperCalendar.recorded },
  cellEmpty: { backgroundColor: paperCalendar.empty },
  // 고른 날 — 면·글자색만이 아니라 테두리 2px 과 굵기가 함께 바뀐다
  cellSelected: {
    backgroundColor: paperCalendar.selected,
    borderWidth: 2,
    borderColor: paperColors.brand.greenBorder,
  },
  number: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.fontSize + 4,
    color: paperColors.text.primary,
  },
  numberFuture: { color: paperColors.text.faint },
  numberSelected: { color: paperCalendar.onSelected },
  face: { width: cell.icon, height: cell.icon },
});
