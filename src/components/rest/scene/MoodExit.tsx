import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import {
  label as labelColor,
  restMood,
  restMoodMotion,
  restMoodSize,
  restScene,
  space,
} from "@/design/ds";
import { REST_MOOD_QUESTION, REST_MOODS, type RestMood } from "@/features/rest/model/restRecord";

import { CapybaraNote } from "./CapybaraNote";
import { MoodMark } from "./MoodMark";
import { RisingMotes } from "./RisingMotes";
import { ScenePillButton } from "./SceneChrome";

/**
 * 쉼터를 **나가는 순간**의 「기분이 나아졌나요?」 — 카피바라가 건네는 쪽지 (2026-10-08).
 *
 * 끝맺음의 「쉼터로 돌아가기」(몸에 힘 빼기는 「마치기」)를 누르면 **그 장면 위에** 크림빛이
 * 옅게 깔리고 가운데에 쪽지가 흔들리며 내려앉는다. 끝맺음 판에 쌓지 않는다 — 보물함처럼 판이
 * 높은 쉼터에서 카피바라를 가렸다(2026-10-08 · 사용자와 정함). 크림빛 막과 쪽지 틀은 설명 쪽지와
 * 함께 쓰는 `CapybaraNote` 다. 답 셋은 쪽지 안에 표식(해 · 얼굴 · 구름)과 함께 가로로 놓인다.
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
  const [stamp] = useState(() => new Animated.Value(0));
  const [picked, setPicked] = useState<RestMood | null>(null);

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

  return (
    <CapybaraNote
      testID="rest-mood-exit"
      // 나가는 길 — 고른 뒤에 붙는다
      footer={
        picked != null ? (
          <ScenePillButton tone="accent" label={leaveLabel} onPress={onLeave} />
        ) : null
      }
    >
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
    </CapybaraNote>
  );
}

const SLOT = restMoodSize.stamp;

const styles = StyleSheet.create({
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
});
