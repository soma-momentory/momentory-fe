import { StyleSheet, View } from "react-native";

import { BottomSheet, Button, Text } from "@/components/ds";
import { background, fill, label, radius, space } from "@/design/ds";

import { WHATS_NEW } from "../model/whatsNew";

/** 업데이트 소식 — 업데이트한 기존 사용자가 홈에 처음 들어왔을 때 한 번 뜬다. 판은 「귤 모으기」 미션과 같다 */
export function WhatsNewSheet({ onDismiss }: { onDismiss: () => void }) {
  return (
    <BottomSheet title={WHATS_NEW.title} onDismiss={onDismiss}>
      <View testID="whats-new-sheet" style={styles.body}>
        <View style={styles.panel}>
          {WHATS_NEW.lines.map((line) => (
            <View key={line} style={styles.card}>
              <Text variant="body1" color={label.normal}>
                {line}
              </Text>
            </View>
          ))}
        </View>
        <Button label="확인" fill onPress={onDismiss} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg, paddingBottom: space.sm },
  panel: {
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.large,
    backgroundColor: fill.alternative,
  },
  card: {
    padding: space.md,
    borderRadius: radius.large,
    backgroundColor: background.elevated,
  },
});
