import { StyleSheet, View } from "react-native";

import { EmotionDot, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";

/**
 * 일기의 감정 줄 — **도트 + 이름**을 감정 수만큼 세운다.
 *
 * ⚠ **감정을 하나로 줄이지 않는다.** 「우울했는데 라면 먹고 기분 좋아졌어」 같은 하루는 감정이
 * 둘이고, 앞의 하나만 세우면 마음이 바뀐 흐름에서 뒤쪽이 통째로 사라진다. 실제로 회고 직후
 * 화면이 `emotions[0]` 만 그려서 그렇게 보였다(2026-09-05).
 *
 * ⚠ **색만으로 판단하게 하지 않는다** — 감정 원색은 대비가 낮아 도트 옆에는 늘 이름이 붙는다.
 *
 * <p>회고 직후 일기 확인(`C6`)과 일기 상세(`A3`)가 이 하나를 나눠 쓴다. 값을 각자 들고 있던
 * 동안 사이 간격과 글자색이 갈렸다 — 같아야 하는 줄은 한 곳에서만 정한다. `align` 만 다르다
 * (상세는 날짜 제목 오른쪽이라 오른쪽으로 접힌다).
 */
export function DiaryEmotionRow({
  emotions,
  align = "flex-start",
}: {
  emotions: readonly EmotionId[];
  align?: "flex-start" | "flex-end";
}) {
  if (emotions.length === 0) return null;

  return (
    <View style={[styles.row, { justifyContent: align }]}>
      {emotions.map((e, i) => (
        <View key={`${e}-${i}`} style={styles.item}>
          <EmotionDot id={e} />
          <Text variant="caption1" color={labelColor.alternative}>
            {emotionName(e)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 감정 사이(md 12)를 도트↔이름(xs 4)보다 넉넉히 벌린다 — 좁으면 두 감정이 한 덩어리로 읽힌다
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.md },
  item: { flexDirection: "row", alignItems: "center", gap: space.xs },
});
