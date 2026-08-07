import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import theme from "@/design/theme";

/**
 * 인라인 확인 카드 — **모달을 두지 않는다**(`RULES.md`).
 *
 * 확인은 **잃는 것이 있을 때만** 묻는다 — 저장하지 않은 변경을 버릴 때(`M2`),
 * 완료 기록과 느낀 점을 지울 때(`A3-c`). 되돌릴 수 있는 동작에는 쓰지 않는다.
 * 두 버튼의 무게는 같다 — 실행 쪽을 채우거나 위험색 면으로 만들지 않는다.
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
};

export function ConfirmCard({
  title,
  caption,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
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

const styles = StyleSheet.create({
  card: {
    gap: 8,
    backgroundColor: theme.colors.semantic.surfaceTone,
    borderColor: "transparent",
  },
  title: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 9, paddingTop: 4 },
  button: { flex: 1 },
});
