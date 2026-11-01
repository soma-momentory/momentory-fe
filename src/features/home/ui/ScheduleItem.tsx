import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderHandlers,
} from "react-native";

import { Icon } from "@/components/ds/icons/Icon";
import { IconButton } from "@/components/ds/IconButton";
import { ListCell } from "@/components/ds/ListCell";
import { Text } from "@/components/ds/Text";
import {
  background,
  fontFamily,
  homeV2,
  interaction,
  label as labelColor,
  layout,
  line,
  radius,
  raised,
  raisedShadow,
  size,
  space,
  status,
} from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";

import { CheckBurst } from "./CheckBurst";

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
 *   체크하는 순간에는 **작은 끝맺음**이 핀다(2026-10-05 · 사용자 요청) — 상자가 톡 커졌다가
 *   옅은 그림자 위로 내려앉고, 링이 퍼지며 빛 알갱이가 떠오른다(`CheckBurst`). 체크를 풀 때와
 *   처음부터 마친 줄에는 피지 않는다 — 손으로 마친 순간에만
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
 *
 * ## 겉모습은 둘, 논리는 하나 (2026-10-15 · 홈 v2 계획 §2.3)
 *
 * `appearance="paper"` 는 홈 v2 의 종이 목록이다 — **원형 체크 24**(테두리 1.75) · 마치면
 * **녹색 면 + ✓ + 취소선 + 글자색**(색만으로 말하지 않는다) · 교보손글씨. 히트 44 · ⋮ 메뉴 ·
 * 끝맺음 · 끌기 · 접근성 이동은 **같은 코드**를 지난다. 기본 `"ds"` 는 운영 홈 그대로다.
 */
export type ScheduleAppearance = "ds" | "paper";

type Props = {
  schedule: Schedule;
  onToggleDone: (id: string) => void;
  /** ⋮ 터치 위치가 아닌 버튼의 화면상 위·아래 경계를 올린다. */
  onMore: (id: string, topPageY: number, bottomPageY: number) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  /** `ScheduleList` 의 꾹 누르기 — 제목에만 붙는다 */
  dragHandlers?: GestureResponderHandlers;
  /** 들린 줄 — ⋮ 자리에 손잡이 글리프가 온다(시안 4-5·4-6) */
  lifted?: boolean;
  appearance?: ScheduleAppearance;
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
  appearance = "ds",
}: Props) {
  const { id, title, done } = schedule;
  const paper = appearance === "paper";
  const check = paper ? PAPER_CHECK : CHECK;
  const quiet = paper ? homeV2.color.ink : labelColor.alternative;
  // 손으로 마친 횟수 — 바뀔 때마다 끝맺음이 새로 한 번 핀다(`key`)
  const [burst, setBurst] = useState(0);
  const moreRef = useRef<View>(null);
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다
  const [pop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (burst === 0) return;
    pop.setValue(0);
    const it = Animated.timing(pop, {
      toValue: 1,
      duration: POP_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [burst, pop]);

  return (
    <ListCell
      compact
      leading={
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`${title} 마침`}
          // 20(종이 24) 짜리 상자의 44 타깃을 시각 크기를 키우지 않고 채운다 (RULES.md)
          hitSlop={(layout.minTouch - check) / 2}
          onPress={() => {
            if (!done) setBurst((n) => n + 1);
            onToggleDone(id);
          }}
          style={paper ? styles.checkPaper : styles.check}
        >
          {/* 안 마친 상자는 옅은 그림자 위에 떠 있고, 마치면 그 깊이만큼 내려앉아 그림자를 덮는다.
              종이 체크는 그림자 없이 동그라미 하나다 — 마치면 녹색 면에 ✓ 가 선다 */}
          <Animated.View
            style={[
              paper ? styles.circle : styles.box,
              paper
                ? done
                  ? styles.paperOn
                  : styles.paperOff
                : done
                  ? styles.checkOn
                  : styles.checkOff,
              {
                transform: [
                  { translateY: done && !paper ? raised.checkDepth : 0 },
                  {
                    scale: pop.interpolate({
                      inputRange: [0, 0.35, 1],
                      outputRange: [1, POP_SCALE, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {done ? (
              <Icon
                name="check"
                size={size.icon.sm}
                color={paper ? homeV2.color.white : labelColor.onFill}
              />
            ) : null}
          </Animated.View>
          {burst > 0 ? (
            <CheckBurst key={burst} size={check} color={paper ? homeV2.color.green : undefined} />
          ) : null}
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
            color={
              paper
                ? done
                  ? homeV2.color.taskDone
                  : homeV2.color.ink
                : done
                  ? labelColor.neutral
                  : labelColor.strong
            }
            numberOfLines={1}
            style={[
              paper ? styles.titlePaper : styles.title,
              done ? (paper ? styles.titleDonePaper : styles.titleDone) : null,
            ]}
          >
            {title}
          </Text>
        </View>
      }
      trailing={
        lifted ? (
          <View style={styles.handle}>
            <Icon name="handle" size={size.icon.md} color={quiet} />
          </View>
        ) : (
          <View
            ref={moreRef}
            collapsable={false}
            testID={`schedule-more-anchor-${id}`}
            style={styles.more}
          >
            <IconButton
              name="more-vertical"
              size={size.icon.md}
              accessibilityLabel={`${title} 더보기`}
              color={quiet}
              onPress={(e) => {
                const pressedY = e.nativeEvent.pageY;
                if (moreRef.current == null) {
                  onMore(id, pressedY, pressedY + layout.minTouch);
                  return;
                }
                moreRef.current.measureInWindow((_, y, __, height) => {
                  onMore(id, y, y + height);
                });
              }}
            />
          </View>
        )
      }
    />
  );
}

/** 체크박스 한 변 — 제목의 행간(24) 안에 앉는 크기 */
const CHECK = 20;
/** 홈 v2 종이 목록의 원형 체크 지름 */
const PAPER_CHECK = homeV2.size.check;
/** 마치는 순간 상자가 톡 커졌다 돌아오는 시간 · 가장 커지는 배수 */
const POP_MS = 360;
const POP_SCALE = 1.2;

const styles = StyleSheet.create({
  check: {
    width: CHECK,
    height: CHECK,
    // 제목 첫 줄(행간 24)의 가운데에 맞춘다 — 줄이 길어져도 위에 남는다
    marginTop: (24 - CHECK) / 2,
  },
  box: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.small,
    alignItems: "center",
    justifyContent: "center",
  },
  // 켜짐은 면으로 말한다 — 「완료 체크」의 색(`DESIGN.md` §1 Status/Positive)
  checkOn: { backgroundColor: status.positive },
  checkOff: {
    backgroundColor: background.elevated,
    borderWidth: 1.5,
    borderColor: line.normal,
    // 번지지 않는 옅은 그림자 — 쉼터 안 빈티지 버튼의 결(`raised`)
    boxShadow: `0px ${raised.checkDepth}px 0px ${raisedShadow.card}`,
  },
  // 시안의 일정 제목은 본문 크기에 600 이다 — 스케일에 13번째 단을 만들지 않고
  // 크기·행간(`body1`)에 웨이트만 얹는다 (로그인에서 정한 판정 · PLAN.md A-7)
  title: { fontFamily: fontFamily.semibold },
  titleDone: { textDecorationLine: "line-through", textDecorationColor: interaction.inactive },
  more: { marginVertical: -space.sm - space.xs2, marginRight: -space.md },
  // ⋮ 가 빠진 자리를 같은 폭으로 채운다 — 들릴 때 제목이 밀리지 않는다
  handle: { width: size.icon.lg, alignItems: "center" },

  // ── 홈 v2 종이 목록(`appearance="paper"`) — 값은 전부 `homeV2` ──
  checkPaper: { width: PAPER_CHECK, height: PAPER_CHECK },
  circle: {
    ...StyleSheet.absoluteFill,
    borderRadius: PAPER_CHECK / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  // 안 마친 동그라미 — 테두리만(보정한 `taskBorder` · 3:1)
  paperOff: { borderWidth: homeV2.size.checkBorder, borderColor: homeV2.color.taskBorder },
  // 마친 동그라미 — 녹색 면 + ✓(색만으로 말하지 않는다)
  paperOn: {
    borderWidth: homeV2.size.checkBorder,
    borderColor: homeV2.color.green,
    backgroundColor: homeV2.color.green,
  },
  titlePaper: {
    fontFamily: homeV2.font.bold,
    fontSize: homeV2.type.task.fontSize,
    lineHeight: homeV2.type.task.lineHeight,
  },
  titleDonePaper: {
    textDecorationLine: "line-through",
    textDecorationColor: homeV2.color.taskDone,
  },
});
