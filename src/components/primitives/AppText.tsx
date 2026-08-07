import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import theme from "@/design/theme";
import { text as textColor } from "@/design/tokens.mvp";

/**
 * 서체는 Pretendard 하나다. 위계는 굵기·크기·자간으로만 만든다.
 * (`02_디자인시스템/theme.ts` · `09_MVP/docs/S0.md` — "명조는 쓰지 않는다")
 *
 * RN 에서는 `fontWeight` 가 아니라 **파일 이름**으로 굵기를 고른다.
 * Android 는 `fontWeight` 로 OTF 굵기를 골라주지 않아 400 과 700 이 같게 렌더된다.
 */
const FAMILY = {
  "400": "Pretendard-Regular",
  "500": "Pretendard-Medium",
  "600": "Pretendard-SemiBold",
  "700": "Pretendard-Bold",
} as const;

type Weight = keyof typeof FAMILY;

/** `theme.typography.styles` 그대로. 값을 여기 다시 적지 않는다 */
export type TextVariant = keyof typeof theme.typography.styles;

/** 화면 코드가 쓰는 색 이름 — semantic 6종 (`09_MVP/docs/RULES.md` 「접근성」) */
export type TextTone = keyof typeof textColor;

type Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /** 프리셋 굵기를 덮는다. 같은 역할인데 강조만 다른 자리에만 쓴다 */
  weight?: Weight;
};

export function AppText({ variant = "body", tone = "body", weight, style, ...rest }: Props) {
  return (
    <Text style={[styles[variant], colorOf(tone), fontOf(variant, weight), style]} {...rest} />
  );
}

const colorOf = (tone: TextTone): TextStyle => ({ color: textColor[tone] });

const fontOf = (variant: TextVariant, override?: Weight): TextStyle => ({
  fontFamily: FAMILY[override ?? (theme.typography.styles[variant].fontWeight as Weight)],
});

// 프리셋은 theme 에서 그대로 만든다 — 값을 손으로 옮겨 적으면 상류가 바뀔 때 여기만 남는다.
// fontWeight 는 빼고 fontFamily 로 옮긴다(위 FAMILY 참조).
const styles = StyleSheet.create(
  Object.fromEntries(
    Object.entries(theme.typography.styles).map(([name, s]) => [
      name,
      { fontSize: s.fontSize, lineHeight: s.lineHeight },
    ]),
  ) as Record<TextVariant, TextStyle>,
);
