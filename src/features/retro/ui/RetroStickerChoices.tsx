import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ds";
import {
  background,
  label as labelColor,
  layout,
  line,
  radius,
  retroDiary,
  size,
  space,
} from "@/design/ds";

/** 회고 대화·일기 감정 편집·Lab이 공유하는 둥근 스티커 선택지. 선택은 색과 가장자리 선으로 표시한다. */
export function RetroStickerChoices({
  options,
  selected,
  onToggle,
  disabled = false,
  descriptionSeparator = ": ",
  descriptionPlacement = "inside",
  unselectedAppearance = "sticker",
  arrangement = "wrap",
  selectedTone = "green",
  selectionBorder = "contrast",
}: {
  options: readonly {
    id?: string;
    label: string;
    hint?: string | null;
    description?: string | null;
  }[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  descriptionSeparator?: string;
  descriptionPlacement?: "inside" | "outside";
  unselectedAppearance?: "sticker" | "outlined";
  arrangement?: "wrap" | "stack";
  selectedTone?: "green" | "brown";
  selectionBorder?: "contrast" | "fill";
}) {
  const detailed = options.some((option) => option.hint || option.description);
  return (
    <View style={styles.group}>
      <View
        style={arrangement === "stack" ? styles.stack : detailed ? styles.details : styles.stickers}
      >
        {options.map(({ label, id = label, hint, description }) => {
          const picked = selected.includes(id);
          const explanation = [hint, description].filter(Boolean).join(" · ");
          const outlined = !picked && unselectedAppearance === "outlined";
          const outside = descriptionPlacement === "outside" && explanation !== "";
          const color = picked
            ? retroDiary.onGreen
            : outlined
              ? labelColor.neutral
              : retroDiary.inputText;
          const surface = [
            styles.sticker,
            outside && styles.compactSticker,
            picked && (selectedTone === "brown" ? styles.brownPicked : styles.picked),
            outlined && styles.outlined,
          ];
          const content = (
            <>
              {picked || outlined ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.selectionLine,
                    picked && selectedTone === "brown" && styles.brownSelectionLine,
                    picked &&
                      selectionBorder === "fill" &&
                      (selectedTone === "brown" ? styles.brownFillLine : styles.greenFillLine),
                    outlined && styles.outline,
                  ]}
                />
              ) : null}
              <Text variant="body1Reading" style={styles.label} color={color}>
                <Text variant="body1Reading" color={color}>
                  {label}
                </Text>
                {!outside && explanation ? descriptionSeparator : null}
                {!outside && explanation ? (
                  <Text variant="body1Reading" color={color}>
                    {explanation}
                  </Text>
                ) : null}
              </Text>
            </>
          );
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={explanation ? label : undefined}
              accessibilityHint={explanation || undefined}
              accessibilityState={{ selected: picked, disabled }}
              disabled={disabled}
              onPress={() => onToggle(id)}
              style={({ pressed }) => [
                outside ? styles.explainedChoice : surface,
                pressed && styles.pressed,
              ]}
            >
              {outside ? (
                <>
                  <View style={surface}>{content}</View>
                  <Text variant="body2" color={labelColor.normal} style={styles.explanation}>
                    {`${descriptionSeparator.trim()} ${explanation}`}
                  </Text>
                </>
              ) : (
                content
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  details: { gap: space.sm, alignItems: "flex-start" },
  stack: { gap: space.sm },
  label: { flexShrink: 1 },
  stickers: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  sticker: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.minTouch,
    maxWidth: "100%",
    paddingVertical: space.sm,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    backgroundColor: retroDiary.question,
  },
  picked: { backgroundColor: retroDiary.answer },
  compactSticker: {
    minHeight: size.chip.height,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
  brownPicked: { backgroundColor: retroDiary.methodTalk },
  brownSelectionLine: { borderColor: retroDiary.babaInk },
  brownFillLine: { borderColor: retroDiary.methodTalk },
  greenFillLine: { borderColor: retroDiary.answer },
  outlined: { backgroundColor: background.elevated },
  outline: { borderWidth: 1, borderColor: line.neutral },
  explainedChoice: {
    minHeight: layout.minTouch,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  explanation: { flex: 1, minWidth: 0 },
  selectionLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderWidth: retroDiary.choiceBorderWidth,
    borderColor: retroDiary.question,
    borderRadius: radius.full,
  },
  pressed: { opacity: 0.8 },
});
