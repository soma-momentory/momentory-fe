import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { EmotionPebble, paperSheet, paperTilt, Text } from "@/components/ds";
import { OnboardingFrame } from "@/components/onboarding/OnboardingParts";
import { label as labelColor, line, onboardingArt, primary, space } from "@/design/ds";
import { useDraft } from "@/features/onboarding/model/draft";
import { GOALS, type Goal } from "@/features/onboarding/model/flow";

/** 목표 고르기 — 여러 개 · 비어도 된다. 답은 서버에 응답 기록으로 남는다 */
export default function GoalScreen() {
  const goals = useDraft((s) => s.goals);

  const toggle = (code: Goal) =>
    useDraft
      .getState()
      .set("goals", goals.includes(code) ? goals.filter((g) => g !== code) : [...goals, code]);

  return (
    <OnboardingFrame primary={{ label: "계속하기", onPress: () => router.push("/reading") }}>
      <Text variant="title3Hand" color={labelColor.strong} style={styles.title}>
        바바와 뭘 해 보고 싶어요?
      </Text>
      <Text variant="label1" color={labelColor.alternative} style={styles.sub}>
        여러 개 골라도 돼요
      </Text>
      <View style={styles.list}>
        {GOALS.map((g, i) => {
          const on = goals.includes(g.code);
          return (
            <Pressable
              key={g.code}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(g.code)}
              style={({ pressed }) => [styles.row, paperTilt(i, pressed), on && styles.rowOn]}
            >
              <EmotionPebble id={g.pebble} size={30} />
              <Text
                variant={on ? "headline1" : "body1"}
                color={labelColor.strong}
                style={styles.label}
              >
                {g.label}
              </Text>
              <View style={[styles.tick, on && styles.tickOn]} />
            </Pressable>
          );
        })}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.xl3, textAlign: "center" },
  sub: { marginTop: space.xs, textAlign: "center" },
  list: { marginTop: space.xl2, gap: 9 },
  // 목표 하나가 흰 종이 쪽지 한 장이다 — 질문 선택지와 같은 종이(2026-11-10 · 사용자 요청)
  row: {
    ...paperSheet,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: 14,
  },
  rowOn: { borderWidth: 2, borderColor: primary.heavy, backgroundColor: onboardingArt.sageSoft },
  label: { flex: 1 },
  tick: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: line.normal },
  tickOn: { backgroundColor: primary.heavy, borderColor: primary.heavy },
});
