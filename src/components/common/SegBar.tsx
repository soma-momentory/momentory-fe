import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperRadius, paperShadows } from "@/design/paper";
import theme from "@/design/theme";
import { segBar } from "@/design/tokens.mvp";

/**
 * 두 칸 세그먼트 — `momentory.css` `.seg` · `.sg` · `.sgOn`.
 *
 * ```css
 * .seg{gap:4px;padding:4px;background:#E6DCC9;border-radius:999px}
 * .sg{flex:1;min-height:36px;border-radius:999px;font:600 13px/36px}
 * .sgOn{background:#FBF6EC;color:var(--textStrong);box-shadow:0 2px 8px rgba(36,31,25,.08)}
 * ```
 *
 * 일기의 **두 면**을 오간다 — 「내가 남긴 오늘」과 「바바가 함께 본 오늘」
 * (`C6`·`C6-b` · `A3`·`A3-b`). **두 면을 한 화면에 섞지 않는다**(`RULES.md`).
 *
 * **면을 바꾸는 것이지 편집 모드를 바꾸는 것이 아니다**(`C6.md`) — 세그먼트를
 * 옮겨도 저장되지 않고, 저장은 `C6-b` 의 버튼 한 번이다.
 *
 * **선택을 색만으로 표시하지 않는다** — 켜진 칸은 면 색이 밝아지고 그림자로
 * 떠오르며 글자색도 진해진다.
 */
type Props = {
  items: readonly [string, string];
  activeIndex: 0 | 1;
  onChange: (index: 0 | 1) => void;
  /**
   * 새 디자인 — 종이 트랙 위에 **밝은 썸이 미끄러지는** 모양
   * (`일기.dc.html` · `보관함.dc.html`). 리스킨된 화면만 opt-in 한다.
   */
  variant?: "default" | "paper";
};

export function SegBar({ items, activeIndex, onChange, variant = "default" }: Props) {
  const paper = variant === "paper";

  return (
    <View style={[styles.track, paper ? styles.trackPaper : null]}>
      {items.map((label, i) => {
        const on = i === activeIndex;
        return (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(i as 0 | 1)}
            style={[
              styles.item,
              on ? styles.itemOn : null,
              paper ? (on ? styles.itemOnPaper : styles.itemOffPaper) : null,
            ]}
          >
            <AppText
              tone={on ? "strong" : "body"}
              weight={paper && on ? "700" : "600"}
              style={[styles.label, paper ? styles.labelPaper : null]}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: segBar.gap,
    padding: segBar.padding,
    backgroundColor: segBar.track,
    borderRadius: theme.radius.pill,
  },
  item: {
    flex: 1,
    minHeight: segBar.item.minHeight,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  itemOn: {
    backgroundColor: theme.colors.semantic.surface,
    ...theme.shadows.sm,
  },
  label: { fontSize: segBar.item.fontSize, lineHeight: segBar.item.minHeight },

  // ── 새 디자인 ────────────────────────────────────────────────────────
  trackPaper: { backgroundColor: "rgba(237,230,210,0.6)", borderRadius: paperRadius.sheet },
  itemOnPaper: {
    backgroundColor: paperColors.bg.cardSoft,
    borderRadius: paperRadius.sheet - 4,
    ...paperShadows.flat,
  },
  itemOffPaper: { backgroundColor: "transparent" },
  labelPaper: { color: paperColors.text.primary },
});
