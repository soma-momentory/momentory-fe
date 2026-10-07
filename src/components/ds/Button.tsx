import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  hairline,
  interaction,
  iosVariant,
  label as labelColor,
  layout,
  motion,
  overlay,
  primary,
  radius,
  raised,
  raisedShadow,
  size,
  space,
  status,
  type TextToken,
} from "@/design/ds";

import { Text } from "./Text";

/**
 * Momentory DS — 버튼 (`DESIGN.md` §6).
 *
 * | 속성   | 값                                                    |
 * | ------ | ----------------------------------------------------- |
 * | 높이   | large 48 / medium 40 / small 32                       |
 * | radius | 12                                                    |
 * | solid  | 면 초록 · 라벨 `label.onFill`                         |
 * | outlined | 면 없음 · `line.normal` 1px                         |
 * | text   | 면도 테두리도 없음                                    |
 * | 비활성 | 면 `#DDE7E0` · 라벨 `#A3B5A9`                         |
 *
 * ## 누름은 **면 색을 바꾸지 않는다**
 *
 * `DESIGN.md` §6 대로 자기 fill 은 그대로 두고 **스크림을 얹는다.** 그래서
 * 활성/비활성 색과 누름 표현이 서로 간섭하지 않는다(웹에서 `var()` 트랜지션이
 * 멈춰 색이 안 바뀌던 문제의 원인이 그 간섭이었다). RN 에는 트랜지션이 없으므로
 * 회피책은 필요 없고, **스크림 방식만 그대로 가져왔다.**
 *
 * ## ⚠ `overflow: "hidden"` 을 다시 넣지 않는다
 *
 * `borderRadius` 와 함께 두면 **Android(Fabric)에서 라벨이 사라진다.** 둥근 클립이
 * 하드웨어 레이어를 만드는데, 그 뒤 자식이 다시 그려져도(`disabled` 가 풀리는 순간)
 * 레이어가 무효화되지 않아 **면만 새 색으로 칠해지고 글자는 안 그려진다.**
 * 실기기에서 「색은 바뀌는데 글자가 없다」로 드러났다 — 처음부터 활성이던 버튼
 * (`03` 시작하기)은 멀쩡하고, 비활성에서 활성으로 넘어간 버튼(`04`·`05`)만 비었다.
 *
 * 클립은 애초에 필요 없다 — **스크림이 자기 `borderRadius` 를 들고 있다.**
 * 같은 짝을 쓰던 `Chip`·`IconButton`·`SocialButton` 에서도 함께 지웠다.
 *
 * ## ⚠ solid 의 면은 `primary.heavy` 다
 *
 * `DESIGN.md` 는 `#7C9E86` + 흰 라벨을 지정하는데 그 조합이 **2.91** 로 AA 미달이다.
 * 흰 글자가 얹히는 초록 면은 `primary.heavy`(5.03) 하나뿐이다 —
 * `src/design/ds/color.ts` 머리말 · `PLAN.md` A-5.
 *
 * **한 화면에 solid 는 하나다**(`DESIGN.md` §6 CTA 위계). 보조는 `outlined`,
 * 3순위는 `text` — 코드가 강제할 수 없으니 화면에서 지킨다.
 *
 * ## 누르면 **살짝 줄었다 돌아온다** (2026-09-11 · 사용자 요청)
 *
 * 누름 스크림(면 위에 얹는 옅은 막)만으로는 「눌렸다」가 약하게 읽혔다 — 손가락이 버튼을 덮고 있어
 * 색 변화가 잘 안 보인다. 그래서 **크기**를 함께 쓴다.
 *
 * **홈의 잔디 CTA(`GrassButton`)가 먼저 같은 이유로 이렇게 했다** — 값도 그대로 가져온다:
 * 3%(`PRESS_SCALE`) · `motion.duration`(120ms) · `Easing.out(quad)`. 앱 안에서 누름의 박자가 한 벌이다.
 *
 * - **비활성은 움직이지 않는다** — 눌리지 않는 버튼이 반응하면 「눌렸는데 아무 일도 안 났다」가 된다
 * - 네이티브 드라이버로 돌린다(레이아웃이 아니라 변환이라 JS 스레드가 막혀도 끊기지 않는다)
 */
export type ButtonVariant = "solid" | "outlined" | "text" | "destructive";
export type ButtonSize = "large" | "medium" | "small";

type Props = Omit<PressableProps, "style" | "children"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 라벨 왼쪽 아이콘 */
  leading?: ReactNode;
  /** 좌우로 꽉 채운다. 기본은 hug (`DESIGN.md` §6 「Hug 또는 Fill」) */
  fill?: boolean;
  disabled?: boolean;
  /** 홈 잔디 CTA처럼 면 바로 아래에 단단한 초록 명암을 둔다. */
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 누르는 동안 줄어드는 비율 — `GrassButton` 과 같은 값이다. 3% 는 **눈으로 보이지만 덜컹거리지는 않는** 폭이다.
 */
const PRESS_SCALE = 0.97;

export function Button({
  label,
  variant = "solid",
  size: sizeName = "large",
  leading,
  fill = false,
  disabled = false,
  raised: hasDepth = false,
  accessibilityRole = "button",
  accessibilityState,
  style,
  ...rest
}: Props) {
  const v = VARIANTS[variant];
  /**
   * **Text 버튼은 CTA 높이를 쓰지 않는다** (2026-09-13 · 사용자 요청).
   *
   * ⚠ **iOS 한정이다** — 안드로이드는 예전 높이(48·40·32)를 그대로 쓴다.
   *
   * 면도 테두리도 없는 3순위 행동이라 48 을 채울 이유가 없다 — 주 버튼 아래에 붙는
   * 짝에서 그 높이가 그대로 빈 공간으로 보였다(온보딩의 「알림 없이 쓸게요」·
   * 「나중에 할게요」). 글자 칸에 맞는 32(`size.button.small`)로 둔다.
   *
   * ⚠ **탭 대상은 그대로 44 다.** 줄어든 만큼 `hitSlop` 으로 채운다 —
   * `layout.minTouch` 주석의 「아이콘이 작으면 hitSlop 으로 채운다」와 같은 길이다.
   * 보이는 면만 줄이고 손가락이 닿는 넓이는 건드리지 않는다.
   */
  const height =
    variant === "text" && Platform.OS === "ios" ? size.button.small : size.button[sizeName];
  /**
   * 보이는 높이가 탭 최소보다 낮으면 그 차이를 위아래로 나눠 채운다.
   * **iOS 에서만 얹는다** — 안드로이드는 이 세션 전의 히트 영역을 그대로 둔다.
   */
  const touchPadY = Platform.OS === "ios" ? Math.max((layout.minTouch - height) / 2, 0) : 0;

  const [down, setDown] = useState(false);
  // 저장소 관례(`ChatBubble`·`GrassButton`) — ref 는 렌더 중 읽지 않는다
  const [press] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const run = Animated.timing(press, {
      toValue: down ? 1 : 0,
      duration: motion.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [down, press]);

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, PRESS_SCALE] });

  return (
    <AnimatedPressable
      // 보이는 높이가 44 보다 낮은 버튼(Text · Small)의 탭 대상을 채운다. `rest` 앞에
      // 둬서 호출자가 자기 값을 주면 그쪽이 이긴다
      hitSlop={touchPadY > 0 ? { top: touchPadY, bottom: touchPadY } : undefined}
      {...rest}
      // 호출자가 준 `onPressIn`·`onPressOut` 도 그대로 부른다 — 우리가 덮어쓰지 않는다
      onPressIn={(e) => {
        setDown(true);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setDown(false);
        rest.onPressOut?.(e);
      }}
      accessibilityRole={accessibilityRole}
      // 호출자 상태는 살리되 잠금은 우리가 쥔다 — 뒤에 두면 disabled 가 덮인다
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      style={[
        styles.base,
        { height },
        v.container,
        fill ? styles.fill : null,
        disabled ? styles.disabled : null,
        hasDepth && variant === "solid" && !disabled ? styles.raised : null,
        // 비활성은 줄어들지 않는다 — 값이 1 에 묶인다
        disabled ? null : { transform: [{ scale }] },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {leading}
          <Text
            variant={labelToken(variant, sizeName)}
            color={disabled ? labelColor.disabled : v.labelColor}
          >
            {label}
          </Text>
          {/* 누름 스크림 — 면을 바꾸지 않고 위에 얹는다 */}
          {pressed && !disabled ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: v.scrim }]}
            />
          ) : null}
        </>
      )}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = { container: ViewStyle; labelColor: string; scrim: string };

/**
 * 버튼 글자 단.
 *
 * **Text 버튼은 버튼 보정(`BUTTON_BOOST`)을 타지 않는다** (2026-09-13 · 사용자 요청).
 * 3순위 행동이라(`DESIGN.md` §6 CTA 위계) 주 버튼과 같은 크기로 읽히면 위계가 무너진다 —
 * 하단 독의 「채운 버튼 + 그 아래 보조 텍스트 버튼」 짝이 그 자리다(온보딩의
 * 「알림 없이 쓸게요」·「나중에 할게요」, 회고의 「이어서 얘기하기」…).
 *
 * 그래서 채운·테두리·위험 버튼만 `buttonLabel` 이고 **iOS 의 Text 버튼은 크기와
 * 상관없이 `label2`(13)** 다 — 안드로이드는 예전 그대로 `label1`·`label2` 다 — 12단에서 「작은 버튼」의 단이다. 처음엔 large·medium 을 `label1`(14)
 * 로 뒀는데 주 버튼(19) 옆에서 여전히 컸다(2026-09-13 · 두 번째 요청). 한 단 더 내리려면
 * `caption1`(12)인데, 거기는 헬퍼 문구와 같은 크기라 행동으로 안 읽힐 수 있다.
 *
 * **안드로이드에서는 보정이 1 이라** `buttonLabel` 이 `label1` 과 같은 값이고, Text 버튼만
 * `label2` 로 한 단 작다.
 */
const labelToken = (variant: ButtonVariant, sizeName: ButtonSize): TextToken =>
  variant === "text"
    ? iosVariant("label2", sizeName === "small" ? "label2" : "label1")
    : sizeName === "small"
      ? "buttonLabelSmall"
      : "buttonLabel";

const VARIANTS: Record<ButtonVariant, Variant> = {
  solid: {
    container: { backgroundColor: primary.heavy },
    labelColor: labelColor.onFill,
    scrim: overlay.pressNormal,
  },
  outlined: {
    container: { backgroundColor: "transparent", ...hairline.normal },
    labelColor: labelColor.normal,
    scrim: overlay.pressLight,
  },
  // 면도 테두리도 없다 — 3순위 행동. 히트 영역은 높이가 만든다
  text: {
    container: { backgroundColor: "transparent" },
    labelColor: primary.heavy,
    scrim: overlay.pressLight,
  },
  // `DESIGN.md` §11 — 되돌릴 수 없는 확인의 **확인 버튼만** 위험색이다
  destructive: {
    container: { backgroundColor: status.negative },
    labelColor: labelColor.onFill,
    scrim: overlay.pressStrong,
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.medium,
  },
  fill: { alignSelf: "stretch" },
  // 비활성은 면·라벨 색으로만 말한다 — 경고 아이콘·문구를 붙이지 않는다(RULES 4)
  disabled: { backgroundColor: interaction.disabled, borderWidth: 0 },
  scrim: { borderRadius: radius.medium },
  raised: { boxShadow: `0px ${raised.depth}px 0px ${raisedShadow.grass}` },
});
