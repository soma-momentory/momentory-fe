import { StyleSheet, View } from "react-native";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { NotchedTapeLabel } from "@/components/ds/NotchedTapeLabel";
import { Text } from "@/components/ds/Text";
import { homeV2 } from "@/design/ds";
import { formatKoreanDateShort, koreanWeekday } from "@/lib/day";

/**
 * 홈 v2 머리의 **날짜 · 요일 마스킹 테이프 두 장**.
 *
 * 양끝을 불규칙하게 뜯은 단색 테이프이고 장식이다 — 글자만 읽힌다. 날짜와 요일은 두 줄로
 * 나눠 쓰고(`lib/day.ts`), 서체는 교보손글씨(2026-11-01).
 */
/** Keep the same 28pt overlap with the hero gap while both tapes grow with text. */
export function datePaperExtraFor(fontScale: number) {
  const scale = fontScale;
  return (
    Math.max(0, homeV2.type.date.lineHeight * (scale - 1)) +
    Math.max(0, homeV2.type.weekday.lineHeight * (scale - 1))
  );
}

export function DatePaper({ today, fontScale = 1 }: { today: string; fontScale?: number }) {
  const extraWidth = Math.max(0, fontScale - 1) * 100;
  const dateExtra = Math.max(0, homeV2.type.date.lineHeight * (fontScale - 1));
  const weekdayExtra = Math.max(0, homeV2.type.weekday.lineHeight * (fontScale - 1));
  return (
    <View
      style={[
        styles.wrap,
        { width: PAPER.wrap + extraWidth, minHeight: 78 + dateExtra + weekdayExtra },
      ]}
    >
      <View
        testID="home-date-tape"
        style={[styles.date, { width: PAPER.date + extraWidth, minHeight: 50 + dateExtra }]}
      >
        <View pointerEvents="none" style={styles.dateTape}>
          <MaskingTape color={homeV2.color.date} />
        </View>
        <Text style={styles.dateText} color={homeV2.color.ink}>
          {formatKoreanDateShort(today)}
        </Text>
      </View>
      <NotchedTapeLabel
        testID="home-weekday-tape"
        fontScale={fontScale}
        style={[styles.weekday, { width: 65 * fontScale }]}
      >
        {`${koreanWeekday(today)}요일`}
      </NotchedTapeLabel>
    </View>
  );
}

/**
 * 날짜 종이 폭 — 220 · 200 이던 것을 조금 줄였다(2026-11-17). 그대로면 SE(375pt)에서 머리 줄 아이콘 셋(귤 · 음악 · 편지,
 * 44씩)과 약 11pt 겹쳤다(220 + 132 > 341). 아이콘을 오른쪽 끝에서 20 들이며(좌우 여백 22 · 20) 200 으로 맞췄다
 * (200 + 132 ≤ 333). 글씨 크기는 그대로고 종이 여백만 줄였다
 */
const PAPER = { wrap: 200, date: 180, padding: 14 } as const;

const styles = StyleSheet.create({
  wrap: { width: PAPER.wrap, minHeight: 78 },
  date: {
    minWidth: PAPER.date,
    minHeight: 50,
    maxWidth: "100%",
    paddingHorizontal: PAPER.padding,
    alignSelf: "flex-start",
    transform: [{ rotate: homeV2.tilt.date }],
    alignItems: "center",
    justifyContent: "center",
  },
  dateTape: { ...StyleSheet.absoluteFill, top: -4 },
  dateText: {
    fontFamily: homeV2.font.bold,
    ...homeV2.type.date,
    marginTop: -5,
  },
  weekday: {
    alignSelf: "flex-start",
    marginLeft: 16,
    marginTop: -8,
    transform: [{ rotate: homeV2.tilt.weekday }],
    alignItems: "center",
    justifyContent: "center",
  },
});
