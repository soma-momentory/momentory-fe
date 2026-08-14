import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";

/**
 * 설정 한 줄 — 마이(`M1`)의 그룹 리스트와 알림(`M3`)이 나눠 쓴다.
 *
 * **하나의 설정을 두 줄로 나누지 않는다**(`M3.md`) — 한 행이 이름과 값(시각 등)을
 * 함께 담고, 오른쪽에 `›` 나 스위치가 붙는다.
 *
 * **누를 곳이 없으면 `›` 를 두지 않는다**(`M3.md`) — 시각이 없는 알림이 그렇다.
 * 그래서 `onPress` 가 없으면 표식도 그리지 않는다.
 *
 * 새 디자인(`docs/design/prototype/마이.dc.html`) — 행 여백 15/16 · 이름 14px ·
 * 값 12px · 구분선 `line.soft`. 줄 높이가 50 이라 **히트 영역을 따로 깔지 않는다**
 * (`RULES.md` 「접근성」 — "이미 큰 부모가 탭을 받는" 자리).
 */
type Props = {
  label: string;
  /** 이름 아래가 아니라 **같은 줄 오른쪽**에 붙는다 */
  value?: string;
  onPress?: () => void;
  /** 스위치 등 — 있으면 `›` 대신 이것이 오른쪽에 온다 */
  trailing?: React.ReactNode;
  /**
   * 값을 **시간 칩**으로 그린다(`M3` 의 알림 시각 — 시안 마이의 타임칩).
   * `on` 은 그 알림이 켜져 있다는 뜻이고, 켜짐은 스위치 손잡이가 함께 말한다 —
   * 색만으로 표시하지 않는다(`RULES.md`).
   */
  chip?: "on" | "off";
};

export function SettingRow({ label, value, onPress, trailing, chip }: Props) {
  const body = (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>

      {value != null ? (
        <View style={chip == null ? null : [styles.chip, chip === "on" ? styles.chipOn : null]}>
          <AppText
            weight={chip === "on" ? "700" : "400"}
            style={[styles.value, chip === "on" ? styles.valueOn : null]}
          >
            {value}
          </AppText>
        </View>
      ) : null}

      {trailing ??
        (onPress != null ? (
          <AppText style={styles.chevron} accessibilityElementsHidden>
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

/** 줄 사이 — 카드 안에서만 쓴다 */
export function RowSeparator() {
  return <View style={styles.separator} />;
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  label: {
    flex: 1,
    minWidth: 0,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: paperColors.text.primary,
  },
  value: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    color: paperColors.text.green,
  },
  // 값 옆의 `›` 는 이름이 이미 말한 것을 되풀이한다 — 낭독기에서 뺀다
  chevron: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.fontSize,
    color: paperColors.text.faint,
  },

  chip: {
    borderRadius: paperRadius.field,
    backgroundColor: paperColors.bg.fieldAlt,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  // 흰 글자가 얹히므로 `brand.green` 이 아니라 `greenDark` 다 (paper.ts 대비 주석)
  chipOn: { backgroundColor: paperColors.brand.greenDark },
  valueOn: { color: paperColors.text.onFill },

  separator: { height: 1, backgroundColor: paperColors.line.soft },
});
