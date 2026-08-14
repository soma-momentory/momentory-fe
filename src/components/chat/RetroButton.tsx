import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";

/**
 * 회고 화면의 CTA — 새 디자인의 알약 버튼.
 *
 * `AppButton` 은 아직 웜 테라코타(`primaryDeep`)라 종이·이끼 톤 화면에서 혼자
 * 튄다. 공용 버튼에 변형을 더하는 것은 `PLAN.md` Phase 2 의 `AppButton` 줄이
 * 맡은 일이라, 회고 리스킨은 **홈 감정 시트가 이미 한 방식**(`app/home/emotion/[id].tsx`
 * 의 `[완료]`)을 따라 여기서 그린다 — 다른 화면의 버튼을 건드리지 않는다.
 *
 * 두 톤:
 * - `solid` **초록 면 + 순백 글자.** 면은 `greenDark` 다 — `brand.green` 위의
 *   흰 글자는 2.7 로 AA 미달이다(`paper.ts` 대비 보정)
 * - `outline` **흰 면 + 초록 테두리 + 잉크 글자** — 시안의 확인 버튼
 *   (「이 정도예요」)이 이 모양이다
 *
 * 잠기면 **흐려질 뿐 사라지지 않는다**(`RULES.md` 4 · `AppButton` 과 같은 .36).
 */
type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "solid" | "outline";
};

export function RetroButton({ label, onPress, disabled = false, tone = "solid" }: Props) {
  const outline = tone === "outline";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.solid,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <AppText weight="700" style={[styles.label, outline ? styles.labelOutline : null]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: paperRadius.pill,
  },
  solid: { backgroundColor: paperColors.brand.greenDark },
  outline: {
    backgroundColor: paperColors.bg.cardOpaque,
    borderWidth: 1.5,
    borderColor: paperColors.brand.greenBorder,
  },
  pressed: { opacity: 0.88 },
  // .off{opacity:.36} — 경고색·아이콘을 붙이지 않는다
  disabled: { opacity: 0.36 },
  label: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.onFill,
  },
  labelOutline: { color: paperColors.text.primary },
});
