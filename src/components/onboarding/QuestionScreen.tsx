import { track } from "@/features/analytics";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { paperSheet, paperTilt, Text } from "@/components/ds";
import { label as labelColor, primary, space } from "@/design/ds";
import { myPaper } from "@/design/ds/myPaper";
import { useDraft } from "@/features/onboarding/model/draft";
import {
  INTRO_CARDS,
  introHref,
  nextQuestionHref,
  QUESTIONS,
  type Answers,
  type QuestionKey,
} from "@/features/onboarding/model/flow";

import { backOr, OnboardingFrame, Segments, TextLink } from "./OnboardingParts";

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
      // 첫 질문 앞은 로그인 전 소개의 마지막 장이다
      onBack={backOr(
        QUESTIONS[index - 1]?.href ?? introHref(INTRO_CARDS[INTRO_CARDS.length - 1]!.id),
      )}
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
              style={({ pressed }) => [styles.option, paperTilt(i, pressed), on && styles.optionOn]}
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
  // 선택지 하나가 흰 종이 쪽지 한 장이다 — 마이 · 이름 · 나이 성별과 같은 종이(2026-11-10 · 사용자 요청)
  option: {
    ...paperSheet,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
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
    // 마이 줄의 아이콘 점과 같은 노란 점
    backgroundColor: myPaper.settingsDot,
  },
  skip: { flex: 1, justifyContent: "flex-end", paddingTop: space.xl3 },
});
