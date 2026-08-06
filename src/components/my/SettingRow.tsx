import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { my } from "@/design/tokens.mvp";

/**
 * 설정 한 줄 — `momentory.css` `.mrow` · `.mrk` · `.mv`.
 *
 * **하나의 설정을 두 줄로 나누지 않는다**(`M3.md`) — 한 행이 이름과 값(시각 등)을
 * 함께 담고, 오른쪽에 `›` 나 스위치가 붙는다.
 *
 * **누를 곳이 없으면 `›` 를 두지 않는다**(`M3.md`) — 시각이 없는 알림이 그렇다.
 * 그래서 `onPress` 가 없으면 표식도 그리지 않는다.
 *
 * 줄 높이가 52 라 **히트 영역을 따로 깔지 않는다**(`RULES.md` 「접근성」 —
 * "이미 큰 부모가 탭을 받는" 자리).
 */
type Props = {
  label: string;
  /** 이름 아래가 아니라 **같은 줄 오른쪽**에 붙는다 */
  value?: string;
  onPress?: () => void;
  /** 스위치 등 — 있으면 `›` 대신 이것이 오른쪽에 온다 */
  trailing?: React.ReactNode;
  /** 되돌릴 수 없는 동작(회원 탈퇴) — 글자만 dangerInk */
  danger?: boolean;
};

export function SettingRow({ label, value, onPress, trailing, danger = false }: Props) {
  const body = (
    <View style={styles.row}>
      <AppText
        tone={danger ? undefined : "strong"}
        weight="500"
        style={[styles.label, danger ? styles.danger : null]}
      >
        {label}
      </AppText>

      {value != null ? (
        <AppText tone="caption" style={styles.value}>
          {value}
        </AppText>
      ) : null}

      {trailing ?? (onPress != null ? (
        <AppText tone="caption" style={styles.chevron}>
          ›
        </AppText>
      ) : null)}
    </View>
  );

  if (onPress == null) return body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  );
}

/** `.sep` — 줄 사이. 카드 안에서만 쓴다 */
export function RowSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: my.row.gap,
    minHeight: my.row.minHeight,
  },
  label: { flex: 1, fontSize: my.row.keySize, lineHeight: my.row.keySize * 1.4 },
  danger: { color: theme.colors.semantic.textDanger },
  value: { fontSize: my.row.valueSize, lineHeight: my.row.valueSize * 1.4 },
  chevron: { fontSize: 15, lineHeight: 18 },
  separator: { height: 1, backgroundColor: my.separator },
});
