import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import theme from "@/design/theme";

import { AppText } from "./AppText";

/**
 * 상단 왼쪽 ‹ . (`09_MVP` 상류 `flows/9-mvp.mjs` `mnav()`)
 *
 * **첫 질문에서도 자리를 예약한다.** 없으면 진행점의 y 가 흔들린다 —
 * 화면을 넘길 때마다 상단이 미세하게 튀어 보인다 (`docs/TASKS.md` M1-3).
 * 그래서 `hidden` 은 언마운트가 아니라 **빈 자리**를 남긴다.
 *
 * Android 시스템 뒤로가기와 같은 동작을 해야 한다 — 화면 쪽에서 같은 핸들러를
 * `BackHandler` 에도 물린다. 여기서는 탭만 받는다.
 *
 * ⚠ 원본 `2-onboarding.mjs` 는 글리프 26 · ink 색이지만 MVP 는 **19 · body** 다.
 */
const GLYPH_W = 24;
const GLYPH_H = 23;

type Props = Omit<PressableProps, "style" | "children"> & {
  /** 자리만 남기고 그리지 않는다. 온보딩 첫 질문이 그렇다 */
  hidden?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BackChevron({ hidden = false, style, ...rest }: Props) {
  if (hidden) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.box, style]}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="뒤로"
      // 글리프는 24×23 이라 그대로 두면 탭 대상이 44pt 에 못 미친다. 시각 크기를
      // 키우지 않고 hitSlop 으로 넓힌다 (`RULES.md` 「터치·접근성」).
      hitSlop={theme.touch.hitSlopForSmallGlyph}
      {...rest}
      style={[styles.box, style]}
    >
      <AppText variant="heading" tone="body" weight="600" style={styles.glyph}>
        ‹
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { width: GLYPH_W, height: GLYPH_H, justifyContent: "center" },
  // MVP 는 19 — heading(17) 프리셋보다 크다. 글리프 하나뿐이라 lineHeight 를
  // 높이에 맞춰 눌러 둔다(프리셋의 24 를 쓰면 상자를 넘친다).
  glyph: { fontSize: 19, lineHeight: GLYPH_H },
});
