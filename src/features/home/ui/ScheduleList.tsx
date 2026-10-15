import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, type GestureResponderEvent } from "react-native";

import { background, elevation, fill, hairline, primary, radius, space } from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";

import { ScheduleItem } from "./ScheduleItem";

/**
 * 홈의 일정 목록 — **꾹 눌러 끌어 순서를 바꾼다**
 * (`Schedule.dc.html` 4-5·4-6 · `DESIGN.md` 「일정」 · `PLAN.md` D10).
 *
 * 제스처 라이브러리도 `PanResponder` 도 쓰지 않고 **RN 의 responder 속성**
 * (`onStartShouldSetResponder` 계열)을 제목에 바로 단다. 세로 한 방향의 끌기에
 * 필요한 것이 그뿐이고, 속성은 **이벤트가 날 때 그 순간의 props 를 읽어서** 끄는
 * 도중에도 낡은 값을 보지 않는다(`PanResponder` 는 만들어 둔 콜백을 계속 쓴다).
 *
 * 규칙 셋:
 * 1. **꾹 눌러야 시작한다**(220ms). 바로 끌리면 목록을 훑다가 순서가 바뀐다
 * 2. 끄는 동안 **놓일 자리에 빈 슬롯**이 서고 나머지 줄은 흐려진다(시안 4-6)
 * 3. **끌 수 없어도 옮길 수 있다** — 같은 자리(제목)에 「위로/아래로 이동」
 *    접근성 동작이 달려 있다(`ScheduleItem`)
 *
 * 줄 높이는 고정(`ROW_PITCH`)이라 **몇 칸 옮겼는지를 이동 거리로 나눠 센다** —
 * 줄마다 높이를 재지 않아도 되고, 그래서 프레임마다 다시 그리지 않는다.
 * 새 디자인의 줄은 **제목 한 줄(24) + 줄 간격 20**(`DESIGN.md` §3 「리스트 행 간
 * (일정) 20」)이고, 그 합이 곧 한 칸이다.
 */
const LONG_PRESS_MS = 220;
/** 이 이상 움직이면 「끌기」가 아니라 「스크롤」로 본다 — 꾹 누르기를 취소한다 */
const SLOP = 8;

/** 줄 내용 높이 — 제목 한 줄의 행간(`body1` 24) */
const ROW_CONTENT = 24;
/** 한 칸 = 내용 + 줄 간격 20 */
export const ROW_PITCH = ROW_CONTENT + space.xl;

type Drag = { from: number; to: number; id: string };

type Props = {
  schedules: Schedule[];
  /** 체크박스 — 마침을 켜고 끈다. **감정을 묻지 않는다**(N7) */
  onToggleDone: (id: string) => void;
  /** ⋮ 버튼의 화면상 위·아래 경계 */
  onMore: (id: string, topPageY: number, bottomPageY: number) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onReorder: (id: string, toIndex: number) => void;
  /** 끄는 동안 바깥 스크롤을 멈춘다 — 손가락 하나가 두 일을 하지 않게 */
  onDragStateChange?: (dragging: boolean) => void;
};

export function ScheduleList({
  schedules,
  onToggleDone,
  onMore,
  onMove,
  onReorder,
  onDragStateChange,
}: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  // 애니메이션 값은 한 번 만들어 계속 쓴다 (`chat/TypingDots.tsx` 와 같은 방식)
  const [offset] = useState(() => new Animated.Value(0));
  // 끄는 동안의 자리 — 손가락이 읽고 쓴다. 화면에 보여야 하는 것만 `drag` 로 둔다
  const dragRef = useRef<Drag | null>(null);
  const count = schedules.length;

  useEffect(() => {
    onDragStateChange?.(drag != null);
  }, [drag, onDragStateChange]);

  const begin = useCallback((from: number, id: string) => {
    dragRef.current = { from, to: from, id };
    setDrag({ from, to: from, id });
  }, []);

  const moveBy = useCallback(
    (dy: number) => {
      const d = dragRef.current;
      if (d == null) return;
      offset.setValue(dy);
      const to = Math.min(count - 1, Math.max(0, d.from + Math.round(dy / ROW_PITCH)));
      if (to === d.to) return;
      dragRef.current = { ...d, to };
      setDrag({ ...d, to });
    },
    [count, offset],
  );

  const end = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    offset.setValue(0);
    setDrag(null);
    // 놓으면 바로 기본 상태다 — 「완료」 버튼을 두지 않는다(시안 4-6)
    if (d != null && d.to !== d.from) onReorder(d.id, d.to);
  }, [offset, onReorder]);

  return (
    <View style={[styles.list, { height: count * ROW_PITCH }]}>
      {/* 놓일 자리 — 끄는 동안만 선다 */}
      {drag != null ? (
        <View
          style={[styles.slot, { top: drag.to * ROW_PITCH + (ROW_PITCH - ROW_CONTENT) / 2 }]}
          pointerEvents="none"
        />
      ) : null}

      {schedules.map((s, i) => (
        <DraggableRow
          key={s.id}
          index={i}
          schedule={s}
          drag={drag}
          offset={offset}
          onToggleDone={onToggleDone}
          onMore={onMore}
          onMove={onMove}
          onBegin={begin}
          onMoveBy={moveBy}
          onEnd={end}
        />
      ))}
    </View>
  );
}

function DraggableRow({
  index,
  schedule,
  drag,
  offset,
  onToggleDone,
  onMore,
  onMove,
  onBegin,
  onMoveBy,
  onEnd,
}: {
  index: number;
  schedule: Schedule;
  drag: Drag | null;
  offset: Animated.Value;
  onToggleDone: (id: string) => void;
  onMore: (id: string, topPageY: number, bottomPageY: number) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onBegin: (index: number, id: string) => void;
  onMoveBy: (dy: number) => void;
  onEnd: () => void;
}) {
  // 손가락이 쓰는 값 — **렌더는 건드리지 않는다.** 아래 handler 안에서만 읽는다
  const gesture = useRef({
    active: false,
    timer: null as ReturnType<typeof setTimeout> | null,
    startY: 0,
  });

  const clearTimer = () => {
    const g = gesture.current;
    if (g.timer != null) clearTimeout(g.timer);
    g.timer = null;
  };

  useEffect(() => () => clearTimer(), []);

  const onGrant = (e: GestureResponderEvent) => {
    const g = gesture.current;
    g.startY = e.nativeEvent.pageY;
    g.timer = setTimeout(() => {
      g.active = true;
      onBegin(index, schedule.id);
    }, LONG_PRESS_MS);
  };

  const onMoveEvent = (e: GestureResponderEvent) => {
    const g = gesture.current;
    const dy = e.nativeEvent.pageY - g.startY;
    if (!g.active) {
      // 아직 꾹 누르기 전이다 — 움직였으면 끌기가 아니라고 본다
      if (Math.abs(dy) > SLOP) clearTimer();
      return;
    }
    onMoveBy(dy);
  };

  const onFinish = () => {
    clearTimer();
    if (gesture.current.active) onEnd();
    gesture.current.active = false;
  };

  const dragging = drag?.from === index;
  // 끌리는 줄이 지나간 자리의 줄들이 비켜선다
  const shift =
    drag == null || dragging
      ? 0
      : drag.from < index && index <= drag.to
        ? -ROW_PITCH
        : drag.to <= index && index < drag.from
          ? ROW_PITCH
          : 0;

  return (
    <Animated.View
      style={[
        styles.row,
        { top: index * ROW_PITCH },
        dragging
          ? { transform: [{ translateY: offset }], zIndex: 2 }
          : { transform: [{ translateY: shift }] },
        // 끌리지 않는 줄은 흐려진다 — 지금 움직이는 것이 하나임을 말한다(시안 4-5)
        drag != null && !dragging ? styles.dimmed : null,
      ]}
    >
      <View style={dragging ? styles.lifted : null}>
        <ScheduleItem
          schedule={schedule}
          onToggleDone={onToggleDone}
          onMore={onMore}
          onMove={onMove}
          lifted={dragging}
          dragHandlers={{
            onStartShouldSetResponder: () => true,
            // 끄는 도중에는 바깥(스크롤)에 넘기지 않는다
            onResponderTerminationRequest: () => !gesture.current.active,
            onResponderGrant: onGrant,
            onResponderMove: onMoveEvent,
            onResponderRelease: onFinish,
            onResponderTerminate: onFinish,
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 줄을 절대 배치한다 — 칸이 고정이라 끌기 계산과 화면이 같은 수를 본다
  list: { position: "relative" },
  row: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ROW_PITCH,
    justifyContent: "center",
  },
  // 들린 줄 — 면 + Primary 링 + 그림자로 떠 있다는 것이 읽힌다(시안 4-5)
  lifted: {
    borderRadius: radius.medium,
    backgroundColor: background.elevated,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: primary.normal,
    ...elevation.overlay,
  },
  dimmed: { opacity: 0.45 },
  // 놓일 자리 — 빈 슬롯. 점선이 아니라 옅은 면 하나다(시안 4-6)
  slot: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ROW_CONTENT,
    borderRadius: radius.small,
    backgroundColor: fill.alternative,
    ...hairline.alternative,
  },
});
