import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { RetroButton } from "@/components/chat/RetroButton";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperRadius, paperShadows, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
import type { ReplyMeasure } from "@/features/retro/data/retroApi";

/**
 * 측정 턴의 입력 — 서버가 준 슬라이더(들)를 **0~max 눈금**으로 그린다.
 *
 * 네이티브 슬라이더 의존성 없이 **탭 가능한 눈금**으로 만든다: 각 칸을 눌러 값을
 * 정하고, 고른 값까지 면이 찬다. 드래그 대신 탭이라 손도 테스트도 확실하다.
 *
 * **숫자를 앞세우지 않는다**(`RULES.md`) — 눈금은 「약하다 ↔ 강하다」의 위치일
 * 뿐, 점수판이 아니다. 그래서 큰 숫자 대신 양 끝 라벨만 둔다.
 *
 * **전부 고르기 전에는 CTA 가 잠긴다** — 서버가 빈 값을 되물으므로(재요청),
 * 여기서 미리 채워 보내지 않고 사용자가 각 눈금을 한 번씩 정하게 한다.
 */
type Props = {
  measures: ReplyMeasure[];
  onSubmit: (values: Record<string, number>) => void;
  /** 요청 중 — 다시 누르지 못하게 */
  disabled?: boolean;
  /**
   * 새 디자인 — 대화 위에 **떠 있는 카드**(`회고.dc.html` 의 슬라이더 카드).
   * 채운 눈금은 `brand.green`, 고른 칸은 `greenDark` 다. 회고 화면만 켠다.
   */
  variant?: "default" | "paper";
};

export function MeasureInput({ measures, onSubmit, disabled = false, variant = "default" }: Props) {
  const [values, setValues] = useState<Record<string, number>>({});
  const paper = variant === "paper";
  const allAnswered = measures.every((m) => values[m.id] != null);

  return (
    <View style={[styles.root, paper ? styles.rootPaper : null]}>
      {measures.map((measure) => {
        const current = values[measure.id];
        // 0..max 까지 (max 포함) 칸을 만든다
        const ticks = Array.from(
          { length: measure.max - measure.min + 1 },
          (_, i) => measure.min + i,
        );
        return (
          <View key={measure.id} style={styles.block}>
            <AppText
              tone="body"
              weight={paper ? "700" : "500"}
              style={[styles.label, paper ? styles.labelPaper : null]}
            >
              {measure.label}
            </AppText>
            <View
              style={styles.track}
              accessibilityRole="adjustable"
              accessibilityLabel={measure.label}
              accessibilityValue={
                current == null ? undefined : { now: current, min: measure.min, max: measure.max }
              }
            >
              {ticks.map((tick) => {
                const filled = current != null && tick <= current;
                const isCurrent = current === tick;
                return (
                  <Pressable
                    key={tick}
                    accessibilityRole="button"
                    accessibilityLabel={`${measure.label} ${tick}`}
                    hitSlop={6}
                    style={styles.tickHit}
                    onPress={() => setValues((prev) => ({ ...prev, [measure.id]: tick }))}
                  >
                    <View
                      style={[
                        styles.tick,
                        paper ? styles.tickPaper : null,
                        filled ? (paper ? styles.tickFilledPaper : styles.tickFilled) : null,
                        isCurrent ? (paper ? styles.tickCurrentPaper : styles.tickCurrent) : null,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.ends}>
              <AppText variant="caption" tone="caption" style={paper ? styles.endPaper : null}>
                약하다
              </AppText>
              <AppText variant="caption" tone="caption" style={paper ? styles.endPaper : null}>
                강하다
              </AppText>
            </View>
          </View>
        );
      })}

      {paper ? (
        // 시안의 확인 버튼은 **테두리 알약**이다 — 카드 안에서 면을 하나 더 얹지 않는다
        <RetroButton
          tone="outline"
          label="이어가기"
          disabled={disabled || !allAnswered}
          onPress={() => onSubmit(values)}
        />
      ) : (
        <AppButton
          label="이어가기"
          disabled={disabled || !allAnswered}
          onPress={() => onSubmit(values)}
        />
      )}
    </View>
  );
}

const { semantic } = theme.colors;
const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  root: { gap: 16 },
  block: { gap: 8 },
  label: { fontSize: 14, lineHeight: 21 },
  track: { flexDirection: "row", alignItems: "center", gap: 5 },
  // 각 칸은 넓은 히트 영역 + 가운데 눈금 — 탭이 빗나가지 않게
  tickHit: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 32 },
  tick: {
    alignSelf: "stretch",
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: semantic.surfaceTone,
  },
  tickFilled: { backgroundColor: semantic.accentWash },
  tickCurrent: { backgroundColor: semantic.accentFill },
  ends: { flexDirection: "row", justifyContent: "space-between" },

  // ── 새 디자인 — 대화 위에 뜬 카드 ───────────────────────────────────
  rootPaper: {
    gap: 11,
    padding: 18,
    borderRadius: paperRadius.cardLg,
    backgroundColor: paperColors.bg.cardOpaque,
    ...paperShadows.raised,
  },
  labelPaper: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: paperColors.text.primary,
  },
  tickPaper: { height: 5, backgroundColor: paperColors.line.soft },
  tickFilledPaper: { backgroundColor: paperColors.brand.green },
  tickCurrentPaper: { backgroundColor: paperColors.brand.greenDark },
  endPaper: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.faint,
  },
});
