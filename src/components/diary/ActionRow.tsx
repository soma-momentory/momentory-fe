import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { actionCard } from "@/design/tokens.mvp";

/**
 * `.acrow` — 행동 카드의 한 줄. **라벨 열 62 + 값**이라 두 줄의 값 시작점이
 * 같아야 표로 읽힌다. 일기 초안(`C6-b`)과 일기 상세(`A3`)가 같은 줄을 쓴다.
 *
 * 값 자리에 입력을 넣을 수도 있다 — 느낀 점(`A3-c`)이 `children` 으로 들어온다.
 */
export function ActionRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <AppText tone="caption" weight="500" style={styles.label}>
        {label}
      </AppText>
      {children ?? (
        <AppText tone="body" style={styles.value}>
          {value}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: actionCard.gap },
  label: {
    width: actionCard.labelWidth,
    fontSize: actionCard.labelSize,
    lineHeight: actionCard.labelSize * actionCard.lineHeight,
  },
  value: {
    flex: 1,
    fontSize: actionCard.valueSize,
    lineHeight: actionCard.valueSize * actionCard.lineHeight,
  },
});
