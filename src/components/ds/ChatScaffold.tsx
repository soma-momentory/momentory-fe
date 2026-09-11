import { useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";

import { layout, space } from "@/design/ds";

import { ScrollLockContext } from "./scrollLock";
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
 *
 * ⚠ **피하기만 하면 독이 키보드에 딱 붙는다.** `padding` 은 독의 아래를 키보드
 * 윗변에 **정확히** 맞춘다 — 키보드가 없을 때 있던 숨(iOS 는 홈 인디케이터 인셋)이
 * 키보드가 올라오는 순간 사라진다. `keyboardVerticalOffset` 에 `layout.keyboardGap` 을 줘 키보드 윗변을
 * 그만큼 위로 친다. 예측 입력 줄(QuickType)이 있든 없든 같은 숨이 남는다 —
 * 그 줄은 OS 가 주는 키보드 프레임에 이미 포함돼 온다(`metrics.ts` `keyboardGap`).
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
  /**
   * 화면 **왼쪽 아래에 고정으로 앉는 그림**(회고의 바바). 대화는 그림의 머리 위에서 끝난다 —
   * 그래서 마지막 질문이 머리 위에 뜬다. 독이 자라면(선택지) 그 위를 덮는다.
   *
   * ⚠ **키보드·독을 따라 움직이지 않는다.** 입력창은 키보드 위로 올라가고, 그림은 제자리에서
   * 키보드·독에 덮일 뿐이다.
   */
  companion?: ReactNode;
  /**
   * 그림을 층 바닥에서 **얼마나 띄워 앉히나** — 입력창 높이만큼 주면 그림이 입력창 **위에** 앉는다.
   * 독 높이를 재서 따라가지 않고 고정값을 받는다: 선택지가 떠 독이 커질 때 그림이 들썩이면 안 된다.
   */
  companionLift?: number;
  /**
   * 그림의 왼쪽 끝 — Screen 의 좌우 패딩(20) 안쪽이 0 이다. **음수면 패딩 밖으로** 나가 화면 끝에 가까워진다.
   */
  companionLeft?: number;
  /** 화면 전체에 까는 장면 한 겹 — `Screen` 의 `backdrop` 으로 넘긴다(회고 대화의 러그) */
  backdrop?: ReactNode;
};

export function ChatScaffold({
  leading,
  onLeadingPress,
  trailing,
  children,
  dock,
  companion,
  companionLift = 0,
  companionLeft = 0,
  backdrop,
}: Props) {
  const scroll = useRef<ScrollView>(null);
  /**
   * 대화 안의 슬라이더가 도는 동안 **세로 스크롤을 멈춘다**(`scrollLock.ts`).
   * 대각선으로 끌면 값이 바뀌면서 대화가 같이 밀려 올라가던 자리다.
   */
  const [scrollLocked, setScrollLocked] = useState(false);

  /**
   * 그림이 독 위로 **얼마나 솟아 있나** — 대화가 그만큼 비켜서 머리 위에서 끝난다.
   *
   * 셋을 재서 푼다: 대화 층 전체 높이 · 독의 윗변 · 그림의 높이(+ 띄운 높이). 독의 윗변은 키보드 회피
   * 패딩과 독 자신의 높이(선택지·여러 줄 입력)를 **이미 반영한** 자리라, 키보드가 올라오거나
   * 선택지가 늘면 비킬 몫이 저절로 줄어 0 이 된다(그림이 다 덮였다).
   */
  const [layerHeight, setLayerHeight] = useState(0);
  const [dockTop, setDockTop] = useState(0);
  const [companionHeight, setCompanionHeight] = useState(0);
  const dockFromBottom = dock != null ? layerHeight - dockTop : 0;
  const clearance =
    companion != null && layerHeight > 0
      ? Math.max(0, companionLift + companionHeight - dockFromBottom)
      : 0;

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

  /**
   * **키보드가 올라오면 한 번 더 내린다.**
   *
   * 키보드가 뜨면 `KeyboardAvoidingView` 가 아래 패딩을 얹어 스크롤 뷰의 **뷰포트가
   * 줄어드는데**, 스크롤 위치(`contentOffset`)는 그대로 남는다 — 대화가 길어 스크롤이
   * 생긴 뒤에는 마지막 질문이 입력창 뒤로 밀려 들어간다. 대화가 짧을 때는 내용이
   * 바닥 정렬이라 저절로 따라 올라와서 **이 버그가 안 보인다** — 실제로 「질문이
   * 하나일 때는 되는데 주고받은 뒤에는 한 번씩 안 올라간다」로 나타났다.
   *
   * `onLayout` 이 이미 걸려 있지만 그것만으로는 **한 번씩 놓친다.** iOS 는 회피
   * 패딩이 `LayoutAnimation` 으로 얹혀서, 레이아웃이 끝나기 전 프레임에서 잰
   * `scrollToEnd` 가 옛 높이로 계산된다. `keyboardDidShow` 는 그 애니메이션이
   * **끝난 뒤** 오므로 여기서 다시 부르면 남은 어긋남이 닫힌다.
   *
   * 두 번 불려도 안전하다 — 이미 바닥이면 두 번째는 아무 일도 하지 않는다.
   */
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", toBottom);
    return () => shown.remove();
    // 화면이 살아 있는 동안 한 번만 건다 — `toBottom` 은 ref 만 읽어서 다시 만들 이유가 없다
  }, []);

  return (
    <Screen backdrop={backdrop}>
      {leading != null || trailing != null ? (
        <TopNavigation leading={leading} onLeadingPress={onLeadingPress} trailing={trailing} />
      ) : null}

      {/*
       * ⚠⚠ **`KeyboardAvoidingView` 는 Screen 의 직계 자식으로 둔다.** 키보드와 겹친 높이를
       * 자기 `onLayout` 의 `y + height` 로 재는데 그 `y` 는 **부모 기준**이다 — 사이에 View 를
       * 하나 끼우면 `y` 가 상단바 높이(56)만큼 줄어 독이 그만큼 덜 올라가고 입력창이 키보드
       * 뒤로 숨는다(2026-09-11 · 그림을 넣으며 실기기에서 밟았다).
       */}
      <KeyboardAvoidingView
        testID="ds-chat-layer"
        style={styles.fill}
        behavior="padding"
        keyboardVerticalOffset={layout.keyboardGap}
        onLayout={(e) => setLayerHeight(e.nativeEvent.layout.height)}
      >
        {/* 그림은 회피 층 **안에서 절대 위치**로 앉는다. 절대 위치의 `bottom` 은 부모의 패딩을
            세지 않으므로, 키보드가 올라와 층에 아래 패딩이 얹혀도 그림은 제자리다 */}
        {companion != null ? (
          <View
            testID="ds-chat-companion"
            pointerEvents="none"
            style={[styles.companion, { bottom: companionLift, left: companionLeft }]}
            onLayout={(e) => setCompanionHeight(e.nativeEvent.layout.height)}
          >
            {companion}
          </View>
        ) : null}

        <ScrollView
          ref={scroll}
          // 슬라이더가 이 스크롤을 잠그는지 테스트가 여기로 확인한다(`__tests__/slider`)
          testID="ds-chat-scroll"
          style={styles.fill}
          contentContainerStyle={styles.conversation}
          showsVerticalScrollIndicator={false}
          // 키보드가 올라온 채로도 칩·버튼이 한 번에 눌린다 — 안 그러면 첫 탭이
          // 키보드를 내리는 데 쓰이고 사라진다
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!scrollLocked}
          onContentSizeChange={toBottom}
          onLayout={toBottom}
        >
          <ScrollLockContext.Provider value={setScrollLocked}>
            {children}
          </ScrollLockContext.Provider>
        </ScrollView>

        {/* 그림의 머리 높이만큼 비워 둔다 — 대화 뷰포트가 여기서 끝나서, 지난 말풍선이
              스크롤되며 그림 위를 지나가지 않는다 */}
        {clearance > 0 ? <View testID="ds-chat-clearance" style={{ height: clearance }} /> : null}

        {dock != null ? (
          <View
            testID="ds-chat-dock"
            style={styles.dock}
            onLayout={(e) => setDockTop(e.nativeEvent.layout.y)}
          >
            {dock}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  // 회피 층의 바닥(= 키보드가 없을 때 독의 아랫변)에서 `companionLift` 만큼 띄우고, 패딩 안쪽 왼쪽 끝에서
  // `companionLeft` 만큼 옮겨 앉는다
  companion: { position: "absolute" },
  // 대화는 아래 정렬 — 적을 때도 바닥에 붙어 있고 위가 빈다
  conversation: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: 14,
    paddingBottom: space.lg,
  },
  dock: { gap: space.md },
});
