import { StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

import { Text } from "@/components/ds/Text";
import { fontRole, homeV2 } from "@/design/ds";
import { formatKoreanDateShort, koreanWeekday } from "@/lib/day";

/**
 * 홈 v2 머리의 **날짜 · 요일 종이 조각 두 장**(시안 `DateHeader`).
 *
 * 찢은 종이 모양은 다각형 하나이고 장식이다 — 글자만 읽힌다. 날짜와 요일은 옛 홈처럼 두 줄로
 * 나눠 쓰고(`lib/day.ts`), 서체는 교보손글씨.
 */
/** Keep the same 28pt overlap with the hero gap while both paper scraps grow with text. */
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
    <View style={[styles.wrap, { width: 220 + extraWidth, height: 72 + dateExtra + weekdayExtra }]}>
      <View style={[styles.date, { height: 44 + dateExtra }]}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 220 65"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <Polygon
            points="4,7 18,0 65,4 120,0 176,3 216,0 220,30 215,65 154,61 88,65 26,62 0,65 5,31"
            fill={homeV2.color.date}
          />
        </Svg>
        <Text style={styles.dateText} color={homeV2.color.ink}>
          {formatKoreanDateShort(today)}
        </Text>
      </View>
      <View style={[styles.weekday, { top: 36 + dateExtra, height: 27 + weekdayExtra }]}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 90 34"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <Polygon
            points="0,4 7,0 84,2 90,0 88,18 90,34 5,32 0,34 2,17"
            fill={homeV2.color.weekday}
          />
        </Svg>
        <Text style={styles.weekdayText} color={homeV2.color.ink}>
          {`${koreanWeekday(today)}요일`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 220, height: 72 },
  date: {
    minWidth: 180,
    height: 44,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    transform: [{ rotate: homeV2.tilt.date }],
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    fontFamily: fontRole.hand,
    ...homeV2.type.date,
    marginTop: -5,
  },
  weekday: {
    position: "absolute",
    left: 16,
    top: 36,
    minWidth: 65,
    height: 27,
    paddingHorizontal: 6,
    transform: [{ rotate: homeV2.tilt.weekday }],
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayText: { fontFamily: fontRole.hand, ...homeV2.type.weekday },
});
