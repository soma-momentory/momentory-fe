import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { RisingMotes, type Mote } from "@/components/rest/scene/RisingMotes";
import { secondary, status } from "@/design/ds";

/**
 * 일정을 마쳤다고 체크한 순간의 **작은 끝맺음** (2026-10-05 · 사용자 요청).
 *
 * 몸에 힘 빼기의 끝(다 찬 링이 퍼지며 사라지고 빛 알갱이가 떠오른다)을 체크박스 크기로
 * 줄였다 — 링 하나가 바깥으로 퍼져 옅어지고, 초록 · 노랑 알갱이 여섯이 조금 떠올라
 * 사라진다. 한 번만 핀다. 체크를 풀 때는 피지 않는다(`ScheduleItem`).
 *
 * 체크박스 한가운데에 놓인 폭 0 짜리 점이다. 장식이라 손짓을 받지 않는다.
 */
type Props = {
  /** 체크박스 한 변 — 링이 이 크기에서 퍼진다 */
  size: number;
};

/** 링이 퍼져 사라지는 시간 · 다 퍼진 크기(체크박스의 배수) */
const RING_MS = 520;
const RING_SCALE = 2.4;

/** 알갱이 하나가 떠올라 사라지는 시간 · 다음 알갱이까지의 간격 */
const MOTE_MS = 900;
const MOTE_STAGGER = 60;

/** 체크박스 가운데 기준(dp · y 는 아래가 +). 난수가 아니라 표라서 매번 같은 모양으로 핀다 */
const GREEN: readonly Mote[] = [
  { x: -12, y: 2, rise: 26, drift: -6, size: 4 },
  { x: 11, y: -2, rise: 32, drift: 5, size: 5 },
  { x: 2, y: -9, rise: 22, drift: 2, size: 3 },
];
const YELLOW: readonly Mote[] = [
  { x: -6, y: -7, rise: 30, drift: -3, size: 4 },
  { x: 14, y: 5, rise: 20, drift: 7, size: 3 },
  { x: -15, y: -4, rise: 18, drift: -8, size: 3 },
];

export function CheckBurst({ size }: Props) {
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다
  const [bloom] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const it = Animated.timing(bloom, {
      toValue: 1,
      duration: RING_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [bloom]);

  return (
    <View testID="check-burst" pointerEvents="none" style={styles.origin}>
      <Animated.View
        style={[
          styles.ring,
          {
            left: -size / 2,
            top: -size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            transform: [
              { scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [1, RING_SCALE] }) },
            ],
          },
        ]}
      />
      <RisingMotes
        left={0}
        bottom={0}
        motes={GREEN}
        duration={MOTE_MS}
        stagger={MOTE_STAGGER}
        color={status.positive}
      />
      <RisingMotes
        left={0}
        bottom={0}
        motes={YELLOW}
        duration={MOTE_MS}
        stagger={MOTE_STAGGER}
        color={secondary.normal}
        delay={MOTE_STAGGER / 2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 체크박스 한가운데의 점 — 부모(체크박스)의 50% 자리
  origin: { position: "absolute", left: "50%", top: "50%", width: 0, height: 0 },
  ring: { position: "absolute", borderWidth: 2, borderColor: status.positive },
});
