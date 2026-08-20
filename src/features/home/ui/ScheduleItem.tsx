import { Pressable, StyleSheet, View, type GestureResponderHandlers } from "react-native";

import { Icon, IconButton, ListCell, Text } from "@/components/ds";
import {
  background,
  fontFamily,
  interaction,
  label as labelColor,
  layout,
  line,
  radius,
  size,
  space,
  status,
} from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";

/**
 * 일정 한 줄 — 새 DS (`Home Sample.dc.html` · `Schedule.dc.html` 4-2·4-5·4-7).
 *
 * 시안이 일정 행을 **Core `ListCell` 하나로 통일**했다(「기존 홈에서 바뀐 점」):
 * `leading` 체크박스 · 제목 · `trailing` ⋮.
 *
 * ## 한 줄에 터치가 둘이다 — 그리고 제목은 이제 터치가 아니다
 *
 * - **체크박스** → 마침 토글. **감정을 묻지 않는다**(N7 · `PLAN.md` A-8).
 *   마친 줄은 **취소선 + `label.neutral`** 로 목록에 남는다(`DESIGN.md` 「홈」)
 * - **⋮** → 수정 / 삭제 메뉴. 옛 디자인에서 **제목 탭**이 하던 일이 여기로 왔다
 * - **제목을 꾹 누르면** 줄이 들려 순서가 바뀐다(`ScheduleList`) — 시안의
 *   「순서 변경: 꾹 누름」이다. 그래서 제목은 눌러도 아무 일이 없다
 *
 * ## 끌 수 없는 사람도 순서를 바꾼다
 *
 * 옛 디자인에는 줄 끝에 **손잡이**가 있었고 거기에 「위로/아래로 이동」 접근성
 * 동작이 달려 있었다. 새 디자인은 손잡이를 없애고(들린 줄에만 글리프가 뜬다)
 * **줄 전체를 꾹 누르는** 방식이라, 그 동작을 **끌기가 시작되는 자리와 같은
 * 요소**(제목)에 옮겨 달았다. 시각이 바뀌어도 스크린리더로 옮기는 길은 그대로다
 * (`RULES.md` 「접근성」 · `PLAN.md` A-4).
 */
type Props = {
  schedule: Schedule;
  onToggleDone: (id: string) => void;
  /** ⋮ — 누른 지점의 y 를 함께 올린다. 메뉴가 그 아래에 뜬다 */
  onMore: (id: string, atY: number) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  /** `ScheduleList` 의 꾹 누르기 — 제목에만 붙는다 */
  dragHandlers?: GestureResponderHandlers;
  /** 들린 줄 — ⋮ 자리에 손잡이 글리프가 온다(시안 4-5·4-6) */
  lifted?: boolean;
};

const ORDER_ACTIONS = [
  { name: "moveUp", label: "위로 이동" },
  { name: "moveDown", label: "아래로 이동" },
];

export function ScheduleItem({
  schedule,
  onToggleDone,
  onMore,
  onMove,
  dragHandlers,
  lifted = false,
}: Props) {
  const { id, title, done } = schedule;

  return (
    <ListCell
      compact
      leading={
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`${title} 마침`}
          // 20 짜리 상자의 44 타깃을 시각 크기를 키우지 않고 채운다 (RULES.md)
          hitSlop={(layout.minTouch - CHECK) / 2}
          onPress={() => onToggleDone(id)}
          style={[styles.check, done ? styles.checkOn : styles.checkOff]}
        >
          {done ? <Icon name="check" size={size.icon.sm} color={labelColor.onFill} /> : null}
        </Pressable>
      }
      title={
        <View
          {...dragHandlers}
          accessible
          accessibilityLabel={title}
          accessibilityHint="꾹 눌러 위아래로 끌면 순서가 바뀌어요"
          accessibilityActions={ORDER_ACTIONS}
          onAccessibilityAction={(e) =>
            onMove(id, e.nativeEvent.actionName === "moveUp" ? "up" : "down")
          }
        >
          <Text
            variant="body1"
            color={done ? labelColor.neutral : labelColor.strong}
            numberOfLines={1}
            style={[styles.title, done ? styles.titleDone : null]}
          >
            {title}
          </Text>
        </View>
      }
      trailing={
        lifted ? (
          <View style={styles.handle}>
            <Icon name="handle" size={size.icon.md} color={labelColor.alternative} />
          </View>
        ) : (
          <IconButton
            name="more-vertical"
            size={size.icon.md}
            accessibilityLabel={`${title} 더보기`}
            color={labelColor.alternative}
            onPress={(e) => onMore(id, e.nativeEvent.pageY)}
            // 히트 44 는 지키되 줄 높이를 밀지 않게 음수 여백으로 당긴다 (시안과 같은 방식)
            style={styles.more}
          />
        )
      }
    />
  );
}

/** 체크박스 한 변 — 제목의 행간(24) 안에 앉는 크기 */
const CHECK = 20;

const styles = StyleSheet.create({
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: radius.small,
    alignItems: "center",
    justifyContent: "center",
    // 제목 첫 줄(행간 24)의 가운데에 맞춘다 — 줄이 길어져도 위에 남는다
    marginTop: (24 - CHECK) / 2,
  },
  // 켜짐은 면으로 말한다 — 「완료 체크」의 색(`DESIGN.md` §1 Status/Positive)
  checkOn: { backgroundColor: status.positive },
  checkOff: { backgroundColor: background.elevated, borderWidth: 1.5, borderColor: line.normal },
  // 시안의 일정 제목은 본문 크기에 600 이다 — 스케일에 13번째 단을 만들지 않고
  // 크기·행간(`body1`)에 웨이트만 얹는다 (로그인에서 정한 판정 · PLAN.md A-7)
  title: { fontFamily: fontFamily.semibold },
  titleDone: { textDecorationLine: "line-through", textDecorationColor: interaction.inactive },
  more: { marginVertical: -space.sm - space.xs2, marginRight: -space.md },
  // ⋮ 가 빠진 자리를 같은 폭으로 채운다 — 들릴 때 제목이 밀리지 않는다
  handle: { width: size.icon.lg, alignItems: "center" },
});
