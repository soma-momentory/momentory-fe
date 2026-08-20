import type { ReactNode } from "react";
import {
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
  label as labelColor,
  overlay,
  primary,
  radius,
  size,
  space,
  status,
} from "@/design/ds";

import { Text } from "./Text";

/**
 * Momentory DS — 버튼 (`design.md` §6).
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
 * `design.md` §6 대로 자기 fill 은 그대로 두고 **스크림을 얹는다.** 그래서
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
 * `design.md` 는 `#7C9E86` + 흰 라벨을 지정하는데 그 조합이 **2.91** 로 AA 미달이다.
 * 흰 글자가 얹히는 초록 면은 `primary.heavy`(5.03) 하나뿐이다 —
 * `src/design/ds/color.ts` 머리말 · `PLAN.md` A-5.
 *
 * **한 화면에 solid 는 하나다**(`design.md` §6 CTA 위계). 보조는 `outlined`,
 * 3순위는 `text` — 코드가 강제할 수 없으니 화면에서 지킨다.
 */
export type ButtonVariant = "solid" | "outlined" | "text" | "destructive";
export type ButtonSize = "large" | "medium" | "small";

type Props = Omit<PressableProps, "style" | "children"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 라벨 왼쪽 아이콘 */
  leading?: ReactNode;
  /** 좌우로 꽉 채운다. 기본은 hug (`design.md` §6 「Hug 또는 Fill」) */
  fill?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = "solid",
  size: sizeName = "large",
  leading,
  fill = false,
  disabled = false,
  accessibilityRole = "button",
  accessibilityState,
  style,
  ...rest
}: Props) {
  const v = VARIANTS[variant];
  const height = size.button[sizeName];

  return (
    <Pressable
      {...rest}
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
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {leading}
          <Text
            variant={sizeName === "small" ? "label2" : "label1"}
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
    </Pressable>
  );
}

type Variant = { container: ViewStyle; labelColor: string; scrim: string };

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
  // `design.md` §11 — 되돌릴 수 없는 확인의 **확인 버튼만** 위험색이다
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
});
