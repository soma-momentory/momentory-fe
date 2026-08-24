import { ScrollView, StyleSheet, View } from "react-native";

import { BottomSheet, Icon, ListCell, ListDivider, Text } from "@/components/ds";
import { label as labelColor, primary, space } from "@/design/ds";
import type { WeekOption } from "@/features/report/model/weeklyReport";

/**
 * `W1` · **주를 고르는 목록** — 날짜 줄을 누르면 열린다.
 *
 * 두 번 갈아탔다. 처음에는 머리의 `‹ ›` 로 한 주씩 옮겼고(두 달 전 주를 보려면
 * 여덟 번을 눌러야 했다), 다음에는 달력에서 줄(주)을 골랐다. 지금은 **목록**이다 —
 * 사용자 요청(2026-08-24).
 *
 * ## 왜 달력이 아니라 목록인가
 *
 * 달력은 **없는 주를 함께 보여준다.** 한 달을 열면 다섯 줄이 서는데 그중 기록이
 * 남은 주는 한둘일 때가 많아서, 고를 수 있는 것과 없는 것을 눈으로 갈라야 했다.
 * 목록은 **설 수 있는 줄만 선다** — 「무엇을 고를 수 있나」가 곧 목록의 길이다.
 * 달을 넘겨 가며 찾을 일도 없어졌다(최근 주가 맨 위다).
 *
 * ## 「4주차」만으로는 어느 날인지 모른다
 *
 * 그래서 줄마다 **날짜 범위와 일기 수를 함께** 적는다. 몇 주차인지는 사람이 세지
 * 않는 값이라(달마다 첫 일요일이 다르다) 이름만 두면 고를 근거가 없다.
 *
 * 선택은 **색만으로 말하지 않는다**(`RULES.md` 3) — 오른쪽에 체크 표시가 선다.
 */
type Props = {
  /** 최근 주가 위로. 만드는 것은 `weekOptions` 다 */
  weeks: readonly WeekOption[];
  /** 지금 보고 있는 주의 일요일 */
  weekStart: string;
  /** 고른 주의 일요일. 시트를 닫는 것은 부르는 쪽이다 */
  onSelect: (weekStart: string) => void;
  onDismiss: () => void;
};

/** 시트가 화면을 다 먹지 않게 — 넘치면 목록 안에서 구른다 */
const MAX_LIST_HEIGHT = 380;

export function WeekPickerSheet({ weeks, weekStart, onSelect, onDismiss }: Props) {
  return (
    <BottomSheet title="주 고르기" onDismiss={onDismiss}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {weeks.map((week, i) => {
          const selected = week.weekStart === weekStart;

          return (
            <View key={week.weekStart}>
              {i > 0 ? <ListDivider /> : null}
              <ListCell
                title={week.thisWeek ? `${week.name} · 이번 주` : week.name}
                description={describe(week)}
                trailing={
                  selected ? <Icon name="check" size={20} color={primary.normal} /> : undefined
                }
                onPress={() => onSelect(week.weekStart)}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* 목록이 이번 주 한 줄뿐일 수 있다 — 왜 짧은지 말해 둔다 */}
      <Text variant="caption1" color={labelColor.alternative}>
        일기를 남긴 주가 목록에 쌓여요
      </Text>
    </BottomSheet>
  );
}

/** 「8월 24일 ~ 8월 30일 · 일기 3일」 — 기록이 없는 주는 뒤를 붙이지 않는다 */
const describe = (week: WeekOption) =>
  week.diaryCount === 0 ? week.range : `${week.range} · 일기 ${week.diaryCount}일`;

const styles = StyleSheet.create({
  list: { maxHeight: MAX_LIST_HEIGHT, marginTop: space.sm },
  // 마지막 줄이 아래 안내 한 줄에 붙지 않게 사이를 벌린다
  content: { paddingBottom: space.sm },
});
