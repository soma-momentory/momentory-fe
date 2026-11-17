import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { Icon, Text } from "@/components/ds";
import { background, fill, homeV2, label, line, radius, space, wardrobe } from "@/design/ds";

import { attendanceCells, type AttendanceCell } from "../model/wardrobe";
import { TangerineIcon } from "./Tangerine";

/**
 * 출석 이레 — 위에 넷, 아래에 둘과 넓은 이레째 칸. 지난 칸은 체크, 앞 칸은 받을 귤을 보인다.
 * 출석한 칸은 연두 면 + 홈 일정과 같은 녹색 체크, 오늘 칸은 테두리를 굵게 하고 「오늘」이라고 적는다(색만으로 가르지 않는다).
 * 하루를 걸러 첫 칸으로 돌아가도 따로 말하지 않는다.
 */
export function AttendanceGrid({
  day,
  rewards,
  checkedToday,
  stamp = false,
}: {
  day: number;
  rewards: readonly number[];
  checkedToday: boolean;
  /** 오늘 칸의 체크를 도장처럼 톡 찍는다 — 방금 출석한 출석 시트에서만 켠다 */
  stamp?: boolean;
}) {
  const cells = attendanceCells(day, rewards);
  if (cells.length !== 7) return null;
  return (
    <View testID="attendance-grid" style={styles.grid}>
      <View style={styles.row}>{cells.slice(0, 4).map((c) => cell(c, checkedToday, stamp))}</View>
      <View style={styles.row}>{cells.slice(4).map((c) => cell(c, checkedToday, stamp))}</View>
    </View>
  );
}

function cell(c: AttendanceCell, checkedToday: boolean, stamp: boolean) {
  const last = c.day === 7;
  const today = c.state === "today";
  const done = c.state === "past" || (today && checkedToday);
  const name = today ? "오늘" : `${c.day}일째`;
  return (
    <View
      key={c.day}
      testID={`attendance-${c.day}`}
      accessible
      accessibilityLabel={`${name}, ${done ? "출석했어요" : `귤 ${c.amount}개`}`}
      style={[
        styles.cell,
        last ? styles.last : null,
        done ? styles.done : null,
        today ? (done ? styles.todayDone : styles.today) : null,
      ]}
    >
      <View style={last ? styles.lastBody : styles.body}>
        {done ? (
          today && stamp ? (
            <StampedCheck />
          ) : (
            <View style={styles.check}>
              <Icon name="check" size={20} color={homeV2.color.white} />
            </View>
          )
        ) : (
          <TangerineIcon size={last ? wardrobe.attendance.bigIcon : wardrobe.attendance.icon} />
        )}
        <View style={last ? styles.lastCopy : styles.copy}>
          <Text variant="caption2" color={today ? label.strong : label.alternative}>
            {name}
          </Text>
          {done ? null : (
            <Text variant={last ? "headline1" : "label1"} color={label.normal}>
              {c.amount}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

/** 시트가 다 올라온 뒤 찍히도록 기다리는 시간 */
const STAMP_DELAY_MS = 350;

/** 오늘 칸의 체크 — 크게 찍혔다가 제자리로 내려앉는다 */
function StampedCheck() {
  const [scale] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const it = Animated.sequence([
      Animated.delay(STAMP_DELAY_MS),
      Animated.spring(scale, { toValue: 1, stiffness: 260, damping: 12, useNativeDriver: true }),
    ]);
    it.start();
    return () => it.stop();
  }, [scale]);
  return (
    <Animated.View testID="attendance-stamp" style={[styles.check, { transform: [{ scale }] }]}>
      <Icon name="check" size={20} color={homeV2.color.white} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.large,
    backgroundColor: fill.alternative,
  },
  row: { flexDirection: "row", gap: space.sm },
  cell: {
    flex: 1,
    height: wardrobe.attendance.cellHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: line.alternative,
    backgroundColor: background.elevated,
  },
  last: { flex: 2 },
  done: { backgroundColor: wardrobe.attendanceDone, borderColor: wardrobe.attendanceDone },
  today: { borderWidth: 2, borderColor: label.normal },
  todayDone: { borderWidth: 2, borderColor: homeV2.color.green },
  body: { alignItems: "center", gap: space.xs2 },
  copy: { alignItems: "center" },
  lastBody: { flexDirection: "row", alignItems: "center", gap: space.sm },
  lastCopy: { alignItems: "flex-start" },
  check: {
    width: wardrobe.attendance.check,
    height: wardrobe.attendance.check,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: homeV2.color.green,
  },
});
