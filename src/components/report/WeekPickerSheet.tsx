import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheet, IconButton, Text } from "@/components/ds";
import { columnWidth } from "@/components/ds/columnWidth";
import { label as labelColor, primary, radius, selectedTint, space } from "@/design/ds";
import {
  daysOfWeek,
  isPickableWeek,
  monthOf,
  shiftMonth,
  weeksOfMonth,
} from "@/features/report/model/weeklyReport";
import { formatKoreanMonth } from "@/lib/day";

/**
 * `W1` · **주를 고르는 달력** — 날짜 줄을 누르면 열린다.
 *
 * 예전에는 머리의 `‹ ›` 로 한 주씩 옮겼는데, 두 달 전 주를 보려면 여덟 번을 눌러야
 * 했다. 사용자 요청(2026-08-24)으로 **달력에서 바로 고른다.**
 *
 * ## 고르는 단위가 하루가 아니라 **한 주**다
 *
 * 그래서 공용 `Calendar`(`components/ds`)를 쓰지 않는다. 그 달력은 **칸 하나**가
 * 누를 것이고 `selectedDate` 도 하루인데, 여기서는 **줄 하나**가 누를 것이다 —
 * 칸을 누르게 하면 「8월 26일을 골랐더니 8월 24일~30일이 나온다」가 되어, 고른 것과
 * 나온 것이 어긋난다. 줄이 통째로 눌리고 통째로 선택되면 그 어긋남이 없다.
 * (`DESIGN.md` 「옛 컴포넌트에 변형을 더하지 않는다」 — 여기에 새로 만든다.)
 *
 * 격자 계산은 공용 `columnWidth` 를 그대로 쓴다 — 일곱 칸이 각자 반올림되면 합이
 * 부모를 넘어 마지막 칸이 다음 줄로 접힌다(`Calendar` 주석의 같은 함정).
 *
 * ## ⚠ 요일 머리가 **월요일부터**다
 *
 * 공용 `Calendar` 는 일→토인데 여기는 월→일이다. 리포트의 한 주가 서버 기준
 * **월~일**(BE `WeeklyReportService`)이라, 일요일부터 그리면 줄과 리포트가 하루씩
 * 어긋난다. 두 달력이 달라 보이는 것이 어긋나는 것보다 낫다.
 *
 * ## 달을 넘겨도 고르는 것은 주다
 *
 * 그래서 달에 **걸치는** 주를 전부 그린다(`weeksOfMonth`) — 8월을 열어도 첫 줄이
 * 7월에서 시작할 수 있고, 그 줄을 고르면 7월의 주가 열린다. 달 경계는 주와 무관하다.
 * 삐져나온 날은 흐리게 두어 어느 달의 날인지는 보이게 한다.
 *
 * **아직 오지 않은 주는 눌리지 않는다**(`isPickableWeek`) — 셀 것이 없는 주다.
 *
 * 선택은 **색만으로 말하지 않는다**(`RULES.md` 3) — 틴트 면 + 2px 테두리 + 굵은 글자다.
 * ⚠ 굵기는 `caption1`(medium 12) → `label2`(semibold 13) 로 간다. 공용 `Calendar` 는
 * 강조에 `caption2`→`caption1` 을 쓰는데 **그 둘은 semibold→medium 이라 오히려 가늘어진다** —
 * 크기만 커지고 굵기가 빠지면 「굵기를 함께 바꾼다」가 지켜지지 않아 여기서는 쓰지 않았다.
 */
type Props = {
  /** 지금 보고 있는 주의 월요일 */
  weekStart: string;
  /** 고른 주의 월요일. 시트를 닫는 것은 부르는 쪽이다 */
  onSelect: (weekStart: string) => void;
  onDismiss: () => void;
};

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export function WeekPickerSheet({ weekStart, onSelect, onDismiss }: Props) {
  // 열 때는 보고 있던 주가 든 달부터 — 「지금 어디에 있는지」를 먼저 보여준다
  const [month, setMonth] = useState(() => monthOf(weekStart));
  const [gridWidth, setGridWidth] = useState(0);

  const cell = columnWidth(gridWidth, 7);
  const cellSize = cell == null ? MEASURING : { width: cell };

  return (
    <BottomSheet title="주 고르기" onDismiss={onDismiss}>
      <View style={styles.monthRow}>
        <IconButton
          name="chevron-left"
          size={20}
          accessibilityLabel="이전 달"
          onPress={() => setMonth(shiftMonth(month, -1))}
          style={styles.monthButton}
        />
        <Text variant="label1" color={labelColor.strong}>
          {formatKoreanMonth(month)}
        </Text>
        <IconButton
          name="chevron-right"
          size={20}
          accessibilityLabel="다음 달"
          onPress={() => setMonth(shiftMonth(month, 1))}
          style={styles.monthButton}
        />
      </View>

      <View style={styles.head} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={[styles.cell, cellSize]}>
            <Text variant="caption2" color={labelColor.assistive}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.weeks}>
        {weeksOfMonth(month).map((week) => {
          const days = daysOfWeek(week);
          const selected = week === weekStart;
          const pickable = isPickableWeek(week);

          return (
            <Pressable
              key={week}
              accessibilityRole="button"
              accessibilityLabel={weekLabel(days)}
              accessibilityState={{ selected, disabled: !pickable }}
              disabled={!pickable}
              onPress={() => onSelect(week)}
              style={[styles.week, selected ? styles.weekSelected : null]}
            >
              {days.map((date) => (
                <View key={date} style={[styles.cell, cellSize]}>
                  <Text
                    variant={selected ? "label2" : "caption1"}
                    color={dayColor(date, month, selected, pickable)}
                  >
                    {Number(date.slice(8))}
                  </Text>
                </View>
              ))}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/** 「8월 24일 ~ 8월 30일 주」 — 줄 하나가 낭독기에 이렇게 읽힌다 */
function weekLabel(days: readonly string[]) {
  const say = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8))}일`;
  return `${say(days[0] ?? "")} ~ ${say(days[6] ?? "")} 주`;
}

/**
 * 날짜 글자색. 넷을 가른다 — 고를 수 없는 주 · 고른 주 · 이 달의 날 · 옆 달의 날.
 * 옆 달을 흐리게 두는 것은 **삐져나온 줄이 왜 여기 있는지**를 말해 주기 때문이다.
 */
function dayColor(date: string, month: string, selected: boolean, pickable: boolean) {
  if (!pickable) return labelColor.disabled;
  if (monthOf(date) !== month) return labelColor.assistive;
  return selected ? labelColor.strong : labelColor.neutral;
}

/** 폭을 재기 전 한 프레임만 퍼센트로 선다(`Calendar` 와 같은 처리) */
const MEASURING = { width: `${100 / 7}%` } as const;

const CELL_HEIGHT = 38;

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: space.sm,
  },
  monthButton: { marginHorizontal: -space.sm },

  head: { flexDirection: "row", paddingBottom: space.xs },
  weeks: { gap: space.xs2 },

  // 줄 하나가 통째로 눌린다 — 높이 38 이라 44 에는 못 미치지만 **폭이 화면 전체**다
  week: {
    flexDirection: "row",
    alignItems: "center",
    height: CELL_HEIGHT,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: "transparent",
  },
  // 선택은 색만으로 말하지 않는다 — 면 + 2px 테두리 + 굵은 글자(`RULES.md` 3)
  weekSelected: {
    backgroundColor: selectedTint,
    borderWidth: 2,
    borderColor: primary.normal,
  },

  cell: { height: CELL_HEIGHT, alignItems: "center", justifyContent: "center" },
});
