import { useRef, type ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";

import { space } from "@/design/ds";

import { Screen } from "./Screen";
import { TopNavigation } from "./TopNavigation";

/**
 * Momentory DS — 대화 화면의 껍데기.
 *
 * **온보딩과 일기(회고)가 같은 문법을 쓴다**(`Onboarding.dc.html` 「대화 문법」 ·
 * `Diary.dc.html`): 대화는 **아래 정렬**이고 위쪽 여백이 대화가 진행될 공간이다.
 * 상단바는 투명하고, 하단 독에 입력·CTA 가 앉는다.
 *
 * 두 벌로 두지 않는 이유는 **아래 스크롤 보정** 때문이다 — 한쪽에서만 고치면
 * 다른 쪽이 조용히 어긋난다. 실제로 그런 버그를 한 번 밟았다.
 *
 * ## 키보드는 **양쪽 다** 피한다
 *
 * 예전엔 안드로이드에서 `behavior` 를 비워 뒀다 — 창이 `adjustResize` 로 저절로
 * 줄어든다는 전제였다. **edge-to-edge 에서는 그 전제가 깨진다**(Expo SDK 54+ 는
 * edge-to-edge 를 끌 수 없다): 창이 줄지 않고 키보드가 그 위를 덮어서 입력 독이
 * 가려진다. 그래서 두 플랫폼 모두 `padding` 으로 피한다.
 */
type Props = {
  /** `arrow-left` 뒤로 · `close` 닫기. 없으면 상단바를 두지 않는다 */
  leading?: "arrow-left" | "close";
  onLeadingPress?: () => void;
  /** 우상단 텍스트 버튼 */
  trailing?: ReactNode;
  /** 대화 영역 — 말풍선과 그 아래 붙는 것(칩·카드·그리드) */
  children: ReactNode;
  /** 하단 독 — 입력·헬퍼·CTA */
  dock?: ReactNode;
};

export function ChatScaffold({ leading, onLeadingPress, trailing, children, dock }: Props) {
  const scroll = useRef<ScrollView>(null);

  /**
   * 대화의 **맨 아래**로 — 새 질문이 입력창 바로 위에 오게 한다.
   *
   * ⚠ **두 신호를 다 받고, 다음 프레임에 한 번 더 부른다.**
   * `onContentSizeChange` 만 걸면 내용이 커진 시점에 뷰포트 높이가 아직 0 이라
   * `scrollToEnd` 가 0 으로 계산되고, `onLayout` 만 걸면 늦게 자란 내용을 놓친다.
   * 게다가 칩이 줄바꿈하는 화면은 **접히기 전 높이**로 계산돼 한 줄이 남는다 —
   * 그래서 다음 프레임에 한 번 더 부른다. 값이 같으면 두 번째는 아무 일도 없다.
   */
  const toBottom = () => {
    scroll.current?.scrollToEnd({ animated: false });
    requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
  };

  return (
    <Screen>
      {leading != null || trailing != null ? (
        <TopNavigation leading={leading} onLeadingPress={onLeadingPress} trailing={trailing} />
      ) : null}

      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView
          ref={scroll}
          style={styles.fill}
          contentContainerStyle={styles.conversation}
          showsVerticalScrollIndicator={false}
          // 키보드가 올라온 채로도 칩·버튼이 한 번에 눌린다 — 안 그러면 첫 탭이
          // 키보드를 내리는 데 쓰이고 사라진다
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={toBottom}
          onLayout={toBottom}
        >
          {children}
        </ScrollView>

        {dock != null ? <View style={styles.dock}>{dock}</View> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  // 대화는 아래 정렬 — 적을 때도 바닥에 붙어 있고 위가 빈다
  conversation: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: 14,
    paddingBottom: space.lg,
  },
  dock: { gap: space.md },
});
