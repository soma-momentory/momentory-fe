import { type ReactNode, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import theme from "@/design/theme";
import { fill, oauth } from "@/design/tokens.mvp";

import { AppText, type TextTone } from "./AppText";

const { press } = theme.motion.spec;

/**
 * 주 CTA. `.pri` — h54 알약, 라벨 600 15.5.
 *
 * 소셜 3종의 브랜드 색은 **팔레트 규칙의 예외**다 — 카카오 `#FEE500` ·
 * Apple `#111` · Google `card`+테두리. 브랜드가 고정한 값이라 토큰으로 바꾸지 않는다.
 * (`09_MVP/docs/S1.md`)
 */
export type ButtonVariant = "primary" | "kakao" | "apple" | "google" | "quiet" | "ghost";

/**
 * MVP 40화면의 버튼은 **알약**이다 — `.pri` `.opt` `.quiet` `.ghost` 전부
 * `border-radius:999px`. `oauth`(`.oauth` — **44 · r12**)는 `S1` 소셜 3종
 * 전용이고, 공식 마크(`leading`)를 **왼쪽 16px 절대 정렬**한다 — 마크가 라벨과
 * 함께 흐르면 세 버튼의 글자 시작점이 어긋난다(`S1.md`).
 * v2(2026-08-06)가 진입 2장도 리팩토링해 원본 r14 는 이제 쓰는 화면이 없다.
 */
export type ButtonShape = "pill" | "oauth";

type Props = Omit<PressableProps, "style" | "children"> & {
  label: string;
  variant?: ButtonVariant;
  /** 기본 `pill`. `oauth` 는 `S1` 소셜 3종 전용 (44 · r12 · 마크 절대 정렬) */
  shape?: ButtonShape;
  disabled?: boolean;
  /** 비동기 처리 중. 버튼을 잠그고 라벨 옆에 진행점을 보인다 */
  loading?: boolean;
  /** 아이콘 등 라벨 왼쪽에 놓을 것 */
  leading?: ReactNode;
  /**
   * `StyleProp` 을 유지한다 — `[a, cond && b]` · null 이 전부 들어와야 한다.
   * Pressable 의 함수형 style 만 뺐다(내부에서 pressed 스타일을 이미 합성한다).
   */
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  variant = "primary",
  shape = "pill",
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
          shape === "pill" ? styles.pill : styles.oauth,
          v.container,
          pressed && !effectiveDisabled && !reduceMotion ? v.pressed : null,
          effectiveDisabled ? styles.disabled : null,
          style,
        ]}
      >
        {leading ? (
          // oauth 는 마크를 왼쪽 16 절대 정렬 — 라벨은 그대로 가운데 (S1.md)
          <View style={shape === "oauth" ? styles.leadingOauth : styles.leading}>{leading}</View>
        ) : null}
        <AppText
          tone={v.tone}
          style={[shape === "pill" ? styles.labelPill : styles.labelOauth, v.labelStyle]}
        >
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
  /** 브랜드 라벨색·작은 라벨 등 프리셋을 덮어야 하는 예외 */
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

/** `.quiet` · `.ghost` 공용 — 600 13.5px/1 */
const SMALL_LABEL: TextStyle = {
  fontFamily: "Pretendard-SemiBold",
  fontSize: 13.5,
  lineHeight: 13.5,
};

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
  // `.quiet{min-height:44px;background:transparent;border:none;font:600 13.5px/1}`
  // 「알림 없이 쓸게요」처럼 **거절도 같은 화면에 두는** 자리다. 눈에 덜 띄되
  // 찾기 어렵지 않아야 해서 면도 테두리도 없이 글자만 남긴다.
  quiet: {
    container: { backgroundColor: "transparent", height: 44 },
    pressed: { opacity: 0.6 },
    tone: "body",
    labelStyle: SMALL_LABEL,
  },
  // `.ghost{min-height:48px;border:1px solid rgba(36,31,25,.18);font:600 13.5px/1}`
  // quiet 와 달리 **테두리가 있다** — 둘은 다른 컴포넌트다.
  ghost: {
    container: {
      backgroundColor: "transparent",
      height: 48,
      borderWidth: 1,
      borderColor: `${semantic.textPrimary}2E`, // ink 18% — 0.18 × 255 = 45.9 → 2E
    },
    pressed: { opacity: 0.6 },
    tone: "body",
    labelStyle: SMALL_LABEL,
  },
};

const styles = StyleSheet.create({
  base: {
    height: theme.touch.buttonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  pill: { borderRadius: theme.radius.pill }, // MVP 40화면 (.pri .opt .quiet .ghost)
  // `.oauth` — S1 소셜 3종. v2 에서 54 → 44 · r12
  oauth: { height: oauth.height, borderRadius: oauth.radius },
  // 라벨 서체도 갈린다 — `.pri` 는 600 15.5px/1, `.oauth` 는 600 15px/1.
  labelPill: { fontFamily: "Pretendard-SemiBold", fontSize: 15.5, lineHeight: 15.5 },
  labelOauth: { fontFamily: "Pretendard-SemiBold", fontSize: oauth.fontSize, lineHeight: oauth.fontSize },
  // 비활성은 흐리게만 한다. 경고색·아이콘을 붙이지 않는다 (RULES 4).
  // `.off{opacity:.36;box-shadow:none}` — 그림자까지 지운다. 남기면 눌리는 것처럼 떠 보인다.
  disabled: { opacity: 0.36, shadowOpacity: 0, elevation: 0 },
  leading: { width: 20, alignItems: "center" },
  // `.oauth>svg{position:absolute;left:16px}` — 흐름 밖. 라벨 시작점을 흔들지 않는다
  leadingOauth: {
    position: "absolute",
    left: oauth.markLeft,
    width: oauth.markSize,
    alignItems: "center",
  },
  progress: { flexDirection: "row", gap: 3 },
  progressDot: { width: 4, height: 4, borderRadius: theme.radius.pill },
});
