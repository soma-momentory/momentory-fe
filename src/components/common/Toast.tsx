import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { useReduceMotion } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperMotion, paperRadius } from "@/design/paper";

/**
 * 토스트 — 하단 어두운 알약, 잠시 떠 있다 스스로 사라진다
 * (`docs/design/design-system.md` §4.8 · 마이).
 *
 * 항상 마운트하고 opacity 로만 여닫는다 — 조건부 마운트면 닫힘 페이드가 사라진다
 * (`docs/design/app-flow.md` §3 입력 레이어 규칙과 같은 이유). 그래서 부모는
 * 이 컴포넌트를 화면에 상시 두고 `message` 만 바꾼다. 사라진 뒤 `onDismiss` 가
 * 불리면 부모가 `message` 를 null 로 되돌린다.
 *
 * 탭을 받지 않는다(`pointerEvents:none`) — 오류가 아니라 완료 알림 전용이다.
 * 오류·거부·실패는 토스트가 아니라 한 줄 안내로 흡수한다(`RULES.md` 4).
 */
const SHOW_MS = 1800;

type Props = { message: string | null; onDismiss: () => void };

export function Toast({ message, onDismiss }: Props) {
  const [opacity] = useState(() => new Animated.Value(0));
  const reduceMotion = useReduceMotion();

  // 부모는 onDismiss 가 불릴 때까지 message 를 쥐고 있는다 — 페이드아웃이 끝난
  // 뒤에야 null 이 되므로 사라지는 동안에도 글자가 남아 있다.
  useEffect(() => {
    if (message == null) return;
    const duration = reduceMotion ? paperMotion.reduceMotion.duration : paperMotion.fadeIn.duration;
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) onDismiss();
        },
      );
    }, SHOW_MS);
    return () => clearTimeout(timer);
  }, [message, opacity, reduceMotion, onDismiss]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { opacity }]}
    >
      {message != null ? (
        <AppText variant="bodySm" weight="500" style={styles.text}>
          {message}
        </AppText>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 96,
    alignItems: "center",
    borderRadius: paperRadius.toast,
    backgroundColor: paperColors.overlay.toastBg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  text: { color: paperColors.text.onDark, textAlign: "center" },
});
