import { StyleSheet, View } from "react-native";

import { Icon, Text } from "@/components/ds";
import { label as labelColor, space, status } from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";

/**
 * 그날 일정 — 읽기 전용. `A1` 선택 날짜와 `A3` 기록 상세가 **같은 줄**을 쓴다
 * (`Archive.dc.html` A1·A3 이 실제로 같은 마크업이다).
 *
 * - 완료: **초록 체크 + 취소선 + `Label/Neutral`**. `design.md` §1 이 Label/Neutral 을
 *   「완료 일정」 자리로 못박았다 — 시안의 `Label/Alternative` 보다 이쪽을 따른다
 * - 미완료: 체크 자리만큼 들여쓴다 — 체크 대신 빈 동그라미를 두지 않는다.
 *   **안 한 일에 표식을 붙이면 목록이 미달의 목록이 된다**(`RULES.md` 「숫자로 압박 금지」와 같은 결)
 * - 여기서 완료를 **바꾸지 않는다** — 지난 날의 기록이고, 완료는 홈에서 한다
 *
 * ⚠ 일정 store 는 아직 **오늘 하루치**만 든다. 지난 날을 열면 넘어오는 줄이 없어
 * 이 블록이 통째로 숨는다 — 그것이 「일정이 없는 날」과 같은 처리다(`app-flow.md` §2.3).
 * 날짜별 조회가 붙으면 부르는 쪽의 selector 만 바뀐다.
 */
type Props = {
  schedules: readonly Schedule[];
  /** 블록 제목. 없으면 줄만 그린다 (`A1` 은 위 카드가 이미 날짜를 말한다) */
  title?: string;
};

export function DayScheduleList({ schedules, title }: Props) {
  if (schedules.length === 0) return null;

  return (
    <View style={styles.root}>
      {title != null ? (
        <Text variant="headline1" color={labelColor.strong}>
          {title}
        </Text>
      ) : null}

      {schedules.map((s) => (
        <View key={s.id} style={[styles.row, s.done ? null : styles.rowOpen]}>
          {s.done ? <Icon name="circle-check" size={16} color={status.positive} /> : null}
          <Text
            variant="body2"
            color={s.done ? labelColor.neutral : labelColor.strong}
            style={s.done ? styles.done : null}
          >
            {s.title}
          </Text>
        </View>
      ))}
    </View>
  );
}

// 체크(16) + 사이 여백(6) 만큼 — 완료한 줄과 글자 왼끝이 맞는다
const INDENT = 22;

const styles = StyleSheet.create({
  root: { gap: space.md },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  rowOpen: { paddingLeft: INDENT },
  done: { textDecorationLine: "line-through" },
});
