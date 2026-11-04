import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  withAlpha,
} from "@/design/ds";
import { REST_MOOD_QUESTION, REST_MOODS, type RestMood } from "@/features/rest/model/restRecord";

import { MoodMark } from "./MoodMark";
import { RisingMotes } from "./RisingMotes";
import { ScenePillButton } from "./SceneChrome";

/**
 * 쉼터를 **나가는 순간**의 「기분이 나아졌나요?」 — 카피바라가 건네는 쪽지 (2026-10-08).
 *
 * 끝맺음의 「쉼터로 돌아가기」(몸에 힘 빼기는 「마치기」)를 누르면 **그 장면 위에** 크림빛이
 * 옅게 깔리고 가운데에 쪽지가 흔들리며 내려앉는다. 끝맺음 판에 쌓지 않는다 — 보물함처럼 판이
 * 높은 쉼터에서 카피바라를 가렸다. 시스템 창(어두운 막 · 흰 상자)이 아니라 같은 쪽지라 장면이
 * 끊기지 않는다(2026-10-08 · 사용자와 정함).
 *
 * 쪽지는 걱정상자의 카피바라 쪽지와 같은 결이다 — 종이색 면 · 잉크 선 · 단단한 그림자 · 손글씨 ·
 * 「-바바-」. 답 셋은 쪽지 안에 표식(해 · 얼굴 · 구름)과 함께 가로로 놓인다.
 *
 * **건너뛰기가 없다** — 나가는 버튼은 하나를 고른 뒤에 붙는다. 고르면 그 칸에 인주빛 도장이
 * 꾹 찍히고 빛 알갱이가 떠오른다. **나가기 전까지 몇 번이고 다시 고를 수 있다.** 서버로는 화면을
 * 떠날 때 마지막 답 하나만 간다(`useRestRecord`).
 */
export function MoodExit({
  leaveLabel,
  onPick,
  onLeave,
}: {
  leaveLabel: string;
  onPick: (mood: RestMood) => void;
  onLeave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [veil] = useState(() => new Animated.Value(0));
  const [land] = useState(() => new Animated.Value(0));
  const [stamp] = useState(() => new Animated.Value(0));
  const [picked, setPicked] = useState<RestMood | null>(null);

  useEffect(() => {
    const it = Animated.parallel([
      Animated.timing(veil, {
        toValue: 1,
        duration: restMoodMotion.veil,
        useNativeDriver: true,
      }),
      Animated.timing(land, {
        toValue: 1,
        duration: restMoodMotion.land,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
    ]);
    it.start();
    return () => it.stop();
  }, [veil, land]);

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
    return () => it.stop();
  }, [picked, stamp]);

  const pick = (mood: RestMood) => {
    setPicked(mood);
    onPick(mood);
  };

  const tilt = restMoodSize.tilt;

  return (
    <View
      testID="rest-mood-exit"
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        styles.exit,
        { paddingTop: insets.top, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, { opacity: veil }]} />
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
                  onPress={() => pick(m.id)}
                  // 고르지 않은 칸도 다시 누를 수 있게 너무 흐리지 않는다
                  style={({ pressed }) => [
                    styles.cell,
                    { opacity: pressed ? 0.6 : dim ? 0.45 : 1 },
                  ]}
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
            -바바-
          </Text>
        </View>
      </Animated.View>
      {/* 나가는 길 — 고른 뒤에 붙는다. 자리는 늘 잡아 둬서 붙을 때 쪽지가 움직이지 않는다 */}
      <View style={styles.leave}>
        {picked != null ? (
          <ScenePillButton tone="accent" label={leaveLabel} onPress={onLeave} />
        ) : null}
      </View>
    </View>
  );
}

const V = restSceneSize.vintage;
const SLOT = restMoodSize.stamp;

const styles = StyleSheet.create({
  exit: { justifyContent: "center", paddingHorizontal: space.xl, gap: space.xl2 },
  // 장면 위 크림빛 한 겹 — 어둡게 덮지 않는다(시스템 창처럼 읽혔다)
  veil: { backgroundColor: withAlpha(restScene.veil, restMoodSize.veilOpacity) },
  wrap: { alignSelf: "stretch" },
  leave: { height: V.pill + V.depth, alignSelf: "stretch" },
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
