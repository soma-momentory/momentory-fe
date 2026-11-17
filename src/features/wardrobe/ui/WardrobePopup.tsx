import type { ReactNode } from "react";
import { Modal as RNModal, Pressable, StyleSheet, View } from "react-native";

import { IconButton } from "@/components/ds";
import { homeV2, layout, overlay, space, wardrobe, zIndex } from "@/design/ds";

const P = wardrobe.popup;

/**
 * 옷장 팝업 — 아이템 사기 · 첫 선물처럼 **그림을 먼저 보여 주는** 가운데 카드. 잃는 것이 없을 때 띄우므로 딤이나 X 로 닫힌다.
 *
 * 2026-11-17 홈과 같은 결로 바꿨다 — 홈 말풍선과 같은 종이색 · 회베이지 외곽선의 **매끈한 둥근 카드**에 옅은 그림자.
 * 손으로 오린 울퉁불퉁한 종이(리포트 `CutPaper`) · 기울기 · 위쪽 테이프도 해 봤지만 자글자글해 보여 뺐다(사용자). 그 전에는 공용 확인 모달(`Modal`)과
 * 같은 흰 둥근 상자라 시스템 창처럼 읽혔다.
 */
export function WardrobePopup({
  testID,
  accessibilityLabel,
  onDismiss,
  children,
}: {
  testID?: string;
  accessibilityLabel: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    <RNModal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        />
        <View
          testID={testID}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={styles.card}
        >
          <IconButton
            name="close"
            accessibilityLabel="닫기"
            color={homeV2.color.ink}
            onPress={onDismiss}
            style={styles.close}
          />
          {children}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: zIndex.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.screenPadding,
    backgroundColor: overlay.dimmer,
  },
  card: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: space.sm,
    paddingTop: space.xl3,
    paddingBottom: space.xl,
    paddingHorizontal: space.xl,
    borderRadius: P.radius,
    borderWidth: 1.8,
    borderColor: homeV2.color.bubbleBorder,
    backgroundColor: homeV2.color.card,
    boxShadow: homeV2.shadow.hero,
  },
  close: { position: "absolute", top: P.closeInset, right: P.closeInset, zIndex: 1 },
});
