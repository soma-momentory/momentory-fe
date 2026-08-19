import { StyleSheet, View } from "react-native";

import {
  background,
  elevation,
  label as labelColor,
  layout,
  overlay,
  radius,
  space,
  zIndex,
} from "@/design/ds";

import { Button } from "./Button";
import { Text } from "./Text";

/**
 * 확인 모달 — `design.md` §11. **radius 20 · 제목 + 설명 + 액션 2개.**
 *
 * ## 왜 모달이 있나 — 규칙이 하나 바뀌었다
 *
 * `docs/spec/RULES.md` 는 「오류·거부·실패는 한 줄 안내로 흡수 · **모달 금지**」다.
 * 그 규칙은 **그대로 살아 있다** — 오류를 모달로 띄우지 않는다. 이 컴포넌트는
 * 오류가 아니라 **되돌릴 수 없는 행동의 확인**이다(일정 삭제 — §11 · `Schedule` 4-4).
 * 반입 디자인 우선 결정(2026-08-20 · `PLAN.md` A-2 N2)으로 열렸다.
 *
 * **잃는 것이 있을 때만 묻는다.** 되돌릴 수 있는 동작에는 쓰지 않는다 —
 * 확인을 남발하면 사용자는 읽지 않고 누르게 되고, 그때 진짜 확인이 무력해진다.
 *
 * ## 두 버튼
 *
 * 머무르는 쪽(취소)이 `outlined`, 실행하는 쪽이 `solid` 다.
 * **파괴적 행동이면 확인 버튼만 위험색**이다(§11 「Destructive」) —
 * `destructive` 를 켜면 `status.negative` 면 + 흰 라벨(4.99 AA)이 된다.
 * 취소 쪽을 위험색으로 만들지 않는다.
 */
type Props = {
  title: string;
  /** 무엇을 잃는지 여기 적는다 */
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** 되돌릴 수 없는 삭제 — 확인 버튼만 위험색이 된다 */
  destructive?: boolean;
};

export function Modal({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  destructive = false,
}: Props) {
  return (
    <View testID="ds-modal-overlay" style={styles.root}>
      {/* 딤은 누를 수 없다 — 확인은 두 버튼 중 하나로만 끝난다 */}
      <View
        accessibilityViewIsModal
        accessibilityRole="alert"
        accessibilityLabel={`${title}. ${description}`}
        style={styles.card}
      >
        <Text variant="heading1" color={labelColor.strong}>
          {title}
        </Text>
        <Text variant="body2Reading" color={labelColor.neutral}>
          {description}
        </Text>
        <View style={styles.actions}>
          <Button label={cancelLabel} variant="outlined" onPress={onCancel} style={styles.action} />
          <Button
            label={confirmLabel}
            variant={destructive ? "destructive" : "solid"}
            onPress={onConfirm}
            style={styles.action}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 시트와 같은 이유로 스스로 화면 전체를 덮는다 (`BottomSheet` 주석 · `design.md` §11)
  root: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: zIndex.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.screenPadding,
    backgroundColor: overlay.dimmer,
  },
  card: {
    alignSelf: "stretch",
    backgroundColor: background.elevated,
    borderRadius: radius.xlarge,
    padding: 22,
    gap: space.sm,
    ...elevation.overlay,
  },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  action: { flex: 1 },
});
