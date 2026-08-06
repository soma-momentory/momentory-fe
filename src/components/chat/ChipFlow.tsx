import { Pressable, StyleSheet, View, type ViewProps } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { chat, chatColor } from "@/design/tokens.mvp";

/**
 * 선택지 칩 묶음. `momentory.css` `.chips` · `.chip` · `.chipOn`.
 *
 * ```css
 * .chips{display:flex;flex-wrap:wrap;gap:8px}
 * .chip{min-height:44px;padding:0 16px;border:1px solid rgba(36,31,25,.14);
 *       border-radius:999px;background:#FBF6EC;font:500 14px/1;color:var(--textBody)}
 * .chipOn{border-color:#C2703D;border-width:2px;background:#F1E7D6;
 *         color:var(--textStrong);font-weight:600}
 * ```
 *
 * **선택을 색만으로 표시하지 않는다** — 테두리 굵기 1→**2px**, 글자 굵기 500→**600**,
 * 면 색까지 함께 바뀐다(`RULES.md` 「선택 상태」). 색각 이상에서도 굵기로 읽힌다.
 *
 * ⚠ 칩 높이는 **44** 다. `COMPONENTS.md` 의 "행 높이 52" 는 `.opt`(선택지 행)이고
 * 칩과 다른 컴포넌트다.
 *
 * 테두리가 1→2px 로 굵어지면 안쪽 너비가 줄어 글자가 밀린다. 그래서 선택 시
 * 좌우 padding 을 1px 씩 덜어 **칩 크기가 그대로 유지**되게 한다 — 고르는 순간
 * 목록 전체가 다시 배치되면 어디를 골랐는지 놓친다.
 */
export type Chip = { id: string; label: string };

type Props = Omit<ViewProps, "children"> & {
  items: readonly Chip[];
  /** 선택된 id 들. 단일 선택이면 길이 1 로 넘긴다 */
  selected: readonly string[];
  onToggle: (id: string) => void;
};

export function ChipFlow({ items, selected, onToggle, style, ...rest }: Props) {
  return (
    <View {...rest} style={[styles.flow, style]}>
      {items.map((item) => {
        const on = selected.includes(item.id);
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onToggle(item.id)}
            style={[styles.chip, on ? styles.chipOn : null]}
          >
            <AppText
              variant="body"
              tone={on ? "strong" : "body"}
              weight={on ? "600" : "500"}
              style={styles.label}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  flow: { flexDirection: "row", flexWrap: "wrap", gap: chat.chip.gap },
  chip: {
    minHeight: chat.chip.minHeight,
    paddingHorizontal: chat.chip.paddingHorizontal,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: chatColor.chipBorder,
    backgroundColor: semantic.surface,
    justifyContent: "center",
  },
  chipOn: {
    borderWidth: 2,
    borderColor: semantic.accent, // primary — 장식 전용이라 테두리가 제 자리다
    backgroundColor: semantic.surfaceTone,
    // 테두리가 1px 두꺼워진 만큼 덜어 칩 크기를 고정한다
    paddingHorizontal: chat.chip.paddingHorizontal - 1,
  },
  // css 14px/1 — 줄간격 1 이라 프리셋(body 22)을 쓰면 칩이 세로로 늘어난다
  label: { fontSize: 14, lineHeight: 14 },
});
