import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperTypography } from "@/design/paper";
import { actionCard } from "@/design/tokens.mvp";

/**
 * `.acrow` — 행동 카드의 한 줄. **라벨 열 62 + 값**이라 두 줄의 값 시작점이
 * 같아야 표로 읽힌다. 일기 초안(`C6-b`)과 일기 상세(`A3`)가 같은 줄을 쓴다.
 *
 * 값 자리에 입력을 넣을 수도 있다 — 느낀 점(`A3-c`)이 `children` 으로 들어온다.
 *
 * 새 디자인(`variant="paper"`)은 **라벨이 값 위로 올라간 블록**이다
 * (`design-system.md` §4.5 · `쉼터.dc.html` 의 행동 카드와 같은 짜임).
 * 아직 리스킨 전인 `C6-b` 는 기본형을 그대로 쓴다 — 한 화면에 두 체계를 섞지 않는다.
 */
type Props = {
  label: string;
  value: string;
  children?: ReactNode;
  variant?: "default" | "paper";
  /**
   * 라벨의 색 역할 — `situation` 상황(초록) · `action` 목표 행동(모래) ·
   * `neutral` 그 밖(느낀 점). `paper` 에서만 쓴다.
   *
   * 시안 값 `#8FA28A`·`#C8A96B` 는 글자로 쓰면 2.7·2.2 라 같은 계열의 진한 톤
   * (`greenDark`·`sandText`)이다 (`PLAN.md` Phase 1 대비 보정).
   */
  tone?: "situation" | "action" | "neutral";
};

export function ActionRow({
  label,
  value,
  children,
  variant = "default",
  tone = "neutral",
}: Props) {
  if (variant === "paper") {
    return (
      <View style={styles.block}>
        <AppText weight="700" style={[styles.blockLabel, LABEL_COLOR[tone]]}>
          {label}
        </AppText>
        {children ?? <AppText style={styles.blockValue}>{value}</AppText>}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <AppText tone="caption" weight="500" style={styles.label}>
        {label}
      </AppText>
      {children ?? (
        <AppText tone="body" style={styles.value}>
          {value}
        </AppText>
      )}
    </View>
  );
}

const { styles: type } = paperTypography;

const LABEL_COLOR = {
  situation: { color: paperColors.brand.greenDark },
  action: { color: paperColors.accent.sandText },
  neutral: { color: paperColors.text.mutedWarmText },
} as const;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: actionCard.gap },
  label: {
    width: actionCard.labelWidth,
    fontSize: actionCard.labelSize,
    lineHeight: actionCard.labelSize * actionCard.lineHeight,
  },
  value: {
    flex: 1,
    fontSize: actionCard.valueSize,
    lineHeight: actionCard.valueSize * actionCard.lineHeight,
  },

  // ── 새 디자인 — 라벨이 값 위로 ──────────────────────────────────────
  block: { gap: 4 },
  blockLabel: { fontSize: type.label.fontSize, lineHeight: type.label.lineHeight },
  blockValue: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.primary,
  },
});
