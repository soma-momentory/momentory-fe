import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { EmotionDot, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { emotionName } from "@/features/emotion/model/emotion";
import type { WeeklyMoodDay } from "@/features/report/model/weeklyReport";
import { koreanWeekday } from "@/lib/day";

/**
 * `W1` · **이번 주의 마음 일곱 칸** — 일요일부터 토요일까지 하루 한 점이다.
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
 * ## 감정 이름은 **눌러서** 글자로 확인한다
 *
 * 감정 원색은 배경 대비 1.46~3.31 이라 「이름을 늘 함께 쓴다」(`RULES.md` 「보관함」)가
 * 그 예외를 떠받친다. 이 줄은 시안대로 요일 글자만 두므로, 낭독기가 읽을 이름은 칸마다
 * 붙이고 그 주 최다 감정은 아래 요약 문장이 말로 적는다. **그 위에**, 요청(2026-08-25)으로
 * 한 칸을 누르면 그날 감정을 글자로 드러낸다 — 색만으로 갈리던 하루하루를 눌러 확인할 수 있다.
 * 선택은 색만이 아니라 **링 굵기(1.5→2.5)와 드러난 글자**로 함께 말한다(색만 금지 규칙 유지).
 * 기록: `docs/PRODUCT.md` 「상류와 차이」.
 */
const DOT_SIZE = 26;

export function WeekMoodRow({ days }: { days: readonly WeeklyMoodDay[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const picked = days.find((d) => d.date === selected) ?? null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {days.map((d) => {
          const weekday = koreanWeekday(d.date);
          const name = emotionName(d.emotion);
          const isSelected = d.date === selected;

          return (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              // ⚠ 라벨 문안은 그대로 둔다 — 리포트 테스트가 「일요일 피곤함」 식으로 이걸 찾는다
              accessibilityLabel={`${weekday}요일 ${name.length > 0 ? name : "기록 없음"}`}
              // 같은 칸을 다시 누르면 접는다 — 켜고 끄는 자리다
              onPress={() => setSelected(isSelected ? null : d.date)}
              style={styles.col}
            >
              <EmotionDot
                id={d.emotion}
                size={DOT_SIZE}
                style={isSelected ? styles.dotSelected : undefined}
              />
              <Text
                variant="caption2"
                color={
                  isSelected
                    ? labelColor.strong
                    : d.emotion == null
                      ? labelColor.assistive
                      : labelColor.neutral
                }
              >
                {weekday}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 누른 날의 감정을 글자로 — 색만으로 안 보이던 그날 마음을 확인한다.
          기록이 없는 날이면 「기록 없음」으로 솔직히 말한다 */}
      {picked != null ? (
        <Text variant="label2" color={labelColor.neutral} style={styles.reveal}>
          {`${koreanWeekday(picked.date)}요일 · ${
            emotionName(picked.emotion).length > 0 ? emotionName(picked.emotion) : "기록 없음"
          }`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  row: { flexDirection: "row", gap: space.xs, alignItems: "flex-start" },
  col: { flex: 1, minWidth: 0, alignItems: "center", gap: space.sm },
  // 선택 표시 — 링을 굵혀(1.5→2.5) 색이 아닌 두께로 「고른 칸」을 말한다(색만 금지)
  dotSelected: { borderWidth: 2.5, borderColor: labelColor.strong },
  // 누른 날의 감정 한 줄 — 점 줄과 요약 문장 사이에서 가운데로 선다
  reveal: { alignSelf: "center" },
});
