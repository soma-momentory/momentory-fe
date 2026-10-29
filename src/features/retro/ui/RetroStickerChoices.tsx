import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ds";
import { layout, radius, retroDiary, space } from "@/design/ds";

/** 회고 대화와 Lab이 공유하는 둥근 스티커 선택지. 선택은 색과 가장자리 선으로 표시한다. */
export function RetroStickerChoices({
  options,
  selected,
  onToggle,
}: {
  options: readonly {
    id?: string;
    label: string;
    hint?: string | null;
    description?: string | null;
  }[];
  selected: readonly string[];
  onToggle: (id: string) => void;
}) {
  const detailed = options.some((option) => option.hint || option.description);
  return (
    <View style={styles.group}>
      <View style={detailed ? styles.details : styles.stickers}>
        {options.map(({ label, id = label, hint, description }) => {
          const picked = selected.includes(id);
          const explanation = [hint, description].filter(Boolean).join(" · ");
          const color = picked ? retroDiary.onGreen : retroDiary.inputText;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={explanation ? label : undefined}
              accessibilityHint={explanation || undefined}
              accessibilityState={{ selected: picked }}
              onPress={() => onToggle(id)}
              style={({ pressed }) => [
                styles.sticker,
                picked && styles.picked,
                pressed && styles.pressed,
              ]}
            >
              {picked ? <View pointerEvents="none" style={styles.selectionLine} /> : null}
              <Text variant="body1Reading" style={styles.label} color={color}>
                <Text variant="body1Reading" color={color}>
                  {label}
                </Text>
                {explanation ? ": " : null}
                {explanation ? (
                  <Text variant="body1Reading" color={color}>
                    {explanation}
                  </Text>
                ) : null}
              </Text>
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
