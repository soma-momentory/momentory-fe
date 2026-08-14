import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, type GestureResponderEvent } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperRadius } from "@/design/paper";
import type { Schedule } from "@/features/home/model/types";

import { ROW_HEIGHT, ScheduleRow } from "./ScheduleRow";

/**
 * 홈의 일정 목록 — **손잡이를 꾹 눌러 끌어 순서를 바꾼다**
 * (`docs/design/prototype/홈.dc.html` · `PLAN.md` D10).
 *
 * 제스처 라이브러리도 `PanResponder` 도 쓰지 않고 **RN 의 responder 속성**
 * (`onStartShouldSetResponder` 계열)을 손잡이에 바로 단다. 세로 한 방향의 끌기에
 * 필요한 것이 그뿐이고, 속성은 **이벤트가 날 때 그 순간의 props 를 읽어서** 끄는
 * 도중에도 낡은 값을 보지 않는다(`PanResponder` 는 만들어 둔 콜백을 계속 쓴다).
 *
 * 규칙 셋:
 * 1. **꾹 눌러야 시작한다**(220ms). 바로 끌리면 목록을 훑다가 순서가 바뀐다
 * 2. 끄는 동안 **놓일 자리에 점선 슬롯**이 서고, 사이에 낀 줄들이 비켜선다
 * 3. **손잡이를 잡을 수 없어도 옮길 수 있다** — 손잡이에 「위로/아래로 이동」
 *    접근성 동작을 달았다(`ScheduleRow`). 끌기만 있으면 스크린리더로는 못 옮긴다
 *
 * 줄 높이는 고정(`ROW_HEIGHT`)이라 **몇 칸 옮겼는지를 이동 거리로 나눠 센다** —
 * 줄마다 높이를 재지 않아도 되고, 그래서 프레임마다 다시 그리지 않는다.
 */
const LONG_PRESS_MS = 220;
/** 이 이상 움직이면 「끌기」가 아니라 「스크롤」로 본다 — 꾹 누르기를 취소한다 */
const SLOP = 8;

type Drag = { from: number; to: number; id: string };

type Props = {
  schedules: Schedule[];
  /** 원 탭 — 마침을 켜고 끈다. 켤 때 감정 시트를 여는 것은 홈이 정한다 */
  onToggleDone: (id: string) => void;
  onOpen: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onReorder: (id: string, toIndex: number) => void;
  /** 끄는 동안 바깥 스크롤을 멈춘다 — 손가락 하나가 두 일을 하지 않게 */
  onDragStateChange?: (dragging: boolean) => void;
};

export function ScheduleList({
  schedules,
  onToggleDone,
  onOpen,
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
      const to = Math.min(count - 1, Math.max(0, d.from + Math.round(dy / ROW_HEIGHT)));
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
    if (d != null && d.to !== d.from) onReorder(d.id, d.to);
  }, [offset, onReorder]);

  return (
    <View style={styles.list}>
      {/* 놓일 자리 — 끄는 동안만 선다 */}
      {drag != null ? (
        <View style={[styles.slot, { top: drag.to * ROW_HEIGHT }]} pointerEvents="none">
          <AppText style={styles.slotLabel}>놓일 자리</AppText>
        </View>
      ) : null}

      {schedules.map((s, i) => (
        <DraggableRow
          key={s.id}
          index={i}
          schedule={s}
          drag={drag}
          offset={offset}
          onToggleDone={onToggleDone}
          onOpen={onOpen}
          onMove={onMove}
          onBegin={begin}
          onMoveBy={moveBy}
          onEnd={end}
          dividerBelow={i < schedules.length - 1}
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
  onOpen,
  onMove,
  onBegin,
  onMoveBy,
  onEnd,
  dividerBelow,
}: {
  index: number;
  schedule: Schedule;
  drag: Drag | null;
  offset: Animated.Value;
  onToggleDone: (id: string) => void;
  onOpen: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onBegin: (index: number, id: string) => void;
  onMoveBy: (dy: number) => void;
  onEnd: () => void;
  dividerBelow: boolean;
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
        ? -ROW_HEIGHT
        : drag.to <= index && index < drag.from
          ? ROW_HEIGHT
          : 0;

  return (
    <Animated.View
      style={[
        styles.row,
        dragging
          ? { transform: [{ translateY: offset }], zIndex: 2, ...styles.lifted }
          : { transform: [{ translateY: shift }] },
        drag != null && !dragging ? styles.dimmed : null,
      ]}
    >
      <ScheduleRow
        schedule={schedule}
        variant="paper"
        onToggleDone={onToggleDone}
        onOpen={onOpen}
        onMove={onMove}
        dragHandlers={{
          onStartShouldSetResponder: () => true,
          // 끄는 도중에는 바깥(스크롤)에 넘기지 않는다
          onResponderTerminationRequest: () => !gesture.current.active,
          onResponderGrant: onGrant,
          onResponderMove: onMoveEvent,
          onResponderRelease: onFinish,
          onResponderTerminate: onFinish,
        }}
        dividerBelow={dividerBelow && drag == null}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { position: "relative" },
  row: { height: ROW_HEIGHT, justifyContent: "center", backgroundColor: paperColors.bg.card },
  // 들린 줄 — 떠 있다는 것이 그림자로 읽힌다
  lifted: {
    borderRadius: paperRadius.field,
    shadowColor: paperColors.line.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.22,
    elevation: 8,
  },
  dimmed: { opacity: 0.45 },
  slot: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderRadius: paperRadius.field,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: paperColors.neutral.task,
    alignItems: "center",
    justifyContent: "center",
  },
  slotLabel: { fontSize: 12, lineHeight: 18, color: paperColors.text.mutedWarmText },
});
