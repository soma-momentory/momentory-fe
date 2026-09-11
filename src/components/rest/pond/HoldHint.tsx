import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, pond, pondMotion, pondSize, radius, space } from "@/design/ds";

import { SenseGlyph } from "./SensePointMark";

/**
 * 감각 단계의 **「꾸욱」 알약** — 설명 아래에서 오래 눌러야 한다는 것을 한 번 더 말한다
 * (2026-09-11 · 사용자 요청).
 *
 * ## 왜 따로 세우는가
 *
 * 보기·듣기는 톡이고 감각만 잠시 누르기다. 톡 두 단계를 지나온 손은 셋째에서도
 * 톡 치고, 짧은 누름은 세지 않으니 **아무 일도 없는 화면**이 된다. 설명 문장 끝의
 * 한 마디로는 모자라서, 손 글리프와 한 줄을 흙빛 알약에 담아 설명 아래 세운다.
 *
 * ## 조용히 숨 쉬고, 일찍 떼면 한 번 톡 튄다
 *
 * 알약은 천천히 커졌다 돌아오기를 되풀이한다(`pondMotion.holdHint.breathe` ·
 * `pondSize.hintBreathe`) — 깜빡이지 않고 색도 바꾸지 않는다. 손을 일찍 떼면
 * (`nudge` 가 오른다) 한 번 톡 튀며 `again`(「조금 더 오래 눌러요」)으로 바뀌고,
 * `holdHint.nudge` 가 지나면 원래 말로 돌아온다. 경고가 아니라 다시 알려 주는
 * 것이라 흔들지도 붉히지도 않는다(`RULES.md` 「오류는 한 줄로 흡수」와 같은 결).
 *
 * 글자는 알약 면(`pond.warmCore`) 위의 `label.strong` 이다 — 감각연못의 색은 장식
 * 전용이라 글자색으로 쓰지 않는다(`color.ts` 「pond」).
 */
type Props = {
  text: string;
  /** 일찍 뗐을 때 잠시 바뀌는 말 */
  again: string;
  /** 일찍 뗀 횟수 — 오를 때마다 한 번 톡 튀며 `again` 으로 바뀐다 */
  nudge: number;
};

export function HoldHint({ text, again, nudge }: Props) {
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [breathe] = useState(() => new Animated.Value(0));
  const [bump] = useState(() => new Animated.Value(0));
  // 「조금 더 오래」가 **이미 물러난** 손짓 — `nudge` 가 이보다 크면 그 말이 서 있다
  const [expired, setExpired] = useState(0);

  useEffect(() => {
    const half = pondMotion.holdHint.breathe / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  useEffect(() => {
    if (nudge <= 0) return;
    bump.setValue(1);
    const settle = Animated.timing(bump, {
      toValue: 0,
      duration: pondMotion.headingSwap.in,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    settle.start();
    const back = setTimeout(() => setExpired(nudge), pondMotion.holdHint.nudge);
    return () => {
      settle.stop();
      clearTimeout(back);
    };
  }, [nudge, bump]);

  const scale = Animated.multiply(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, pondSize.hintBreathe] }),
    bump.interpolate({ inputRange: [0, 1], outputRange: [1, pondSize.hintBump] }),
  );

  return (
    <Animated.View testID="pond-hold-hint" style={[styles.pill, { transform: [{ scale }] }]}>
      <SenseGlyph kind="hand" size={18} />
      <Text variant="label1" color={labelColor.strong}>
        {nudge > expired ? again : text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.xs,
    paddingVertical: space.xs + space.xs2,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    backgroundColor: pond.warmCore,
    borderWidth: pondSize.chipRing,
    borderColor: pond.warm,
  },
});
