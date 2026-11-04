import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

import { pondSceneMotion } from "@/design/ds";

/** 스며 나오기 — 붙는 순간 옅게 올라온다. 내용을 바꿀 때는 `key` 를 바꿔 다시 붙인다 */
export function Appear({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: pondSceneMotion.appear.duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            {
              translateY: v.interpolate({
                inputRange: [0, 1],
                outputRange: [pondSceneMotion.appear.rise, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** 톡 — `from` 배율에서 제 크기로 살짝 튕기며 자리 잡는다(셈이 오를 때 · 감각 표가 바뀔 때) */
export function Pop({
  children,
  from,
  style,
}: {
  children: ReactNode;
  from: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [v] = useState(() => new Animated.Value(from));
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [v]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}
