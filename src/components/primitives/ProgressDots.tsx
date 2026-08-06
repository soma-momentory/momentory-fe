import { StyleSheet, View, type ViewProps } from "react-native";

import theme from "@/design/theme";

/**
 * 온보딩 진행 점. (`09_MVP` 상류 `flows/9-mvp.mjs` `dots6()`)
 *
 * **숫자를 쓰지 않는다** — "4/6" 도, 퍼센트도. 활성 점만 6→18px 로 늘어나는 것이
 * 유일한 표시다 (`RULES.md` 「숫자로 압박하지 않는다」).
 *
 * ⚠ 원본 `2-onboarding.mjs` `progressDots()` 는 **gap 8**, MVP 는 **gap 6** 이다.
 * 우리가 만드는 것은 MVP 다.
 */
const COUNT = 6;
const SMALL = 6;
const ACTIVE = 18;
const GAP = 6;

type Props = Omit<ViewProps, "children"> & {
  /** 0부터. `null` 이면 아무것도 그리지 않는다 — 완료 화면·쉼터가 그렇다 */
  activeIndex: number | null;
};

export function ProgressDots({ activeIndex, style, ...rest }: Props) {
  if (activeIndex == null) return null;

  return (
    <View
      // 점은 장식이고, 진행 상태는 컨테이너 하나가 말한다. 점 6개를 따로 읽으면
      // 보조기술에는 의미 없는 소음이 된다. View 는 role 만으로는 접근성 요소가
      // 되지 않아서 accessible 을 함께 세운다.
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: COUNT, now: activeIndex + 1 }}
      {...rest}
      style={[styles.row, style]}
    >
      {Array.from({ length: COUNT }, (_, i) => (
        <View
          key={i}
          testID={i === activeIndex ? "dot-active" : "dot"}
          style={[styles.dot, i === activeIndex ? styles.active : null]}
        />
      ))}
    </View>
  );
}

const { semantic } = theme.colors;

// 활성은 primary — 장식 전용 색이 맞는 자리다(점·바). 비활성은 ink 16%.
// 0.16 × 255 = 40.8 → 29.
const IDLE = `${semantic.textPrimary}29`;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end", // 상단 오른쪽 고정
    gap: GAP,
  },
  dot: {
    width: SMALL,
    height: SMALL,
    borderRadius: SMALL / 2,
    backgroundColor: IDLE,
  },
  active: {
    width: ACTIVE,
    backgroundColor: semantic.accent,
  },
});
