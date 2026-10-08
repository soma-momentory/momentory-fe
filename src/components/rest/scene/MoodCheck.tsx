import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import {
  label as labelColor,
  radius,
  restMood,
  restMoodMotion,
  restMoodSize,
  restScene,
  restSceneSize,
  space,
} from "@/design/ds";
import { REST_MOOD_QUESTION, REST_MOODS, type RestMood } from "@/features/rest/model/restRecord";

import { MoodMark } from "./MoodMark";
import { RisingMotes } from "./RisingMotes";

/**
 * 쉼터 공통 끝맺음의 「기분이 나아졌나요?」 — **카피바라가 건네는 쪽지** (2026-10-08).
 *
 * 걱정상자의 카피바라 쪽지와 같은 결이다 — 종이색 면 · 잉크 선 · 단단한 그림자 · 손글씨 ·
 * 「-카피바라-」, 살짝 비스듬히 흔들리며 내려앉는다. 따로 창을 띄우지 않는다(장면이 끊긴다 ·
 * 모달은 되돌릴 수 없는 행동의 확인에만 쓴다). 답 셋은 쪽지 안에 표식(해 · 얼굴 · 구름)과
 * 함께 가로로 놓인다 — 알약을 쌓으면 설문지처럼 보였다(2026-10-08 · 사용자 피드백).
 *
 * **건너뛰기가 없다.** 고르면 그 칸에 인주빛 도장이 꾹 찍히고 빛 알갱이가 떠오르며 나머지는
 * 옅어진다. 「골랐다」를 볼 시간(`restMoodMotion.hold`)이 지난 뒤 `onPick` 이 불린다 —
 * 끝은 시계가 말한다(네이티브 드라이버의 완료 콜백은 테스트에 오지 않는다).
 * **다시 고를 수 있다** — 다른 칸을 누르면 도장이 그 칸으로 옮겨 찍히고 `onPick` 이 다시
 * 불린다(2026-10-08 · 사용자 피드백). 서버로는 화면을 떠날 때 마지막 답 하나만 간다.
 */
export function MoodCheck({ onPick }: { onPick: (mood: RestMood) => void }) {
  const [land] = useState(() => new Animated.Value(0));
  const [stamp] = useState(() => new Animated.Value(0));
  const [picked, setPicked] = useState<RestMood | null>(null);

  useEffect(() => {
    const it = Animated.timing(land, {
      toValue: 1,
      duration: restMoodMotion.land,
      easing: Easing.out(Easing.sin),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [land]);

  useEffect(() => {
    if (picked == null) return;
    stamp.setValue(0);
    const it = Animated.timing(stamp, {
      toValue: 1,
      duration: restMoodMotion.stamp,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    });
    it.start();
    const done = setTimeout(() => onPick(picked), restMoodMotion.stamp + restMoodMotion.hold);
    return () => {
      it.stop();
      clearTimeout(done);
    };
    // onPick 은 화면이 매 렌더 새로 준다 — 한 번 고르면 한 번만 부른다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, stamp]);

  const tilt = restMoodSize.tilt;

  return (
    <Animated.View
      testID="rest-mood-note"
      style={[
        styles.wrap,
        {
          // 짙어지기는 내려앉는 시간의 앞 절반에 끝난다 — 늦게 짙어지면 느리게 읽혔다
          opacity: land.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: land.interpolate({ inputRange: [0, 1], outputRange: [-space.xl, 0] }) },
            {
              rotate: land.interpolate({
                inputRange: [0, 1],
                outputRange: [`${tilt * 3}deg`, `${tilt}deg`],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.shadow} />
      <View style={styles.note}>
        <Text variant="title3Hand" color={restScene.ink} style={styles.mid}>
          {REST_MOOD_QUESTION}
        </Text>
        <View style={styles.row}>
          {REST_MOODS.map((m) => {
            const on = picked === m.id;
            const dim = picked != null && !on;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={m.label}
                accessibilityState={{ selected: on }}
                onPress={() => setPicked(m.id)}
                // 고르지 않은 칸도 다시 누를 수 있게 너무 흐리지 않는다
                style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.6 : dim ? 0.45 : 1 }]}
              >
                <View style={styles.markSlot}>
                  {on ? (
                    <Animated.View
                      testID="rest-mood-stamp"
                      style={[
                        styles.stamp,
                        {
                          opacity: stamp,
                          transform: [
                            {
                              scale: stamp.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1.5, 1],
                              }),
                            },
                            { rotate: "-8deg" },
                          ],
                        },
                      ]}
                    />
                  ) : null}
                  <MoodMark mood={m.id} size={restMoodSize.mark} />
                  {on ? (
                    <RisingMotes
                      left="50%"
                      bottom={restMoodSize.stamp / 2}
                      motes={restMoodSize.motes}
                      duration={restMoodMotion.mote.duration}
                      stagger={restMoodMotion.mote.stagger}
                      color={restMood.mote}
                    />
                  ) : null}
                </View>
                <Text
                  variant={on ? "label1" : "body2"}
                  color={on ? restScene.ink : labelColor.normal}
                  numberOfLines={1}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="label1Hand" color={labelColor.alternative} style={styles.sign}>
          -카피바라-
        </Text>
      </View>
    </Animated.View>
  );
}

const V = restSceneSize.vintage;
const SLOT = restMoodSize.stamp;

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch" },
  note: {
    paddingTop: space.lg,
    paddingBottom: space.sm,
    paddingHorizontal: space.md,
    gap: space.md,
    borderRadius: radius.large,
    backgroundColor: restMood.paper,
    borderWidth: V.stroke,
    borderColor: restScene.ink,
  },
  // 쪽지 아래 단단한 그림자 — 빈티지 버튼 · 걱정상자 쪽지와 같은 결(번지지 않는다)
  shadow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: V.depth,
    bottom: -V.depth,
    borderRadius: radius.large,
    backgroundColor: restScene.shadow,
  },
  mid: { textAlign: "center" },
  row: { flexDirection: "row" },
  cell: { flex: 1, alignItems: "center", gap: space.xs },
  markSlot: { width: SLOT, height: SLOT, alignItems: "center", justifyContent: "center" },
  // 인주빛 도장 — 고른 표식을 두르는 한 겹 동그라미, 살짝 비뚤게 찍힌다
  stamp: {
    position: "absolute",
    width: SLOT,
    height: SLOT,
    borderRadius: SLOT / 2,
    borderWidth: 2.5,
    borderColor: restMood.stamp,
  },
  sign: { textAlign: "right" },
});
