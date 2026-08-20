import { Modal as RNModal, StyleSheet, View } from "react-native";

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
 *
 * ## 화면 어디에 두든 화면 전체를 덮는다
 *
 * RN 의 네이티브 `Modal` 로 감싼다 — **부모 트리 밖의 창**에 그려지기 때문이다.
 * 절대 배치만 썼을 때는 `ScrollView` 안에서 열면 **스크롤 내용에 갇혀 보이지 않았다**
 * (보관함이 실제로 밟고 우회했다 · `PLAN.md` A-12). 이제 부르는 쪽이 어디에 두든
 * 상관하지 않는다.
 *
 * `statusBarTranslucent` 은 Android 에서 **딤이 상태바까지 덮게** 한다 — 없으면
 * 위쪽만 밝게 남아 덮개가 끊긴다.
 *
 * ## Android 뒤로가기
 *
 * RN 이 `onRequestClose` 를 요구하고, 그것을 **취소로 연결한다.** 하드웨어 뒤로가기가
 * 아무 일도 하지 않으면 모달에 갇히고, 확인으로 연결하면 되돌릴 수 없는 행동이
 * 실수로 실행된다. **딤을 눌러 닫는 것과는 다른 이야기다** — 딤은 여전히 안 눌린다.
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
    <RNModal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
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
            <Button
              label={cancelLabel}
              variant="outlined"
              onPress={onCancel}
              style={styles.action}
            />
            <Button
              label={confirmLabel}
              variant={destructive ? "destructive" : "solid"}
              onPress={onConfirm}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </RNModal>
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
