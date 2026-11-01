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
      style={[styles.wrap, { width: 220 + extraWidth, minHeight: 78 + dateExtra + weekdayExtra }]}
    >
      <View
        testID="home-date-tape"
        style={[styles.date, { width: 200 + extraWidth, minHeight: 50 + dateExtra }]}
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

const styles = StyleSheet.create({
  wrap: { width: 220, minHeight: 78 },
  date: {
    minWidth: 200,
    minHeight: 50,
    maxWidth: "100%",
    paddingHorizontal: 18,
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
