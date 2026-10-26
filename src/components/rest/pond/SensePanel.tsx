import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, pondMotion, pondPanelVeil, pondSize, space } from "@/design/ds";
import {
  SENSE_POND_PANEL_TITLE,
  SENSE_POND_STEPS,
  progressText,
  type SensePondStep,
  type SensePondStepId,
} from "@/features/rest/model/sensePond";

import { SensePointMark } from "./SensePointMark";
import { SceneCard } from "../scene/SceneChrome";
import { SceneVeil } from "../scene/SceneVeil";

/**
 * 연못 바닥에 뜨는 **감각 칸 묶음**
 * (2026-09-05 크림 판 · 진행 중 한 줄 2026-09-06 · 찾을 때마다 칸이 뜨는 투명 판 2026-09-11).
 *
 * ## 처음에는 판이 없다 (2026-09-11 · 사용자 요청)
 *
 * 들어온 직후에는 아래에 아무것도 없다 — 빈 칸도, 판도. 연못이 화면 끝까지 이어진다.
 * **첫 손짓**에 판이 아래에서 올라오고, 그 가운데에 방금 찾은 감각의 칸 하나가 뜬다.
 * 화면은 판이 보일지를 정하고(아무것도 찾지 않았으면 그리지 않는다), 이 판은 이미
 * 찾은 칸만 그린다.
 *
 * ## 칸은 가운데에서 하나씩 늘어난다
 *
 * 칸은 그 단계의 **첫 손짓**에 뜬다 — 보기의 첫 손짓에 눈 칸이 가운데에, 듣기의 첫
 * 손짓에 음표 칸이 오른쪽에 붙으며 둘이 함께 가운데로 옮겨 앉고, 감각에서 셋이 된다.
 * 옮겨 앉는 것은 레이아웃이 아니라 **움직임**이다(`translateX` · `panelFill.shift`) —
 * 레이아웃으로 다시 늘어놓으면 앞선 칸이 한 프레임에 툭 튄다. 같은 단계의 손짓은 칸을
 * 늘리지 않고 그 칸의 물을 한 겹 더 채운다(`SensePointMark`).
 *
 * ## 다 채우면 「다 채웠어요」
 *
 * 완료하면 셋이 가득 찬 칸 위에 「다 채웠어요」가 뜨고, 아래에 「쉼터로 돌아가기」가
 * 붙는다. 칸은 새로 그리지 않는다 — 진행 중에 찬 그 칸들이 그대로 남는다.
 *
 * ## 판에는 바탕이 없다 (2026-09-11 · 사용자 요청)
 *
 * 크림 면도 둥근 모서리도 실선도 없다 — 칸과 글과 버튼이 **연못 그림 위에 그대로**
 * 앉는다. 그대로 두면 이름·셈이 아래쪽 바위·풀 그림에 묻혀서(실기기), 위쪽 글과
 * 같은 방식으로 **경계 없이 아래로 짙어지는 빛**(`pondPanelVeil`)만 뒤에 깐다. 판은 장면 아래에 쌓이지 않고 장면 위 바닥에 떠 있다(`absolute`) — 쌓으면
 * 판이 나타나는 순간 장면이 그만큼 줄어 연못 그림이 다시 잘리고 카피바라와 물이 손끝
 * 아래서 움직인다. 완료로 판이 높아지면 화면이 장면을 그만큼 위로 올려 카피바라가
 * 칸에 가리지 않게 한다(`onLayout` 으로 높이를 알린다).
 */
type Props = {
  /** 지금 단계. 완료하면 없다 — 그때 「다 채웠어요」와 `footer` 가 붙는다 */
  current: SensePondStepId | null;
  /** 단계별로 몇 개를 찾았나 — 지난 단계는 목표만큼, 아직 안 온 단계는 0 */
  found: Record<SensePondStepId, number>;
  /** 판 아래에 붙는 것 — 완료의 「쉼터로 돌아가기」 */
  footer?: React.ReactNode;
  /** 화면 아래 시스템 영역 — 버튼이 그 위에 선다 */
  bottomInset: number;
  /** 판의 높이가 정해지거나 바뀌었다 — 화면이 장면을 비켜 올릴지 정한다 */
  onLayout?: (e: LayoutChangeEvent) => void;
};

export function SensePanel({ current, found, footer, bottomInset, onLayout }: Props) {
  const finished = current == null;
  // 이미 찾은 칸만 — 단계는 순서대로 오므로 앞에서부터 이어진다
  const shown = SENSE_POND_STEPS.filter((s) => found[s.id] > 0);
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [rise] = useState(() => new Animated.Value(0));

  // 올라온다 — 판이 처음 그려질 때(첫 손짓) 한 번
  useEffect(() => {
    const it = Animated.timing(rise, {
      toValue: 1,
      duration: pondMotion.panelFill.reveal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [rise]);

  return (
    <Animated.View
      testID="pond-panel"
      onLayout={onLayout}
      pointerEvents="box-none"
      style={[
        styles.panel,
        { paddingBottom: bottomInset + (finished ? space.lg : space.md) },
        {
          opacity: rise,
          transform: [
            {
              translateY: rise.interpolate({
                inputRange: [0, 1],
                outputRange: [pondSize.panelRise, 0],
              }),
            },
          ],
        },
      ]}
    >
      {finished ? (
        <DoneCard found={found} footer={footer} />
      ) : (
        <>
          <PanelVeil />
          <View style={styles.row}>
            {/* 줄의 높이만 잡는 보이지 않는 칸 — 진짜 칸은 가운데를 기준으로 떠 있다 */}
            <View style={styles.sizer} pointerEvents="none" {...decorativeAccessibilityProps}>
              <View style={styles.chipSpace} />
              <Text variant="label1"> </Text>
              <Text variant="body1"> </Text>
            </View>
            {shown.map((it, i) => (
              <PanelCell
                key={it.id}
                step={it}
                found={found[it.id]}
                index={i}
                count={shown.length}
              />
            ))}
          </View>
          {footer != null ? <View style={styles.footer}>{footer}</View> : null}
        </>
      )}
    </Animated.View>
  );
}

/** 칸 하나가 줄 가운데에서 떨어진 거리 — 칸 수가 늘면 모두가 함께 옮겨 앉는다 */
const offsetOf = (index: number, count: number) => (index - (count - 1) / 2) * pondSize.panelCell;

/** 칸 하나 — 찾은 만큼 찬 표와 이름·셈. 뜰 때는 제 자리에서, 늘어나면 옆으로 옮겨 앉는다 */
function PanelCell({
  step,
  found,
  index,
  count,
}: {
  step: SensePondStep;
  found: number;
  index: number;
  count: number;
}) {
  const [x] = useState(() => new Animated.Value(offsetOf(index, count)));
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const it = Animated.timing(fade, {
      toValue: 1,
      duration: pondMotion.panelFill.reveal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [fade]);

  useEffect(() => {
    const it = Animated.timing(x, {
      toValue: offsetOf(index, count),
      duration: pondMotion.panelFill.shift,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [x, index, count]);

  return (
    <Animated.View
      testID="pond-panel-cell"
      accessible
      accessibilityLabel={progressText(step, found)}
      style={[styles.cell, { opacity: fade, transform: [{ translateX: x }] }]}
    >
      <SensePointMark kind={step.point} level={found / step.goal} />
      <Text variant="label1" color={labelColor.neutral}>
        {step.panelLabel}
      </Text>
      <Text variant="body1" color={labelColor.strong}>
        {Math.min(found, step.goal)} / {step.goal}
      </Text>
    </Animated.View>
  );
}

/** 판 뒤의 빛 한 겹 — 판 윗변 위에서 0 으로 시작해 아래로 짙어진다(경계선이 없다) */
function PanelVeil() {
  return <SceneVeil testID="pond-panel-veil" stops={pondPanelVeil.stops} style={styles.veil} />;
}

/**
 * 완료의 판 — **크림 카드 하나**에 「다 채웠어요」와 가득 찬 셋을 작게 담고, 그 아래 돌아가는
 * 버튼 (2026-10-05 · 쉼 콘텐츠 공통 규칙).
 *
 * 진행 중의 판(빛 한 겹 위의 큰 칸)에 제목과 버튼을 쌓으면 판이 화면 아래 3분의 1 을 넘어
 * 크림빛이 카피바라 몸 전체를 덮었다 — 예전에는 장면을 위로 비켜 올려 피했는데, 그게
 * 화면이 딸려 오는 것처럼 보여 지웠다. 그래서 완료에는 판을 낮춘다: 셈은 이름 없이
 * 표와 「3 / 3」만 한 줄로, 빛 한 겹 대신 카드로. 카피바라는 발끝만 카드 뒤로 들어간다.
 */
function DoneCard({
  found,
  footer,
}: {
  found: Record<SensePondStepId, number>;
  footer?: React.ReactNode;
}) {
  return (
    <>
      <SceneCard>
        <DoneTitle />
        <View style={styles.doneRow}>
          {SENSE_POND_STEPS.map((s) => (
            <View
              key={s.id}
              testID="pond-panel-cell"
              accessible
              accessibilityLabel={progressText(s, found[s.id])}
              style={styles.doneItem}
            >
              <SensePointMark kind={s.point} level={1} />
              <Text variant="headline1" color={labelColor.strong}>
                {Math.min(found[s.id], s.goal)} / {s.goal}
              </Text>
            </View>
          ))}
        </View>
      </SceneCard>
      {footer}
    </>
  );
}

/** 「다 채웠어요」 — 마지막 칸이 가득 찬 뒤 판 위에 뜬다 */
function DoneTitle() {
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const it = Animated.timing(fade, {
      toValue: 1,
      duration: pondMotion.panelFill.reveal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [fade]);

  return (
    <Animated.View style={{ opacity: fade }}>
      <Text variant="headline1" color={labelColor.strong} style={styles.title}>
        {SENSE_POND_PANEL_TITLE}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 바탕이 없다 — 칸과 글이 연못 그림 위에 그대로 앉는다
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.lg,
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  // 판 전체 뒤 + 윗변 위로 `fade` 만큼 — 판이 커지면 함께 커진다
  veil: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: -pondPanelVeil.fade,
  },
  title: { textAlign: "center" },
  row: { alignItems: "center" },
  sizer: { alignItems: "center", gap: space.xs2, opacity: 0 },
  chipSpace: { width: pondSize.panelChip, height: pondSize.panelChip },
  // 줄 가운데를 기준으로 선다 — 옆으로 옮겨 앉는 것은 `translateX` 가 한다
  cell: {
    position: "absolute",
    top: 0,
    left: "50%",
    width: pondSize.panelCell,
    marginLeft: -pondSize.panelCell / 2,
    alignItems: "center",
    gap: space.xs2,
  },
  footer: { paddingTop: space.xs, gap: space.sm, alignItems: "center" },
  doneRow: { flexDirection: "row", justifyContent: "space-around" },
  doneItem: { flexDirection: "row", alignItems: "center", gap: space.xs },
});
