import { Modal as NativeModal, StyleSheet, View } from "react-native";

import { BottomSheet, Button, Text } from "@/components/ds";
import { label as labelColor, layout, size, space } from "@/design/ds";
import { openExternalLink } from "@/lib/links";

/** 위치를 처음 물을 때 한 번만 보여 준다. 좌표 캐시와 MET Norway 전송이 있어 저장 부재를 단정하지 않는다. */
export function WeatherIntroSheet({
  onAccept,
  onDismiss,
}: {
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <NativeModal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <BottomSheet title="오늘 날씨도 함께 볼까요?" closable onDismiss={onDismiss}>
        <View style={styles.content}>
          <Text variant="body2Reading" color={labelColor.neutral}>
            지금 있는 곳의 날씨를 홈에 붙여 둘게요. 위치는 날씨를 찾는 데만 써요.
          </Text>
          <Button label="위치 허용하기" fill onPress={onAccept} />
          {/* 글자 버튼 둘은 안드로이드에서도 글자 높이(32)로, 주 버튼 아래에 바짝 붙인다 — 48 에 간격까지 더하면
              주 버튼 아래가 비어 보였다(2026-11-11 실기기). 누르는 넓이는 hitSlop 으로 44 를 지킨다 */}
          <View style={styles.textActions}>
            <Button
              label="다음에"
              variant="text"
              size="small"
              fill
              hitSlop={TEXT_HIT_SLOP}
              onPress={onDismiss}
            />
            <Button
              label="개인정보 처리방침"
              variant="text"
              size="small"
              fill
              hitSlop={TEXT_HIT_SLOP}
              onPress={() => void openExternalLink("privacy")}
            />
          </View>
        </View>
      </BottomSheet>
    </NativeModal>
  );
}

const TEXT_HIT_SLOP = {
  top: (layout.minTouch - size.button.small) / 2,
  bottom: (layout.minTouch - size.button.small) / 2,
};

const styles = StyleSheet.create({
  content: { gap: space.sm },
  // 주 버튼과의 간격(content gap 8)을 4 로 줄이고, 글자 버튼끼리는 붙인다
  textActions: { marginTop: -space.xs },
});
