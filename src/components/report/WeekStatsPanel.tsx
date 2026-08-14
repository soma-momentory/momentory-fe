import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperReport, paperTypography } from "@/design/paper";

/**
 * `W1` · 초록 통계 패널 — 언덕 아래 화면 바닥을 채우는 면(`리포트.dc.html`).
 *
 * **면은 `paperReport.panel`(= `brand.greenDark`) 이다.** 시안의 `#8FA28A` 위에
 * 흰 글자는 2.7 로 AA 미달이라 글자가 얹히는 초록 면은 한 단계 어둡다
 * (`paper.ts` 대비 보정 · `PLAN.md` Phase 1).
 *
 * 라벨과 값의 위계도 **투명도가 아니라 굵기**로 만든다 — 시안의
 * `rgba(255,255,255,.72)` 라벨은 이 면에서 3.2 로 미달한다.
 *
 * 세는 것은 **관찰이지 평가가 아니다**(`W1.md`) — 점수·등급·실행률·연속을
 * 만들지 않는다. 비교는 **기준을 밝힌 한 줄**(「이전 주 3회」)로만 붙는다.
 */
export type StatRow = {
  label: string;
  value: string;
  /** 비교·근거 한 줄. 기준을 밝힐 수 없으면 비운다 */
  note?: string;
};

export function WeekStatsPanel({
  rows,
  linkLabel,
  onLinkPress,
}: {
  rows: readonly StatRow[];
  linkLabel: string;
  onLinkPress: () => void;
}) {
  return (
    <View style={styles.panel}>
      {rows.map((row, i) => (
        <View key={row.label} style={[styles.row, i < rows.length - 1 ? styles.divided : null]}>
          <AppText style={styles.label}>{row.label}</AppText>
          <View style={styles.values}>
            <AppText weight="700" numberOfLines={1} style={styles.value}>
              {row.value}
            </AppText>
            {row.note != null && row.note.length > 0 ? (
              <AppText numberOfLines={2} style={styles.note}>
                {row.note}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={linkLabel}
        hitSlop={10}
        style={styles.link}
        onPress={onLinkPress}
      >
        <AppText style={styles.linkLabel}>{linkLabel}</AppText>
      </Pressable>
    </View>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  panel: {
    flexGrow: 1,
    backgroundColor: paperReport.panel,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingBottom: 9 },
  divided: { borderBottomWidth: 1, borderBottomColor: paperReport.divider },
  label: {
    flex: 1,
    minWidth: 0,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: paperColors.text.onFill,
  },
  values: { flexShrink: 1, alignItems: "flex-end", gap: 2 },
  value: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: paperColors.text.onFill,
  },
  note: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    textAlign: "right",
    color: paperColors.text.onFill,
  },

  // 목록 맨 아래 — 시안은 남는 자리를 밀어내고 바닥에 붙인다.
  // 밑줄은 Text 가 아니라 감싼 View 가 긋는다 (Android 의 Text 테두리는 잘린다)
  link: {
    marginTop: "auto",
    alignSelf: "flex-start",
    paddingTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: paperReport.divider,
  },
  linkLabel: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    color: paperColors.text.onFill,
  },
});
