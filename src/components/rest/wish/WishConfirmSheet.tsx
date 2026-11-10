import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheet, Text } from "@/components/ds";
import { ScenePillButton } from "@/components/rest/scene/SceneChrome";
import { label as labelColor, primary, radius, space, wishScene } from "@/design/ds";
import { WISH_ANONYMOUS, WISH_CONFIRM } from "@/features/rest/model/wish";

/** 띄우기 전 확인 — AI 가 고친 글을 그대로 보여 준다. 공개되는 글이라 한 번 더 묻는다 */
export function WishConfirmSheet({
  content,
  edited,
  posting,
  onPost,
  onEdit,
}: {
  content: string;
  edited: boolean;
  posting: boolean;
  onPost: () => void;
  onEdit: () => void;
}) {
  return (
    <BottomSheet title={WISH_CONFIRM.title} closable={!posting} onDismiss={onEdit}>
      <View style={styles.preview}>
        <Text variant="caption1" color={labelColor.alternative}>
          {WISH_ANONYMOUS}
        </Text>
        <Text variant="body1" color={labelColor.strong}>
          {content}
        </Text>
        {edited ? (
          <Text variant="caption1" color={primary.heavy}>
            {WISH_CONFIRM.edited}
          </Text>
        ) : null}
      </View>
      <Text variant="body2" color={labelColor.neutral} style={styles.notice}>
        {WISH_CONFIRM.notice}
      </Text>
      {/* 쉼 콘텐츠 안쪽 버튼은 빈티지 알약 결이다(`DESIGN.md` 쉼 콘텐츠 공통 규칙 5 · 2026-11-10) */}
      <ScenePillButton
        label={posting ? WISH_CONFIRM.posting : WISH_CONFIRM.post}
        tone="accent"
        disabled={posting}
        onPress={onPost}
      />
      {posting ? null : (
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.edit}>
          <Text variant="label1" color={primary.heavy}>
            {WISH_CONFIRM.edit}
          </Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  preview: {
    backgroundColor: wishScene.past,
    borderRadius: radius.medium,
    padding: space.md,
    gap: space.xs,
  },
  notice: { marginVertical: space.md },
  edit: { minHeight: 44, alignItems: "center", justifyContent: "center" },
});
