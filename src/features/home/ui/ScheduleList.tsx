import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  PixelRatio,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";

import {
  background,
  elevation,
  fill,
  hairline,
  homeV2,
  maxFontScale,
  primary,
  radius,
  space,
  text,
} from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";

import { ScheduleItem, type ScheduleAppearance } from "./ScheduleItem";

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
 * ## 한 칸(`pitch`)은 잰 값 하나다 (2026-10-15 · 홈 v2 계획 §2.3 · 결정 DN-3)
 *
 * 줄 높이는 고르다는 전제(제목 한 줄 · 말줄임)라 **몇 칸 옮겼는지를 이동 거리로 나눠 센다** —
 * 줄마다 높이를 재지 않아도 되고, 그래서 프레임마다 다시 그리지 않는다.
 * 새 디자인의 줄은 **제목 한 줄(24) + 줄 간격 20**(`DESIGN.md` §3 「리스트 행 간
 * (일정) 20」)이고, 그 합이 곧 한 칸이다.
 *
 * 그 한 칸을 전에는 상수 44 로 두었는데, 큰 글꼴 배율에서 제목 줄이 커지면 **줄이 겹치고
 * 끄는 거리와 놓이는 자리가 어긋났다.** 이제 **첫 줄 내용의 실제 높이**(`onLayout`)를 재서 한 칸을
 * 정하고, 재기 전에는 글꼴 배율로 어림한다. 줄 위치 · 목록 높이 · 빈 슬롯 · 끌기 칸 수 · 비켜서는
 * 거리 · 줄 높이 — **여섯 자리가 전부 이 `pitch` 하나**를 쓴다.
 *
 * - 배율 1 에서는 **한 칸이 예전과 같은 44** 다 — 배율 1 의 내용 높이를 넘은 만큼만 더한다(`rowPitchFor`)
 * - **끄는 도중에는 시작할 때의 한 칸으로 끝낸다** — 끌기가 끝난 뒤에 새 값을 쓴다
 * - 잰 한 칸은 `onRowPitch` 로 올린다 — 홈 v2 의 배치 판정(LY-1 · P3)이 따로 재지 않고 이 값을 쓴다
 */
const LONG_PRESS_MS = 220;
/** 이 이상 움직이면 「끌기」가 아니라 「스크롤」로 본다 — 꾹 누르기를 취소한다 */
const SLOP = 8;

/** 줄 내용 높이 — 제목 한 줄의 행간(`body1` 24) */
const ROW_CONTENT = 24;
/** 한 칸 = 내용 + 줄 간격 20 — **배율 1 의 기본값**이다. 실제 배치는 잰 `pitch` 를 쓴다 */
export const ROW_PITCH = ROW_CONTENT + space.xl;
/** 홈 v2 종이 목록의 한 칸 — v2 시안의 줄 높이(48) */
const PAPER_ROW_PITCH = 48;

/**
 * 겉모습마다 **배율 1 의 한 칸**과 그때의 **내용 높이**. 내용은 그리는 글자의 행간이다 —
 * `body1` 은 플랫폼 보정(iOS 1.2)을 타서 iOS 에서는 24 가 아니라 29 다(`ds/typography.ts`).
 */
const GEOMETRY = {
  ds: { pitch: ROW_PITCH, content: text.body1.lineHeight },
  paper: { pitch: PAPER_ROW_PITCH, content: homeV2.type.task.lineHeight },
} as const;

/**
 * 잰 내용 높이 → 한 칸. **배율 1 의 한 칸에 늘어난 만큼만 더한다** — 배율 1 에서는 예전과 같은
 * 44(종이 48)이고, 줄이 커진 만큼 칸이 커져 겹치지 않는다(안드로이드에서는 「내용 + 20」과 같다).
 * 재기 전에는 글꼴 배율로 어림한다. 반올림은 소수점 측정 오차로 배율 1 의 칸이 흔들리지 않게.
 */
export function rowPitchFor(appearance: ScheduleAppearance, measured: number | null) {
  const base = GEOMETRY[appearance];
  const content = measured ?? base.content * Math.min(PixelRatio.getFontScale(), maxFontScale);
  return base.pitch + Math.max(0, Math.round(content - base.content));
}

type Drag = { from: number; to: number; id: string; pitch: number };

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
  /** 겉모습 — 운영 홈(`ds`)과 홈 v2 종이(`paper`). **논리는 하나다**(계획 §2.3) */
  appearance?: ScheduleAppearance;
  /** 배치에 쓰는 한 칸이 바뀔 때마다 올린다 — 올린 값과 줄 배치 값은 같다 */
  onRowPitch?: (pitch: number) => void;
};

export function ScheduleList({
  schedules,
  onToggleDone,
  onMore,
  onMove,
  onReorder,
  onDragStateChange,
  appearance = "ds",
  onRowPitch,
}: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  // 애니메이션 값은 한 번 만들어 계속 쓴다 (`chat/TypingDots.tsx` 와 같은 방식)
  const [offset] = useState(() => new Animated.Value(0));
  // 끄는 동안의 자리 — 손가락이 읽고 쓴다. 화면에 보여야 하는 것만 `drag` 로 둔다
  const dragRef = useRef<Drag | null>(null);
  const count = schedules.length;
  const paper = appearance === "paper";

  const livePitch = rowPitchFor(appearance, measured);
  // 끄는 도중에는 시작할 때의 한 칸으로 끝낸다 — 그 사이 잰 값은 끌기가 끝난 뒤에 쓴다
  const pitch = drag?.pitch ?? livePitch;
  // 놓일 자리의 높이 — 칸에서 줄 간격을 뺀 만큼(배율 1 의 운영 홈에서 예전과 같은 24)
  const slot = pitch - (GEOMETRY[appearance].pitch - ROW_CONTENT);

  useEffect(() => {
    onDragStateChange?.(drag != null);
  }, [drag, onDragStateChange]);

  useEffect(() => {
    onRowPitch?.(pitch);
  }, [pitch, onRowPitch]);

  const measure = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setMeasured((prev) => (prev === h ? prev : h));
  }, []);

  const begin = useCallback(
    (from: number, id: string) => {
      const d = { from, to: from, id, pitch: livePitch };
      dragRef.current = d;
      setDrag(d);
    },
    [livePitch],
  );

  const moveBy = useCallback(
    (dy: number) => {
      const d = dragRef.current;
      if (d == null) return;
      offset.setValue(dy);
      const to = Math.min(count - 1, Math.max(0, d.from + Math.round(dy / d.pitch)));
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
    <View testID="schedule-list" style={[styles.list, { height: count * pitch }]}>
      {/* 놓일 자리 — 끄는 동안만 선다 */}
      {drag != null ? (
        <View
          testID="schedule-drop-slot"
          style={[
            styles.slot,
            paper ? styles.slotPaper : null,
            { top: drag.to * pitch + (pitch - slot) / 2, height: slot },
          ]}
          pointerEvents="none"
        />
      ) : null}

      {schedules.map((s, i) => (
        <DraggableRow
          key={s.id}
          index={i}
          schedule={s}
          drag={drag}
          pitch={pitch}
          offset={offset}
          appearance={appearance}
          onMeasure={i === 0 ? measure : undefined}
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
  pitch,
  offset,
  appearance,
  onMeasure,
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
  pitch: number;
  offset: Animated.Value;
  appearance: ScheduleAppearance;
  /** 첫 줄만 받는다 — 그 내용 높이가 한 칸을 정한다 */
  onMeasure?: (e: LayoutChangeEvent) => void;
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

  const paper = appearance === "paper";
  const dragging = drag?.from === index;
  // 끌리는 줄이 지나간 자리의 줄들이 비켜선다
  const shift =
    drag == null || dragging
      ? 0
      : drag.from < index && index <= drag.to
        ? -pitch
        : drag.to <= index && index < drag.from
          ? pitch
          : 0;

  return (
    <Animated.View
      testID={`schedule-row-${schedule.id}`}
      style={[
        styles.row,
        { top: index * pitch, height: pitch },
        // 종이 목록은 줄 사이에 가는 선을 긋는다 — 줄 칸의 윗변이 곧 두 내용의 한가운데다.
        // 끄는 동안에는 줄이 움직여 선이 어긋나므로 지운다
        paper && index > 0 && drag == null ? styles.divider : null,
        dragging
          ? { transform: [{ translateY: offset }], zIndex: 2 }
          : { transform: [{ translateY: shift }] },
        // 끌리지 않는 줄은 흐려진다 — 지금 움직이는 것이 하나임을 말한다(시안 4-5)
        drag != null && !dragging ? styles.dimmed : null,
      ]}
    >
      <View style={dragging ? [styles.lifted, paper ? styles.liftedPaper : null] : null}>
        {/* 내용 높이만 잰다 — 들린 줄의 안쪽 여백은 세지 않는다 */}
        <View testID={onMeasure != null ? "schedule-row-measure" : undefined} onLayout={onMeasure}>
          <ScheduleItem
            schedule={schedule}
            onToggleDone={onToggleDone}
            onMore={onMore}
            onMove={onMove}
            lifted={dragging}
            appearance={appearance}
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
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 줄을 절대 배치한다 — 칸이 한 값이라 끌기 계산과 화면이 같은 수를 본다
  list: { position: "relative" },
  row: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
  },
  divider: { borderTopWidth: 1, borderTopColor: homeV2.color.separator },
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
  // 종이 목록의 들린 줄 — 카드 면 + 녹색 링(홈 v2 · 글로벌 색을 섞지 않는다)
  liftedPaper: { backgroundColor: homeV2.color.card, borderColor: homeV2.color.green },
  dimmed: { opacity: 0.45 },
  // 놓일 자리 — 빈 슬롯. 점선이 아니라 옅은 면 하나다(시안 4-6)
  slot: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: radius.small,
    backgroundColor: fill.alternative,
    ...hairline.alternative,
  },
  slotPaper: { backgroundColor: homeV2.color.separator },
});
