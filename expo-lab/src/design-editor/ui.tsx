/**
 * 편집 패널의 작은 부품. 색은 앱 DS 의 **승인값**에서 가져온다 — expo-lab 은 hex 를 적지 않는다
 * (패널은 셸 창에 있고, 셸은 시안을 적용하지 않으므로 늘 승인본 색이다).
 */
import { useEffect, useRef, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { isColor } from "./colorMath";
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

/**
 * 웹에서는 마우스를 올리면 뜨는 설명(`title`)을 단다. react-native-web 은 `title` 을 넘기지 않아서
 * DOM 노드에 직접 붙인다(웹 스크린 리더는 `title` 을 설명으로 읽는다). 네이티브는 `accessibilityHint`
 * 로 같은 문장을 듣는다 — react-native-web 은 그 prop 을 모르므로 웹에서는 넘기지 않는다.
 */
export function useWebTitle<T>(text: string | undefined) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = ref.current as unknown as HTMLElement | null;
    if (!node || typeof node.setAttribute !== "function") return;
    if (text) node.setAttribute("title", text);
    else node.removeAttribute("title");
  }, [text]);
  return ref;
}

const nativeHint = (text: string | undefined) => (Platform.OS === "web" ? undefined : text);

/** 설명 + 못 쓰는 이유 — 버튼이 꺼져 있으면 왜 꺼졌는지 함께 말한다 */
export const tooltipText = (hint?: string, disabled?: boolean, disabledReason?: string) =>
  disabled && disabledReason
    ? hint
      ? `${hint}
지금은 못 써요 — ${disabledReason}`
      : `지금은 못 써요 — ${disabledReason}`
    : hint;

export function PanelButton({
  label: text,
  sublabel,
  onPress,
  selected = false,
  disabled = false,
  tone = "default",
  hint,
  disabledReason,
  accessibilityLabel,
  testID,
  style,
}: {
  label: string;
  /** 이름 아래 작은 줄(탭의 「모든 화면」 같은 덧말) */
  sublabel?: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger";
  /** 이 버튼이 하는 일 한 문장 — 웹은 마우스를 올리면 보인다 */
  hint?: string;
  /** 꺼져 있을 때 그 이유 */
  disabledReason?: string;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const tooltip = tooltipText(hint, disabled, disabledReason);
  const ref = useWebTitle<View>(tooltip);
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (sublabel ? `${text} (${sublabel})` : text)}
      accessibilityHint={nativeHint(tooltip)}
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
        style,
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
      {sublabel ? (
        <Text style={[styles.buttonSub, selected && styles.buttonTextSelected]}>{sublabel}</Text>
      ) : null}
    </Pressable>
  );
}

/** 글자에 설명을 단다(배지 · 키 이름) */
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  const ref = useWebTitle<View>(text);
  return (
    <View ref={ref} accessibilityHint={nativeHint(text)}>
      {children}
    </View>
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

export const Swatch = ({ color, small = false }: { color: string; small?: boolean }) => (
  <View style={[styles.swatch, small && styles.swatchSmall, { backgroundColor: color }]} />
);

/** 값 하나를 보인다 — 색이면 견본과 함께 */
export function ValueChip({ value }: { value: string | number | null | undefined }) {
  const text = String(value ?? "—");
  return (
    <Row style={{ gap: 4, flexWrap: "nowrap", flexShrink: 1 }}>
      {typeof value === "string" && isColor(value) ? <Swatch color={value} small /> : null}
      <Text style={[styles.mono, { flexShrink: 1 }]} selectable>
        {text}
      </Text>
    </Row>
  );
}

/** 「A 지금 앱 ■ #111 → B 시안 ■ #222」 — 바꾼 값의 전후 */
export function BeforeAfter({
  approved,
  value,
}: {
  approved: string | number | null | undefined;
  value: string | number | null | undefined;
}) {
  return (
    <Row style={{ gap: 4 }}>
      <Text style={styles.hint}>A</Text>
      <ValueChip value={approved} />
      <Text style={styles.hint}>→ B</Text>
      <ValueChip value={value} />
    </Row>
  );
}

export const styles = StyleSheet.create({
  section: { gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderColor: palette.hairline },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  button: {
    maxWidth: "100%",
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
  buttonText: { color: palette.body, fontSize: 12, flexShrink: 1 },
  buttonSub: { color: palette.muted, fontSize: 10, lineHeight: 13 },
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
  swatchSmall: { width: 14, height: 14, borderRadius: 3 },
  hint: { color: palette.muted, fontSize: 11, lineHeight: 15 },
  /** 탭 · 칸 맨 위의 안내 한 줄 */
  note: {
    color: palette.body,
    fontSize: 11,
    lineHeight: 16,
    padding: 8,
    borderRadius: 6,
    backgroundColor: palette.sunken,
  },
  /** 거르개 줄 위의 작은 머리말 */
  groupHead: { color: palette.muted, fontSize: 10, fontWeight: "700", marginBottom: -4 },
  /** 사람 이름 아래 작게 보이는 코드 키 */
  keyText: { fontFamily: "monospace", fontSize: 10, color: palette.muted },
  card: {
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
  },
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
