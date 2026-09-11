import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { background, pond, pondMotion, pondSize } from "@/design/ds";
import type { SensePointKind } from "@/features/rest/model/sensePond";

/**
 * 감각의 **표** — 아래 판 한 칸의 글리프(눈 · 음표 · 손)
 * (2026-09-05 · 연못 위의 포인트가 사라지면서 판 전용이 됐다 2026-09-06 ·
 * 찾을 때마다 차오른다 2026-09-11).
 *
 * ## 왜 여기서 그리는가
 *
 * 앱의 아이콘은 Wanted 세트(`components/ds/icons/`)이고 **없는 글리프를 만들지
 * 않는다**(`CLAUDE.md`) — 눈·음표·손은 거기 없다. 그 규칙은 앱 껍데기의 아이콘
 * 이야기다. 감각연못은 격자도 끄고 사는 **작은 별도 세계**라 자기 그림을 자기가
 * 든다(`HoldGlow` 와 같은 판단). 그래서 세트를 늘리지 않고 여기서
 * 세 글리프만 그린다 — 감각연못(`components/rest/pond/`) 밖에서 쓰지 않는다.
 * 글리프만 따로 필요한 곳(`HoldHint` 의 손)은 `SenseGlyph` 를 쓴다.
 *
 * ## 찾을 때마다 물이 차오른다 (2026-09-11 · 사용자 요청)
 *
 * 원 안에 그 감각의 색을 옅게 푼 **물**이 찾은 만큼(`level`) 차 있다 — 보이는 것은
 * 셋으로 나눠, 소리는 둘로, 감각은 한 번에 가득. 셈이 오를 때마다 물마루가 옆으로
 * 한 번 흘러가며(`pondMotion.panelFill.rise`) 새 높이까지 오르고, 원에서 링 하나가
 * 퍼져 사라진다(`ring`) — 연못에서 방금 퍼진 물결이 판까지 닿은 것처럼 읽힌다.
 * 칸은 그 단계의 **첫 손짓**에 떠오르므로(`SensePanel`) 이 표는 늘 0 에서 차오르기
 * 시작한다.
 *
 * 물은 **원 밖으로 넘치지 않게** 원 모양으로 잘린 그릇 안에서만 움직인다. 시계로
 * 끝을 재지 않는다 — 여기서 끝나고 나서 일어나는 일이 없어서다(`SurfaceRipple` 과 다름).
 *
 * ## 셋은 결이 다르다
 *
 * 눈은 풀빛, 소리는 물빛, 손은 흙빛(`pond.markLine`·`markSound`·`markHand`).
 * 셋이 나란히 서므로 색으로도 갈리지만, **그 감각의 결**이 먼저다.
 */
type Props = {
  kind: SensePointKind;
  /** 찬 정도 0~1 — 찾은 개수 ÷ 목표. 오를 때마다 물결치며 그만큼 차오른다 */
  level: number;
};

/** 글리프는 지름 24 의 좌표계에서 그린다 — 판의 원(44) 안에 여백을 두고 앉는다 */
const BOX = 24;
const STROKE = 1.5;

const INK: Record<SensePointKind, string> = {
  eye: pond.markLine,
  sound: pond.markSound,
  hand: pond.markHand,
};

const CHIP = pondSize.panelChip;
const AMP = pondSize.panelWave;

/**
 * 물 한 장 — 폭이 원의 **두 배**이고 물마루 한 주기가 원 폭이다. 원 폭만큼 옆으로
 * 밀면 처음 모양과 이음매 없이 겹친다(흘러가도 끊기지 않는다).
 */
const WAVE_PATH = (() => {
  const w = CHIP * 2;
  const q = CHIP / 4;
  let d = `M0 ${AMP}`;
  for (let x = 0; x < w; x += CHIP) {
    d += ` Q${x + q} 0 ${x + q * 2} ${AMP} T${x + CHIP} ${AMP}`;
  }
  return `${d} V${CHIP + AMP * 2} H0 Z`;
})();

export function SensePointMark({ kind, level }: Props) {
  const ink = INK[kind];
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [rise] = useState(() => new Animated.Value(0));
  const [drift] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));

  // 떠오른다 — 칸이 처음 그려질 때 한 번
  useEffect(() => {
    const it = Animated.timing(pop, {
      toValue: 1,
      duration: pondMotion.panelFill.reveal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [pop]);

  // 차오른다 — 셈이 오를 때마다 물마루가 한 번 흘러가며 새 높이까지
  useEffect(() => {
    if (level <= 0) return;
    const { rise: riseMs, ring: ringMs } = pondMotion.panelFill;
    drift.setValue(0);
    ring.setValue(0);
    const waves = Animated.parallel([
      Animated.timing(rise, {
        toValue: Math.min(level, 1),
        duration: riseMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(drift, {
        toValue: 1,
        duration: riseMs,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(ring, {
        toValue: 1,
        duration: ringMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    waves.start();
    return () => waves.stop();
  }, [level, rise, drift, ring]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        },
      ]}
      testID={`pond-panel-${kind}`}
    >
      {/* 칸에서 퍼져 사라지는 링 하나 — 그릇 밖에 있어야 원보다 커질 수 있다 */}
      <Animated.View
        pointerEvents="none"
        testID="pond-panel-ring"
        style={[
          styles.ring,
          {
            borderColor: ink,
            opacity: ring.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.5, 0] }),
            transform: [
              {
                scale: ring.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, pondSize.panelRing],
                }),
              },
            ],
          },
        ]}
      />

      {/* 원 모양 그릇 — 물이 이 밖으로 넘치지 않는다 */}
      <View style={[styles.bowl, { borderColor: ink }]}>
        <View style={[styles.tint, { backgroundColor: ink }]} />
        <Animated.View
          testID="pond-panel-fill"
          style={[
            styles.water,
            {
              transform: [
                {
                  // 0 이면 물마루까지 원 아래로 숨고, 1 이면 골까지 원 위로 올라 가득 찬다
                  translateY: rise.interpolate({
                    inputRange: [0, 1],
                    outputRange: [CHIP, -AMP * 2],
                  }),
                },
                {
                  translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -CHIP] }),
                },
              ],
            },
          ]}
        >
          <Svg width={CHIP * 2} height={CHIP + AMP * 2}>
            <Path d={WAVE_PATH} fill={ink} fillOpacity={0.26} />
          </Svg>
        </Animated.View>
        <SenseGlyph kind={kind} />
      </View>
    </Animated.View>
  );
}

/** 감각의 글리프만 — 원도 물도 없이 선 그림 하나 */
export function SenseGlyph({
  kind,
  size = BOX,
  color,
}: {
  kind: SensePointKind;
  size?: number;
  color?: string;
}) {
  const ink = color ?? INK[kind];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
      {kind === "eye" ? (
        <>
          {/* 눈꼬리가 살짝 올라간 아몬드 하나 + 눈동자 */}
          <Path
            d="M3.4 12c2.6-3.7 5.4-5.5 8.6-5.5s6 1.8 8.6 5.5c-2.6 3.7-5.4 5.5-8.6 5.5S6 15.7 3.4 12z"
            stroke={ink}
            strokeWidth={STROKE}
            strokeLinejoin="round"
            fill="none"
          />
          <Circle cx={12} cy={12} r={2.2} fill={ink} />
        </>
      ) : null}

      {kind === "sound" ? (
        <>
          {/* 음표 하나 — 기둥과 머리, 그리고 끝의 깃발 */}
          <Path
            d="M10.4 16.2V5.6l7.2-1.6v9.4"
            stroke={ink}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Circle cx={8.2} cy={16.6} r={2.4} fill={ink} />
          <Circle cx={15.4} cy={14.6} r={2.4} fill={ink} />
        </>
      ) : null}

      {kind === "hand" ? (
        <>
          {/* 손바닥과 손가락 — 이 크기에서는 윤곽 하나가 손으로 읽힌다 */}
          <Path
            d="M8.2 12.6V6.4a1.35 1.35 0 012.7 0v4.7m0-.4V4.9a1.35 1.35 0 012.7 0v5.8m0-.3V6.6a1.35 1.35 0 012.7 0v6.9c0 3.4-2.2 5.9-5.4 5.9-2.4 0-3.8-1-4.9-2.9l-1.7-3a1.3 1.3 0 012.2-1.4l1 1.5"
            stroke={ink}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: CHIP,
    height: CHIP,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: CHIP,
    height: CHIP,
    borderRadius: CHIP / 2,
    borderWidth: pondSize.chipRing,
  },
  bowl: {
    width: CHIP,
    height: CHIP,
    borderRadius: CHIP / 2,
    borderWidth: pondSize.chipRing,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    // 그림 위에 바로 앉으므로(판에 바탕이 없다 · 2026-09-11) 그릇 안은 크림으로 채운다 —
    // 비워 두면 뒤의 바위 결이 비쳐 글리프와 물이 읽히지 않는다
    backgroundColor: background.elevated,
  },
  // 빈 그릇에도 그 감각의 색이 아주 옅게 깔린다 — 물이 차오르면 그 위로 한 겹 더
  tint: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: 0.08 },
  water: { position: "absolute", left: 0, top: 0 },
});
