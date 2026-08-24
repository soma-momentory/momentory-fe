import { StyleSheet, View } from "react-native";

import { EmotionDot, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { emotionName } from "@/features/emotion/model/emotion";
import type { WeeklyMoodDay } from "@/features/report/model/weeklyReport";
import { koreanWeekday } from "@/lib/day";

/**
 * `W1` · **이번 주의 마음 일곱 칸** — 월요일부터 일요일까지 하루 한 점이다.
 *
 * **막대가 아니라 점**이다(`W1.md`) — 감정에 강도를 입력받지 않으므로 높이로
 * 말할 수 있는 것이 없다. 기록이 없는 날은 색 없이 잔잔한 중립 원으로 자리만
 * 지킨다(`EmotionDot` 의 `id={null}`) — 빈 칸을 강조하지 않는다.
 *
 * ## 하루 한 칸이다
 *
 * 예전 줄(`WeekEmotionRow`)은 하루 최대 세 점이었다. 서버는 그날 **일기의 현재
 * 감정 하나**를 준다(BE `DailyMood`) — 일기는 하루 한 벌이라 하루에 감정도 하나다.
 * 그래서 개수에 따라 지름을 줄이던 장치가 필요 없어졌고, 점은 시안의 26 하나다.
 *
 * ## ⚠ 감정 이름이 글자로 보이지 않는다
 *
 * 감정 원색은 배경 대비 1.46~3.31 이라 「이름을 늘 함께 쓴다」(`RULES.md` 「보관함」)가
 * 그 예외를 떠받친다. 이 줄은 시안대로 요일 글자만 두므로 **그 규칙에서 벗어난다** —
 * 대신 칸마다 낭독기가 읽을 이름을 붙이고, 바로 아래 요약 문장이 그 주에 가장 잦았던
 * 감정을 말로 적는다. 기록: `docs/PRODUCT.md` 「상류와 차이」.
 */
const DOT_SIZE = 26;

export function WeekMoodRow({ days }: { days: readonly WeeklyMoodDay[] }) {
  return (
    <View style={styles.row}>
      {days.map((d) => {
        const weekday = koreanWeekday(d.date);
        const name = emotionName(d.emotion);

        return (
          <View
            key={d.date}
            accessibilityLabel={`${weekday}요일 ${name.length > 0 ? name : "기록 없음"}`}
            style={styles.col}
          >
            <EmotionDot id={d.emotion} size={DOT_SIZE} />
            <Text
              variant="caption2"
              color={d.emotion == null ? labelColor.assistive : labelColor.neutral}
            >
              {weekday}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.xs, alignItems: "flex-start" },
  col: { flex: 1, minWidth: 0, alignItems: "center", gap: space.sm },
});
