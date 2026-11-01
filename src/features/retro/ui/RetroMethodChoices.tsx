import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { Icon } from "@/components/ds/icons/Icon";
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
        emphasized
        title="AI와 대화하기"
        description="바바와 이야기하며 오늘을 정리해요"
        onPress={onTalk}
        icon={
          <View
            style={styles.face}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={require("../../../../assets/retro/baba-diary.png")}
              style={styles.faceImage}
            />
          </View>
        }
      />
      <Method
        title="직접 일기 쓰기"
        description="떠오르는 이야기를 내 문장으로 남겨요"
        onPress={onWrite}
        icon={<Icon name="pencil" size={24} color={retroDiary.babaInk} />}
      />
    </View>
  );
}

function Method({
  emphasized = false,
  title,
  description,
  onPress,
  icon,
}: {
  emphasized?: boolean;
  title: string;
  description: string;
  onPress: () => void;
  icon: ReactNode;
}) {
  const textColor = emphasized ? retroDiary.paper : retroDiary.babaInk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        emphasized && styles.talkChoice,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.copy}>
        <Text variant="headline1" color={textColor}>
          {title}
        </Text>
        <Text variant="label1" color={textColor}>
          {description}
        </Text>
      </View>
      <View style={styles.iconSlot} pointerEvents="none" accessible={false}>
        {icon}
      </View>
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
  talkChoice: { backgroundColor: retroDiary.methodTalk },
  copy: { flex: 1, gap: space.xs },
  iconSlot: {
    width: retroDiary.methodIconSize,
    height: retroDiary.methodIconSize,
    alignItems: "center",
    justifyContent: "center",
  },
  face: {
    width: retroDiary.methodIconSize,
    height: retroDiary.methodIconSize,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  faceImage: {
    position: "absolute",
    width: (1200 * retroDiary.methodIconSize) / retroDiary.methodFaceCrop.width,
    height: (1600 * retroDiary.methodIconSize) / retroDiary.methodFaceCrop.width,
    left:
      (-retroDiary.methodFaceCrop.x * retroDiary.methodIconSize) / retroDiary.methodFaceCrop.width,
    top:
      (-retroDiary.methodFaceCrop.y * retroDiary.methodIconSize) / retroDiary.methodFaceCrop.width,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
