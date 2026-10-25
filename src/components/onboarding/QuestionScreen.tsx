import { track } from "@/features/analytics";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { background, label as labelColor, line, primary, space } from "@/design/ds";
import { useDraft } from "@/features/onboarding/model/draft";
import {
  nextQuestionHref,
  QUESTIONS,
  type Answers,
  type QuestionKey,
} from "@/features/onboarding/model/flow";

import { OnboardingFrame, Segments, TextLink } from "./OnboardingParts";

const LETTERS = ["A", "B", "C"] as const;

/**
 * 질문 한 장 — 한 화면에 질문 하나와 큰 선택지 셋. 고르면 바로 다음 장으로 간다.
 * 「건너뛰기」는 남은 질문 · 목표 · 답 정리를 건너뛰고 이름으로 간다(프로토타입 흐름).
 */
export function QuestionScreen({ questionKey }: { questionKey: QuestionKey }) {
  const index = QUESTIONS.findIndex((q) => q.key === questionKey);
  const question = QUESTIONS[index]!;
  const picked = useDraft((s) => s.answers[questionKey]);

  const choose = (code: NonNullable<Answers[QuestionKey]>) => {
    useDraft.getState().answer(questionKey, code as never);
    track("onboarding_question_answered", { question: questionKey, answer: code });
    router.push(nextQuestionHref(questionKey));
  };

  const skip = () => {
    useDraft.getState().answer(questionKey, null);
    track("onboarding_question_answered", { question: questionKey, answer: "SKIPPED" });
    router.push("/name");
  };

  return (
    <OnboardingFrame
      onBack={() => router.back()}
      progress={<Segments count={QUESTIONS.length} index={index} />}
    >
      <Text variant="title3Hand" color={labelColor.strong} style={styles.question}>
        {question.text}
      </Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {question.options.map((o, i) => {
          const on = picked === o.code;
          return (
            <Pressable
              key={o.code}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => choose(o.code)}
              style={[styles.option, on && styles.optionOn]}
            >
              <View style={styles.letter}>
                <Text variant="caption1" color={labelColor.neutral}>
                  {LETTERS[i]}
                </Text>
              </View>
              <Text variant={on ? "headline1" : "body1"} color={labelColor.strong}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.skip}>
        <TextLink label="건너뛰기" onPress={skip} />
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  question: { marginTop: space.xl5, textAlign: "center" },
  options: { marginTop: space.xl3, gap: space.md },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: background.elevated,
    borderWidth: 1.5,
    borderColor: line.neutral,
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: space.lg,
  },
  // 고른 것은 색만이 아니라 테두리 굵기 · 글자 굵기로도 보인다(`RULES.md` 3)
  optionOn: { borderWidth: 2, borderColor: primary.heavy },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: background.alternative,
  },
  skip: { flex: 1, justifyContent: "flex-end", paddingTop: space.xl3 },
});
