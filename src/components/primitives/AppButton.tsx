import { type ReactNode, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type GestureResponderEvent,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import theme from "@/design/theme";
import { fill } from "@/design/tokens.mvp";

import { AppText, type TextTone } from "./AppText";

const { press } = theme.motion.spec;

/**
 * 주 CTA. h54 r14, 라벨 15 bold. (`02_디자인시스템/COMPONENTS.md` P0)
 *
 * 소셜 3종의 브랜드 색은 **팔레트 규칙의 예외**다 — 카카오 `#FEE500` ·
 * Apple `#1A1A1A` · Google `card`+테두리. 브랜드가 고정한 값이라 토큰으로 바꾸지 않는다.
 * (`09_MVP/docs/S1.md`)
 *
 * 세 버튼은 **무게가 같아야** 한다. 브랜드 색이 없는 Google 만 가벼워 보이므로
 * 테두리를 1.5px 로 올리고 약한 그림자를 더해 삼단 스택의 리듬을 맞춘다.
 */
export type ButtonVariant = "primary" | "kakao" | "apple" | "google" | "ghost";

type Props = Omit<PressableProps, "style" | "children"> & {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** 비동기 처리 중. 버튼을 잠그고 라벨 옆에 진행점을 보인다 */
  loading?: boolean;
  /** 아이콘 등 라벨 왼쪽에 놓을 것 */
  leading?: ReactNode;
  style?: ViewStyle;
};

export function AppButton({
  label,
  variant = "primary",
  disabled = false,
  loading = false,
  leading,
  style,
  onPressIn,
  onPressOut,
  accessibilityRole = "button",
  accessibilityState: callerState,
  ...rest
}: Props) {
  const reduceMotion = useReduceMotion();
  // state 초기화 함수로 만든다 — useRef(...).current 는 렌더 중 ref 접근이라
  // react-hooks/refs 에 걸리고, Animated.Value 를 매 렌더 새로 만들면 애니메이션이 끊긴다.
  const [scale] = useState(() => new Animated.Value(1));
  const [opacity] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const effectiveDisabled = disabled || loading;

  // Reduce Motion 이면 이동·스케일을 끄고 **색만** 바꾼다 (theme.motion.reduceMotion).
  // primaryDeepPress 가 필요한 이유가 이것이다 — 누름 피드백이 색뿐인 사용자가 있다.
  const animate = (to: number) => {
    if (reduceMotion) {
      Animated.timing(opacity, {
        toValue: to < 1 ? 0.88 : 1,
        duration: theme.motion.reduceMotion.duration,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(scale, {
      toValue: to,
      duration: press.duration,
      useNativeDriver: true,
    }).start();
  };

  const v = VARIANTS[variant];

  const handlePressIn = (event: GestureResponderEvent) => {
    setPressed(true);
    animate(press.scale);
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    setPressed(false);
    animate(1);
    onPressOut?.(event);
  };

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <Pressable
        // rest 를 **먼저** 펼친다. 뒤에 두면 호출자가 accessibilityState 를 하나라도
        // 주는 순간 우리가 넣은 값이 통째로 교체된다. `disabled` 는 Pressable 이
        // disabled prop 으로 다시 덮어써서 살아남지만 **`busy` 는 그대로 사라진다** —
        // 처리 중인 버튼이 보조기술에 조용해진다. 호출자 상태는 살리되 잠금은 우리가 쥔다.
        {...rest}
        accessibilityRole={accessibilityRole}
        accessibilityState={{ ...callerState, disabled: effectiveDisabled, busy: loading }}
        disabled={effectiveDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.base,
          v.container,
          pressed && !effectiveDisabled && !reduceMotion ? v.pressed : null,
          effectiveDisabled ? styles.disabled : null,
          style,
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <AppText variant="bodyLg" tone={v.tone} weight="700" style={v.labelStyle}>
          {label}
        </AppText>
        {loading ? <LoadingDots color={progressColorOf(variant)} reduceMotion={reduceMotion} /> : null}
      </Pressable>
    </Animated.View>
  );
}

/** 「동작 줄이기」 설정. 켜져 있으면 이동·스케일·루프를 전부 끈다 */
export function useReduceMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setOn(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

type Variant = {
  container: ViewStyle;
  pressed: ViewStyle;
  tone: TextTone;
  /** 브랜드 라벨색 — semantic 6종으로 표현되지 않는 예외에만 쓴다 */
  labelStyle?: TextStyle;
};

const { semantic } = theme.colors;

const progressColorOf = (variant: ButtonVariant) =>
  variant === "primary" || variant === "apple" ? semantic.textOnDark : semantic.textPrimary;

function LoadingDots({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: theme.motion.duration.slow,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.duration.slow,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      testID="button-progress"
      style={[styles.progress, { opacity }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.progressDot, { backgroundColor: color }]} />
      <View style={[styles.progressDot, { backgroundColor: color }]} />
      <View style={[styles.progressDot, { backgroundColor: color }]} />
    </Animated.View>
  );
}

const VARIANTS: Record<ButtonVariant, Variant> = {
  primary: {
    container: { backgroundColor: fill.primaryDeep },
    pressed: { backgroundColor: fill.primaryDeepPress },
    tone: "onDark",
  },
  kakao: {
    container: { backgroundColor: semantic.kakao },
    pressed: { opacity: 0.88 },
    tone: "strong",
    labelStyle: { color: semantic.kakaoInk }, // 브랜드 지정색
  },
  apple: {
    container: { backgroundColor: semantic.apple },
    pressed: { opacity: 0.88 },
    tone: "onDark",
    labelStyle: { color: semantic.white }, // 브랜드 가이드는 순백을 요구한다
  },
  google: {
    container: {
      backgroundColor: semantic.surface,
      borderWidth: 1.5,
      borderColor: `${semantic.textPrimary}1F`,
      ...theme.shadows.sm,
    },
    pressed: { backgroundColor: semantic.surfaceTone },
    tone: "body",
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    pressed: { opacity: 0.6 },
    tone: "body",
  },
};

const styles = StyleSheet.create({
  base: {
    height: theme.touch.buttonHeight,
    borderRadius: theme.radius.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  // 비활성은 흐리게만 한다. 경고색·아이콘을 붙이지 않는다 (RULES 4)
  disabled: { opacity: 0.75 },
  leading: { width: 20, alignItems: "center" },
  progress: { flexDirection: "row", gap: 3 },
  progressDot: { width: 4, height: 4, borderRadius: theme.radius.pill },
});
