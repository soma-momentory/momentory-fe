import { StyleSheet, View, type ViewProps } from "react-native";

import { background, fill, hairline, radius, space } from "@/design/ds";

/**
 * 카드 — `design.md` §8.
 *
 * - 배경 **Elevated** + `line.neutral` hairline, **그림자 없음**, radius 16
 * - 내부 패딩 16~22 (기본 16, 넉넉히 쓸 땐 `padding="loose"`)
 *
 * ## 카드를 만들지 않는 자리가 있다
 *
 * **배경만으로 구분되면 카드를 만들지 않는다**(§8) — 홈의 오늘 일정, 쉼터의 지난
 * 기록 캘린더가 그렇다. 카드를 겹칠수록 위계가 아니라 소음이 는다.
 *
 * ## 격자 위에 뜨려면 불투명해야 한다
 *
 * 배경 격자가 32px 로 깔려 있어서(§5) 반투명 면을 쓰면 격자가 글자 뒤로 비친다.
 * 그래서 면은 **불투명 Elevated** 다 — `backgroundColor` 를 덮어쓰지 않는다.
 */
type Props = ViewProps & {
  /** 기본 16 · `loose` 22 (`design.md` §8 의 16~22 대역 양 끝) */
  padding?: "default" | "loose" | "none";
};

export function Card({ padding = "default", style, ...rest }: Props) {
  return <View {...rest} style={[styles.base, PADDING[padding], style]} />;
}

const PADDING = {
  default: { padding: space.lg },
  loose: { padding: 22 },
  none: {},
} as const;

/**
 * 정보 블록 — 안내문(`design.md` §8 마지막 줄).
 *
 * **카드가 아니다.** `fill.alternative` 면 + radius 12 이고 **hairline 이 없다** —
 * 카드와 같은 테두리를 주면 같은 위계로 읽힌다.
 */
export function InfoBlock({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.info, style]} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: background.elevated,
    borderRadius: radius.large,
    ...hairline.neutral,
  },
  info: {
    backgroundColor: fill.alternative,
    borderRadius: radius.medium,
    padding: space.md,
    gap: space.sm,
  },
});
