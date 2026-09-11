import { useEffect, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { ChatBubble, ChatScaffold, TypingBubble } from "@/components/ds";
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
 *
 * ## 이번 질문은 「쓰는 중」을 거쳐 나온다
 *
 * 대화처럼 읽히려면 바바의 말이 **한 박자 뒤에** 도착해야 한다. 그래서 이번 질문은
 * 화면이 뜨자마자 앉지 않고, 먼저 **`TypingBubble`(점 셋)** 이 그 자리에 잠깐 앉았다가
 * 질문으로 바뀐다(회고 대화가 서버 응답을 기다릴 때와 같은 말풍선이다). **지난 턴은
 * 기다리지 않는다** — 이미 오간 말이라 바로 그린다. 화면마다 라우트가 새로 마운트되므로
 * 넘어갈 때마다 점이 다시 뜬다(같은 화면에서 답을 적는 동안은 다시 뜨지 않는다).
 *
 * ⚠ 점이 뜨는 동안에도 **질문·칩은 트리에 남겨 둔다**(높이만 접고 투명도만 내린다) —
 * 낭독기·테스트가 「없는 것」으로 읽지 않게. `display:none` 은 쓰지 않는다.
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

  const typing = useTypingReveal(step, question != null);

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

      {/* 점 셋은 질문이 앉을 바로 그 자리에 — 지난 턴과 28 을 띄운다 */}
      {typing.showDots ? (
        <TypingBubble style={past.length > 0 ? styles.currentQuestion : undefined} />
      ) : null}

      {/* 질문·칩은 접힌 채로도 트리에 남는다(높이 0 · 투명도만) — `display:none` 금지 */}
      <Animated.View style={[{ opacity: typing.opacity }, typing.showDots ? styles.folded : null]}>
        {question != null ? (
          // 지난 턴과 28 을 띄운다 — 대화 턴 사이 28, 메시지 사이 14
          <ChatBubble style={past.length > 0 ? styles.currentQuestion : undefined}>
            {question}
          </ChatBubble>
        ) : null}

        {/* 선지는 질문에 딸린 답이되 붙여 놓지 않는다 — 메시지 사이와 같은 14 를 띄운다 */}
        {inline != null ? (
          <View style={question != null ? styles.inline : undefined}>{inline}</View>
        ) : null}
      </Animated.View>
    </ChatScaffold>
  );
}

/** 점 셋이 앉아 있는 시간 — 「한 박자」로 읽히되 흐름을 막지 않는 길이 */
const TYPING_MS = 700;
/** 질문이 도착해 자리를 잡은 뒤 부드럽게 켜지는 시간 */
const APPEAR_MS = 220;

/**
 * 이번 질문을 「쓰는 중 → 도착」으로 그린다. 화면이 마운트되면 점을 `TYPING_MS` 동안
 * 보이고, 그 뒤 질문·칩을 페이드로 켠다. **질문이 없는 화면**(환영·완료)은 기다리지
 * 않는다 — 점도 없이 바로 켜진 상태로 시작한다.
 *
 * 반환하는 `opacity` 는 접힌 블록에 그대로 얹는다. 점이 도는 동안 0(트리에는 남음),
 * 도착하면 1 로 오른다.
 */
function useTypingReveal(step: OnboardingStep, hasQuestion: boolean) {
  // 첫 상태가 곧 정답이다 — 화면은 스텝마다 새로 마운트되므로(뒤로가기·딥링크)
  // step 이 도중에 바뀌지 않는다. 그래서 여기서 값을 되돌리지 않고, 효과는 「도착」만 예약한다.
  const [revealed, setRevealed] = useState(!hasQuestion);
  // 값은 한 번 만들어 계속 쓴다 (`ChatBubble` 의 점과 같은 방식)
  const [opacity] = useState(() => new Animated.Value(hasQuestion ? 0 : 1));

  useEffect(() => {
    if (!hasQuestion) return;
    const id = setTimeout(() => {
      setRevealed(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: APPEAR_MS,
        useNativeDriver: true,
      }).start();
    }, TYPING_MS);
    return () => clearTimeout(id);
  }, [step, hasQuestion, opacity]);

  return { showDots: hasQuestion && !revealed, opacity };
}

const styles = StyleSheet.create({
  // 메시지 간격 14 위에 14 를 더해 턴 사이 28 (`Onboarding.dc.html`)
  currentQuestion: { marginTop: 14 },
  // 질문 말풍선과 선지 사이 — 메시지 사이와 같은 14 로 붙지 않게 띄운다
  inline: { marginTop: 14 },
  // 점이 도는 동안 자리를 비운다 — 접어도 트리에는 남으므로 낭독기·테스트가 찾는다
  folded: { height: 0, overflow: "hidden" },
});
