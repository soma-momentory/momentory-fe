import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { homeV2, secondary, space, wardrobe, withAlpha } from "@/design/ds";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";

import { TangerineIcon } from "./Tangerine";
import { WardrobePopup } from "./WardrobePopup";

/** 귤이 톡 튀어나오는 시간 */
const POP_MS = 520;

/** 빛 알갱이 여덟 — 귤 둘레로 고르게 짧게 튀었다가 사라진다. 노랑 · 연두를 번갈아 쓴다 */
const SPARKLES = Array.from({ length: 8 }, (_, i) => ({
  angle: (i * Math.PI) / 4 - Math.PI / 8,
  color: i % 2 === 0 ? secondary.normal : homeV2.color.greenSoft,
}));

const { center, glow, sparkle, spread } = wardrobe.burst;

/**
 * 미션(일기 · 일정 · 편지)을 끝내고 그 화면을 나온 순간의 귤 카드 — **옷장 팝업과 같은 창**(`WardrobePopup`)이다
 * (2026-11-17 · 옷장의 첫 선물 팝업과 모양 · 버튼을 맞췄다). 귤이 노란 빛을 번지며 톡 튀어나오고 빛 알갱이 여덟이 짧게 튄다.
 * 아래에 왜 받았는지(「오늘 일정을 다 끝냈어요」) · 「귤 N개를 받았어요」 · 「확인」(홈과 같은 천 라벨). 스스로 사라지지 않는다.
 * `TangerineCelebrationHost` 가 띄운다. 「동작 줄이기」를 켠 사람에게는 귤이 튀지 않고 그대로 놓인다.
 */
export function TangerineBurst({
  title,
  amount,
  onDone,
}: {
  title: string;
  amount: number;
  onDone: () => void;
}) {
  // 저장소 관례(`ChatBubble`) — Animated 값은 state 로 한 번 만든다
  const [pop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const it = Animated.timing(pop, {
      toValue: 1,
      duration: POP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (!alive) return;
        if (reduced) pop.setValue(1);
        else it.start();
      });
    return () => {
      alive = false;
      it.stop();
    };
  }, [pop]);

  return (
    <WardrobePopup
      testID="tangerine-burst"
      accessibilityLabel={`${title}. 귤 ${amount}개를 받았어요`}
      onDismiss={onDone}
    >
      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
              transform: [
                { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
            },
          ]}
        />
        {SPARKLES.map((s, i) => (
          <Animated.View
            key={i}
            style={[
              styles.sparkle,
              {
                backgroundColor: s.color,
                opacity: pop.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] }),
                transform: [
                  {
                    translateX: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.cos(s.angle) * spread],
                    }),
                  },
                  {
                    translateY: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.sin(s.angle) * spread],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
        <Animated.View
          style={{
            transform: [
              { scale: pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.3, 1.14, 1] }) },
            ],
          }}
        >
          <TangerineIcon size={center} />
        </Animated.View>
      </View>
      <Text variant="title3Hand" color={homeV2.color.ink} style={styles.center}>
        {title}
      </Text>
      <Text style={styles.note} color={homeV2.color.muted}>
        귤 {amount}개를 받았어요
      </Text>
      <ReflectionButton label="확인" onPress={onDone} style={styles.button} />
    </WardrobePopup>
  );
}

const styles = StyleSheet.create({
  stage: { width: glow, height: glow, alignItems: "center", justifyContent: "center" },
  // 귤 뒤로 번지는 노란 빛 — 첫 선물 팝업과 같다
  glow: {
    position: "absolute",
    width: glow,
    height: glow,
    borderRadius: glow / 2,
    backgroundColor: withAlpha(secondary.normal, 0.35),
  },
  sparkle: {
    position: "absolute",
    width: sparkle,
    height: sparkle,
    borderRadius: sparkle / 2,
  },
  center: { textAlign: "center" },
  note: {
    fontFamily: homeV2.font.regular,
    ...homeV2.type.note,
    textAlign: "center",
    marginBottom: space.xs,
  },
  // 팝업이 이미 좌우 여백을 준다 — 천 라벨의 바깥 여백은 뺀다
  button: { alignSelf: "stretch", marginTop: space.xs, marginHorizontal: 0 },
});
