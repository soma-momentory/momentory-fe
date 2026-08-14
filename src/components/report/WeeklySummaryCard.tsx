import { Image, StyleSheet, View } from "react-native";

import { SectionLabel } from "@/components/common/SectionLabel";
import { CHARACTERS } from "@/components/icons/characters";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";

/**
 * `W1` · 한 주 요약 — **문구를 기간에 매지 않는다**("이번 주 …"가 아니다).
 * 요약 문장은 서버가 그 주 대화를 읽고 쓰는 값이고, 근거 수치(회고·감정 수)는
 * 데이터에서 센 값이다 — 문장이 수치와 함께 있어야 지어낸 말이 아니게 된다.
 *
 * 새 디자인에서는 **언덕 위의 코멘트 카드**다(`리포트.dc.html`) — 카피바라
 * 썸네일이 왼쪽에 서고 오른쪽에 그 주를 읽은 문장이 온다. 말하는 이가 보이는
 * 자리라 「바바가 정리했어요」 한 줄이 썸네일과 짝을 이룬다.
 */
export function WeeklySummaryCard({
  summary,
  retroCount,
  emotionCount,
}: {
  summary: string;
  retroCount: number;
  emotionCount: number;
}) {
  return (
    <Card variant="paperSoft" style={styles.card}>
      {/* 썸네일은 장식이다 — 낭독기가 읽을 것이 없다 */}
      <View
        style={styles.thumb}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Image source={CHARACTERS.capybaraAlt} resizeMode="contain" style={styles.character} />
      </View>

      <View style={styles.copy}>
        <SectionLabel variant="paper">한 주 요약</SectionLabel>
        <AppText style={styles.summary}>{summary}</AppText>
        <AppText style={styles.caption}>
          {`회고 ${retroCount}회 · 감정 기록 ${emotionCount}개를 바탕으로 바바가 정리했어요`}
        </AppText>
      </View>
    </Card>
  );
}

const { styles: type } = paperTypography;
// 시안의 썸네일은 58 칸에 52 폭 그림을 **아래로 붙여** 넣는다 — 위가 잘리며 얼굴만 남는다
const THUMB = 58;
const CHARACTER = { width: 52, ratio: 988 / 755 };

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: paperRadius.field,
    backgroundColor: paperColors.bg.flat,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  character: { width: CHARACTER.width, height: CHARACTER.width * CHARACTER.ratio },

  copy: { flex: 1, minWidth: 0, gap: 6 },
  summary: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: paperColors.text.primary,
  },
  caption: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.green,
  },
});
