import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { motion } from "@/design/ds";

/**
 * 「이번 주 감정」에서 **고른 칸을 살짝 키우는** 판 — 홈의 주간 줄과 리포트의 7일 흐름이
 * 함께 쓴다(2026-09-11 · 사용자 요청 「자연스럽게 선택되게」).
 *
 * ## 링을 두르던 것을 키우는 것으로 바꿨다
 *
 * 전에는 고른 칸에 **둥근 링(1.5→2.5)**을 둘렀다. 색 점일 때는 원에 원이라 맞았는데,
 * 칸이 **조약돌 그림**(`EmotionPebble`)이 되자 어긋났다 — 조약돌은 정원이 아니고 그림이
 * 링 위를 덮어서, 링이 군데군데 끊긴 **깨진 테두리**로 보였다(실기기 · 홈은 링 색이 비어
 * 기본 검정으로까지 그려졌다).
 *
 * 그래서 테두리를 없애고 **칸이 살짝 커지는 것 하나로만** 말한다(`LIFT`). 조약돌 모양이
 * 어떻든 어긋날 선이 없다. `motion.duration` 으로 부드럽게 커지고, 다른 칸을 고르면 앞
 * 칸은 같은 박자로 제 크기로 돌아온다.
 *
 * ⚠ **뒤에 옅은 둥근 빛을 깔았다가 뺐다**(2026-09-11 · 사용자 요청). 조약돌 뒤에 불투명한
 * 판이 한 겹 더 생겨 보였다 — 커지는 것만으로 충분히 갈린다.
 *
 * ⚠ **색만으로 말하지 않는다는 규칙은 그대로다**(`RULES.md` 「색만 금지」) — 고른 칸은
 * **크기**가 달라지고, 그날 감정이 **글자로** 드러난다.
 *
 * ## 커진 칸이 잘리지도, 옆 칸을 밀지도 않게
 *
 * 커진 칸은 원래 칸(26)보다 크다. 칸 상자를 넘치게 그리면 기기에 따라 잘릴 수 있어서,
 * **상자를 커진 크기로 잡고 음수 여백으로 자리는 칸 크기만큼만 차지한다** — 옆 칸도 아래
 * 요일 글자도 밀리지 않는다.
 */
type Props = {
  selected: boolean;
  /** 칸의 지름 — 커지는 크기는 이 값에서 잰다 */
  size: number;
  children: ReactNode;
};

/** 고른 칸이 커지는 비율 — 옆 칸과 확실히 갈리되 요일 글자에 닿지 않는 폭이다 */
const LIFT = 1.18;

export function SelectLift({ selected, size, children }: Props) {
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다
  const [lift] = useState(() => new Animated.Value(selected ? 1 : 0));

  useEffect(() => {
    const run = Animated.timing(lift, {
      toValue: selected ? 1 : 0,
      duration: motion.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [lift, selected]);

  // 픽셀 격자에 맞춘다 — 소수 상자는 가장자리를 흐리게 만든다
  const box = Math.round(size * LIFT);
  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, LIFT] });

  return (
    <View
      pointerEvents="none"
      style={[styles.box, { width: box, height: box, margin: (size - box) / 2 }]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
