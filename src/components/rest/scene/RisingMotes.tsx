import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View, type DimensionValue } from "react-native";

/**
 * 끝맺음의 **빛 알갱이** — 한 점 둘레에서 차례로 떠올라 옆으로 조금 흘러가며 사라진다
 * (2026-10-05). 몸에 힘 빼기의 끝에서 처음 쓰였고 걱정상자의 두 끝이 함께 쓴다.
 *
 * 한 번만 핀다 — 고리로 돌지 않는다. 알갱이의 자리 · 높이 · 크기는 각 콘텐츠의 토큰
 * 표(`bodyReleaseFinish.motes` · `worryBoxFinish.motes`)라서 매번 같은 모양으로 핀다.
 * 장식이라 손짓을 받지 않는다.
 */
export type Mote = {
  /** 기준점에서의 출발 자리(dp · y 는 아래가 +) */
  x: number;
  y: number;
  /** 떠오르는 높이 · 옆으로 흘러가는 거리 · 지름 */
  rise: number;
  drift: number;
  size: number;
};

type Props = {
  testID?: string;
  /** 기준점 — 장면 안의 가로 자리와 바닥에서의 높이 */
  left: DimensionValue;
  bottom: number;
  motes: readonly Mote[];
  /** 알갱이 하나가 떠올라 사라지는 시간 · 다음 알갱이까지의 간격 */
  duration: number;
  stagger: number;
  color: string;
  /** 첫 알갱이가 뜨기 전에 쉬는 시간 — 함께 떠오르는 것(카드 등)에 맞춘다 */
  delay?: number;
};

export function RisingMotes({
  testID,
  left,
  bottom,
  motes,
  duration,
  stagger,
  color,
  delay = 0,
}: Props) {
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [lift] = useState(() => motes.map(() => new Animated.Value(0)));

  useEffect(() => {
    const it = Animated.sequence([
      Animated.delay(delay),
      Animated.stagger(
        stagger,
        lift.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
        ),
      ),
    ]);
    it.start();
    return () => it.stop();
  }, [lift, duration, stagger, delay]);

  return (
    <View testID={testID} pointerEvents="none" style={[styles.origin, { left, bottom }]}>
      {motes.map((m, i) => (
        <Animated.View
          key={i}
          style={[
            styles.mote,
            {
              left: m.x - m.size / 2,
              top: m.y - m.size / 2,
              width: m.size,
              height: m.size,
              borderRadius: m.size / 2,
              backgroundColor: color,
              shadowColor: color,
              opacity: lift[i]!.interpolate({
                inputRange: [0, 0.2, 0.7, 1],
                outputRange: [0, 1, 0.8, 0],
              }),
              transform: [
                {
                  translateY: lift[i]!.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -m.rise],
                  }),
                },
                {
                  translateX: lift[i]!.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, m.drift],
                  }),
                },
                { scale: lift[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 기준점 — 폭 0 짜리 점
  origin: { position: "absolute", width: 0, height: 0 },
  // 빛에 번지는 알갱이 — iOS 는 같은 색 그림자로 살짝 빛난다
  mote: {
    position: "absolute",
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
