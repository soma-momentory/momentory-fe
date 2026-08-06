import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { directionChip } from "@/design/tokens.mvp";

/**
 * 대화 가운데에 남는 방향 칩 — `momentory.css` `.dirchip` · `.dirchipb`.
 *
 * ```css
 * .dirchip{align-self:center;min-height:32px;padding:0 12px;border-radius:999px;
 *          background:#F1E7D6;font:500 11.5px/32px;color:var(--textBody)}
 * .dirchipb{font-weight:600;color:var(--textAccent)}
 * ```
 *
 * **칩이 경계선 역할을 한다**(`C4-d.md`) — 어디서부터 방향을 정하고 이야기한
 * 것인지 나중에 다시 봐도 보인다. 그래서 좌우 말풍선과 달리 가운데 정렬이다.
 *
 * **칩에 쓰는 말은 사용자의 말이다** — 내부 분기명(`reframe`)은 저장만 하고
 * 화면에 쓰지 않는다.
 *
 * `[변경]` 은 같은 시트를 다시 연다. **그때까지의 대화는 지워지지 않는다** —
 * 방향을 바꾸는 일이 대화를 버리는 일이 되면 아무도 바꾸지 않는다.
 */
type Props = {
  label: string;
  onChange: () => void;
};

export function DirectionChip({ label, onChange }: Props) {
  return (
    <View style={styles.chip}>
      <AppText tone="body" weight="500" style={styles.label}>
        {label}
      </AppText>
      <AppText tone="body" style={styles.label}>
        ·
      </AppText>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onChange}>
        <AppText tone="accent" weight="600" style={styles.label}>
          변경
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: directionChip.gap,
    minHeight: directionChip.minHeight,
    paddingHorizontal: directionChip.paddingHorizontal,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.semantic.surfaceTone,
  },
  label: { fontSize: directionChip.fontSize, lineHeight: directionChip.minHeight },
});
