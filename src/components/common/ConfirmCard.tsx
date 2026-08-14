import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import theme from "@/design/theme";

/**
 * 인라인 확인 카드 — **모달을 두지 않는다**(`RULES.md`).
 *
 * 확인은 **잃는 것이 있을 때만** 묻는다 — 저장하지 않은 변경을 버릴 때(`M2`),
 * 완료 기록과 느낀 점을 지울 때(`A3-c`). 되돌릴 수 있는 동작에는 쓰지 않는다.
 * 두 버튼의 무게는 같다 — 실행 쪽을 채우거나 위험색 면으로 만들지 않는다.
 *
 * `paper` 변형은 새 디자인의 확인(`docs/design/design-system.md` §4.9)이다 —
 * 시안은 화면 가운데 뜨는 모달이지만 **여기는 그대로 인라인 카드**다(모달 금지
 * 규칙이 이긴다 — `PLAN.md` §3-4). 바뀌는 것은 면·글자색과 버튼 두 개의 모양이고,
 * 실행 쪽은 **면을 채우지 않고 글자·테두리만** 위험색(`accent.dangerFill` — 4.87 AA)이다.
 * 리스킨된 화면만 opt-in 한다.
 */
type Props = {
  title: string;
  caption: string;
  /** 머무르는 쪽 — 아무것도 잃지 않는다 */
  cancelLabel: string;
  /** 실행하는 쪽 — 잃는 것이 caption 에 적혀 있어야 한다 */
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  variant?: "default" | "paper";
};

export function ConfirmCard({
  title,
  caption,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  variant = "default",
}: Props) {
  if (variant === "paper") {
    return (
      <Card variant="paperOpaque" style={styles.paperCard}>
        <AppText weight="700" style={styles.paperTitle}>
          {title}
        </AppText>
        <AppText style={styles.paperCaption}>{caption}</AppText>
        <View style={styles.actions}>
          <PaperAction label={cancelLabel} onPress={onCancel} />
          <PaperAction label={confirmLabel} onPress={onConfirm} destructive />
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <AppText tone="strong" weight="600" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="caption" tone="caption">
        {caption}
      </AppText>
      <View style={styles.actions}>
        <AppButton label={cancelLabel} variant="ghost" style={styles.button} onPress={onCancel} />
        <AppButton label={confirmLabel} variant="ghost" style={styles.button} onPress={onConfirm} />
      </View>
    </Card>
  );
}

/** 새 디자인의 확인 버튼 — 테두리 알약 둘. 실행 쪽도 면을 채우지 않는다 */
function PaperAction({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.paperButton, destructive ? styles.paperButtonDanger : null]}
    >
      <AppText
        weight="700"
        style={[styles.paperLabel, destructive ? styles.paperLabelDanger : null]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  card: {
    gap: 8,
    backgroundColor: theme.colors.semantic.surfaceTone,
    borderColor: "transparent",
  },
  title: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 9, paddingTop: 4 },
  button: { flex: 1 },

  paperCard: { gap: 8 },
  paperTitle: {
    fontSize: type.cardTitle.fontSize,
    lineHeight: type.cardTitle.lineHeight,
    color: paperColors.text.primary,
  },
  paperCaption: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.green,
  },
  paperButton: {
    flex: 1,
    minHeight: theme.touch.minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: paperRadius.field,
    borderWidth: 1.5,
    borderColor: paperColors.neutral.tabInactiveBorder,
    backgroundColor: paperColors.bg.field,
  },
  paperButtonDanger: { borderColor: paperColors.accent.dangerFill },
  paperLabel: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: paperColors.text.green,
  },
  paperLabelDanger: { color: paperColors.accent.dangerFill },
});
