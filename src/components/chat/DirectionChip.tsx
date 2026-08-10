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
 * **칩에 쓰는 말은 사용자의 말이다** — 서버 선택지의 라벨을 그대로 옮긴다.
 *
 * `onChange` 를 주면 `[변경]` 이 붙어 같은 시트를 다시 연다. 서버가 이미 다음
 * 단계로 넘어간 뒤에는 방향을 되돌릴 수 없으므로(상태 기계가 앞으로만 간다)
 * **회고 대화에서는 주지 않는다** — 칩은 「여기서부터 이 방향」이라는 경계 표시로만 남는다.
 */
type Props = {
  label: string;
  onChange?: () => void;
};

export function DirectionChip({ label, onChange }: Props) {
  return (
    <View style={styles.chip}>
      <AppText tone="body" weight="500" style={styles.label}>
        {label}
      </AppText>
      {onChange != null ? (
        <>
          <AppText tone="body" style={styles.label}>
            ·
          </AppText>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onChange}>
            <AppText tone="accent" weight="600" style={styles.label}>
              변경
            </AppText>
          </Pressable>
        </>
      ) : null}
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
