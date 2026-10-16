import { Modal as NativeModal, StyleSheet, View } from "react-native";

import { BottomSheet, Button, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
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
          <Button label="다음에" variant="text" fill onPress={onDismiss} />
          <Button
            label="개인정보 처리방침"
            variant="text"
            fill
            onPress={() => void openExternalLink("privacy")}
          />
        </View>
      </BottomSheet>
    </NativeModal>
  );
}

const styles = StyleSheet.create({ content: { gap: space.sm } });
