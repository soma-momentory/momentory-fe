import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { label, radius, space } from "@/design/ds";
import { retroDiary } from "@/design/ds/retroDiary";

/** 두 방식은 같은 크기로 제시하고, 누르면 선택한 작성 화면을 바로 연다. */
export function RetroMethodChoices({
  onTalk,
  onWrite,
}: {
  onTalk: () => void;
  onWrite: () => void;
}) {
  return (
    <View style={styles.stack}>
      <Text variant="headline1" color={label.onFill}>
        어떤 방식으로 돌아볼까요?
      </Text>
      <Method
        title="AI와 대화하기"
        description="바바와 이야기하며 오늘을 정리해요"
        onPress={onTalk}
      />
      <Method
        title="직접 일기 쓰기"
        description="떠오르는 이야기를 내 문장으로 남겨요"
        onPress={onWrite}
      />
    </View>
  );
}

function Method({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
    >
      <View style={styles.copy}>
        <Text variant="headline1" color={retroDiary.babaInk}>
          {title}
        </Text>
        <Text variant="label1" color={retroDiary.babaInk}>
          {description}
        </Text>
      </View>
      <Text variant="headline1" color={retroDiary.babaInk} accessible={false}>
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.large,
    backgroundColor: retroDiary.question,
  },
  copy: { flex: 1, gap: space.xs },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
