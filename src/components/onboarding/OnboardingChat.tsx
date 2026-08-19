import { useRef, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import { ChatBubble, Screen, TopNavigation } from "@/components/ds";
import { space } from "@/design/ds";
import { useDraft } from "@/features/onboarding/model/draft";
import {
  questionAt,
  turnsBefore,
  type OnboardingStep,
} from "@/features/onboarding/model/conversation";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * 온보딩 아홉 화면이 공유하는 껍데기 — 대화 + 하단 독.
 *
 * `Onboarding.dc.html` 「대화 문법」:
 *
 * - **대화는 아래 정렬** — 위쪽 여백이 대화가 진행될 공간이다
 * - 메시지 간격 **14**, 대화 턴 사이 **28**
 * - 빠른 답장(칩)은 **질문 바로 아래 왼쪽**, 대화 영역 안이다
 * - 상단바는 **투명 · 뒤로만** — 진행 표시(1/8)를 두지 않는다
 *
 * 각 화면은 자기 단계만 말하고 **지난 대화는 여기가 그린다**
 * (`features/onboarding/model/conversation.ts`). 화면이 앞 질문을 알 필요가 없다.
 *
 * ## 왜 화면마다 다시 그리나
 *
 * 라우트가 화면마다 갈리므로(뒤로가기·딥링크가 그대로 동작해야 한다) 대화가
 * 컴포넌트로 이어지지 않는다. 대신 **답이 `draft` 에 쌓여 있으므로 언제든
 * 되그릴 수 있다** — 대화를 상태로 들지 않고 답에서 파생시킨다.
 */
type Props = {
  step: OnboardingStep;
  /** 없으면 뒤로가기를 두지 않는다 (`03`·`10` — 돌아갈 곳이 없다) */
  onBack?: () => void;
  /** 우상단 텍스트 버튼 (선택 항목의 건너뛰기) */
  trailing?: ReactNode;
  /** 질문 바로 아래, 대화 영역 안에 붙는 것 — 칩·정보 카드·시간 칩 */
  inline?: ReactNode;
  /** 하단 독 — 입력·헬퍼·CTA */
  children: ReactNode;
};

export function OnboardingChat({ step, onBack, trailing, inline, children }: Props) {
  const draft = useDraft();
  const genders = useOnboardingOptions((s) => s.genders);
  const interestAreas = useOnboardingOptions((s) => s.interestAreas);
  const restMethods = useOnboardingOptions((s) => s.restMethods);

  const options = { genders, interestAreas, restMethods };
  const past = turnsBefore(step, draft, options);
  const question = questionAt(step, draft);

  const scroll = useRef<ScrollView>(null);

  return (
    <Screen>
      {onBack != null || trailing != null ? (
        <TopNavigation
          leading={onBack != null ? "arrow-left" : undefined}
          onLeadingPress={onBack}
          trailing={trailing}
        />
      ) : null}

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          style={styles.fill}
          // 대화는 아래 정렬 — 적을 때도 바닥에 붙어 있고 위가 빈다
          contentContainerStyle={styles.conversation}
          showsVerticalScrollIndicator={false}
          // 새 질문이 나타나면 입력창 바로 위까지 (`design.md` 「온보딩」)
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        >
          {past.map((t) => (
            <ChatBubble key={t.key} variant={t.role} past>
              {t.text}
            </ChatBubble>
          ))}

          {question != null ? (
            // 지난 턴과 28 을 띄운다 — 대화 턴 사이 28, 메시지 사이 14
            <ChatBubble style={past.length > 0 ? styles.currentQuestion : undefined}>
              {question}
            </ChatBubble>
          ) : null}

          {inline}
        </ScrollView>

        <View style={styles.dock}>{children}</View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  conversation: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: 14,
    paddingBottom: space.lg,
  },
  // 메시지 간격 14 위에 14 를 더해 턴 사이 28 (`Onboarding.dc.html`)
  currentQuestion: { marginTop: 14 },
  dock: { gap: space.md },
});
