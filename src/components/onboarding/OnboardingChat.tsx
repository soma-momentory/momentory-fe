import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { ChatBubble, ChatScaffold } from "@/components/ds";
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
 * 껍데기 자체(아래 정렬 · 스크롤 보정 · 상단바 · 독)는 **일기와 같은 것**이라
 * `ds/ChatScaffold` 에 있다. 여기 남는 것은 **온보딩만의 일** 하나다:
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

  return (
    <ChatScaffold
      leading={onBack != null ? "arrow-left" : undefined}
      onLeadingPress={onBack}
      trailing={trailing}
      dock={children}
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
    </ChatScaffold>
  );
}

const styles = StyleSheet.create({
  // 메시지 간격 14 위에 14 를 더해 턴 사이 28 (`Onboarding.dc.html`)
  currentQuestion: { marginTop: 14 },
});
