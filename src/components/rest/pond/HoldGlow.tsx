import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { pond, pondLayout, pondMotion, pondSize } from "@/design/ds";

/**
 * 잠시 누르고 있는 동안 손끝에서 **차오르는 따뜻한 빛** — 감각 단계의 손짓.
 *
 * 누른 자리에서 온기가 `pondMotion.hold` 에 걸쳐 넓어지고 짙어진다 — 다 차면
 * 연못이 완료로 셈하고 큰 파동(`Ripple` · `warm`)을 한 번 퍼뜨린다. 손을 일찍 떼면
 * (`released`) 짧게 사라진다 — 아무 것도 남기지 않는다.
 *
 * ## 테두리를 두르지 않는다
 *
 * 예전에는 테를 두른 원이 커졌다 — 물 위의 온기가 아니라 **로딩 원**으로 읽혔다.
 * 지금은 가운데가 밝고 가장자리로 갈수록 사라지는 번짐 하나다(`RadialGradient`).
 * 파동과 같은 이유로 세로가 눌린 타원이다(`pondLayout.flatten` · 2026-09-04).
 *
 * 「얼마나 남았나」를 눈금으로 보여 주지 않는다 — 숫자로 압박하지 않는 것과 같은
 * 결이다(`RULES.md` 4). 차오르는 빛의 크기와 밝기가 그 자리를 대신한다.
 *
 * 빛 자신은 시간을 재지 않는다 — 완료 판정은 연못(`PondScene`)의 타이머가 한다.
 * 여기는 그 시간에 맞춰 **보이는 것**만 맡는다.
 */
type Props = {
  x: number;
  y: number;
  /** 손을 뗐다 — 사라진 뒤 `onGone` 을 부른다 */
  released: boolean;
  onGone: () => void;
};

/** 한 번에 하나만 뜬다 — 그림 안에서만 쓰는 이름이라 겹칠 일이 없다 */
const GRADIENT_ID = "pondHoldGlow";

export function HoldGlow({ x, y, released, onGone }: Props) {
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [progress] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const grow = Animated.timing(progress, {
      toValue: 1,
      duration: pondMotion.hold,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    grow.start();
    return () => grow.stop();
  }, [progress]);

  useEffect(() => {
    if (!released) return;
    const out = Animated.timing(fade, {
      toValue: 0,
      duration: pondMotion.holdCancel,
      useNativeDriver: true,
    });
    out.start();
    const gone = setTimeout(onGone, pondMotion.holdCancel);
    return () => {
      clearTimeout(gone);
      out.stop();
    };
    // onGone 은 부모가 매 렌더 새로 주지만, 사라지는 일은 한 번이면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [released, fade]);

  const size = pondSize.holdGlow;
  const flat = pondLayout.flatten;
  return (
    <Animated.View
      pointerEvents="none"
      testID="pond-hold-glow"
      style={[
        styles.glow,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          opacity: Animated.multiply(
            fade,
            progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.95] }),
          ),
          transform: [
            { scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
            {
              scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2 * flat, flat] }),
            },
          ],
        },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={GRADIENT_ID} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={pond.warmCore} stopOpacity={0.85} />
            <Stop offset="0.5" stopColor={pond.warmSoft} stopOpacity={0.5} />
            <Stop offset="1" stopColor={pond.warm} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={size / 2}
          cy={size / 2}
          rx={size / 2}
          ry={size / 2}
          fill={`url(#${GRADIENT_ID})`}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute" },
});
