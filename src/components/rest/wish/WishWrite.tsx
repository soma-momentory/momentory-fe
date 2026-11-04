import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ds";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { fontFamily, label as labelColor, restScene, space, wishScene } from "@/design/ds";
import {
  WISH_ANONYMOUS,
  WISH_MAX_LENGTH,
  WISH_PILL,
  WISH_WRITE_ASK,
  WISH_WRITE_PLACEHOLDER,
  canSubmitWish,
} from "@/features/rest/model/wish";

import { WishAuthorRow } from "./WishAuthorRow";
import { WishNote } from "./WishNote";

const M = wishScene.memo;

/** 소원 쓰기 — 말풍선이 묻고, 메모지에 적고, 「다 썼어요」를 누른다. 이름은 고칠 수 없다 */
export function WishWrite({
  text,
  onChange,
  warning,
  reviewing,
  onBack,
  onSubmit,
}: {
  text: string;
  onChange: (next: string) => void;
  warning: string | null;
  reviewing: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const top = insets.top + space.sm;

  return (
    <KeyboardAvoidingView
      style={StyleSheet.absoluteFill}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SceneBackButton top={top} onPress={onBack} />
      <View style={[styles.ask, { top: top + SCENE_BACK_SIZE + space.xs }]}>
        <View style={styles.bubble}>
          <Text variant="title3Hand" color={restScene.ink}>
            {WISH_WRITE_ASK}
          </Text>
        </View>
      </View>

      <WishNote tilt={-0.5} style={[styles.note, { top: top + SCENE_BACK_SIZE + 68 }]}>
        <WishAuthorRow name={WISH_ANONYMOUS} />
        <TextInput
          accessibilityLabel="소원 쓰기"
          autoFocus
          multiline
          maxLength={WISH_MAX_LENGTH}
          value={text}
          onChangeText={onChange}
          editable={!reviewing}
          placeholder={WISH_WRITE_PLACEHOLDER}
          placeholderTextColor={M.placeholder}
          style={styles.input}
        />
        <Text variant="caption1" color={labelColor.alternative} style={styles.count}>
          {`${text.length} / ${WISH_MAX_LENGTH}`}
        </Text>
      </WishNote>

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        {warning != null ? (
          <View style={styles.warning}>
            <Text variant="label1" color={restScene.ink} style={styles.warningText}>
              {warning}
            </Text>
          </View>
        ) : null}
        <ScenePillButton
          tone="accent"
          label={reviewing ? WISH_PILL.reviewing : WISH_PILL.done}
          disabled={reviewing || !canSubmitWish(text) || warning != null}
          onPress={onSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ask: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  bubble: {
    backgroundColor: wishScene.bubble.color,
    borderRadius: wishScene.bubble.radius,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
  note: {
    minHeight: M.write.minHeight,
    paddingTop: space.xl,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  input: {
    minHeight: 110,
    maxHeight: 160,
    textAlignVertical: "top",
    fontFamily: fontFamily.regular,
    fontSize: M.write.fontSize,
    lineHeight: M.write.lineHeight,
    color: restScene.ink,
  },
  count: { textAlign: "right" },
  foot: { marginTop: "auto", paddingHorizontal: space.xl, gap: space.sm },
  // 밤 배경 위에서 놓치지 않게 바바 말풍선과 같은 면에 얹는다
  warning: {
    backgroundColor: wishScene.bubble.color,
    borderRadius: wishScene.bubble.radius,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  warningText: { textAlign: "center" },
});
