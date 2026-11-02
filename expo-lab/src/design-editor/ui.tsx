/**
 * 편집 패널의 작은 부품. 색은 앱 DS 의 **승인값**에서 가져온다 — expo-lab 은 hex 를 적지 않는다
 * (패널은 셸 창에 있고, 셸은 시안을 적용하지 않으므로 늘 승인본 색이다).
 */
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import {
  background,
  interaction,
  label,
  line,
  primary,
  status,
} from "../../../src/design/ds/color";

export const palette = {
  panel: background.elevated,
  sunken: background.normal,
  ink: label.strong,
  body: label.normal,
  muted: label.alternative,
  line: line.normal,
  hairline: line.alternative,
  accent: primary.heavy,
  accentSoft: interaction.disabled,
  onAccent: label.onFill,
  danger: status.negative,
  ok: primary.heavy,
  outline: primary.normal,
} as const;

export function PanelButton({
  label: text,
  onPress,
  selected = false,
  disabled = false,
  tone = "default",
  accessibilityLabel,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger";
  accessibilityLabel?: string;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        tone === "primary" && styles.buttonPrimary,
        tone === "danger" && styles.buttonDanger,
        selected && styles.buttonSelected,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          tone === "primary" && styles.buttonTextOnFill,
          tone === "danger" && styles.buttonTextDanger,
          selected && styles.buttonTextSelected,
        ]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

export function Section({
  title,
  right,
  children,
  testID,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.section} testID={testID}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export const Row = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.row, style]}>{children}</View>
);

export const Swatch = ({ color }: { color: string }) => (
  <View style={[styles.swatch, { backgroundColor: color }]} />
);

export const styles = StyleSheet.create({
  section: { gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderColor: palette.hairline },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  button: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
  },
  buttonPrimary: { backgroundColor: palette.accent, borderColor: palette.accent },
  buttonDanger: { borderColor: palette.danger },
  // 선택은 색만으로 말하지 않는다 — 테두리 2px + 굵은 글씨
  buttonSelected: {
    borderWidth: 2,
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  buttonText: { color: palette.body, fontSize: 12 },
  buttonTextOnFill: { color: palette.onAccent, fontWeight: "700" },
  buttonTextDanger: { color: palette.danger },
  buttonTextSelected: { fontWeight: "700", color: palette.ink },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  input: {
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    color: palette.ink,
    fontSize: 12,
  },
  inputInvalid: { borderColor: palette.danger, borderWidth: 2 },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: palette.line,
  },
  hint: { color: palette.muted, fontSize: 11, lineHeight: 15 },
  error: { color: palette.danger, fontSize: 11 },
  mono: { fontFamily: "monospace", fontSize: 11, color: palette.muted },
  label: { color: palette.body, fontSize: 12, fontWeight: "600" },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: palette.sunken,
    color: palette.muted,
    fontSize: 10,
    overflow: "hidden",
  },
});
