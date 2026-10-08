import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, space, treasureBoxSize } from "@/design/ds";
import type { Treasure } from "@/features/rest/data/treasureApi";
import type { TreasureMarkName } from "@/features/rest/model/treasureBox";
import { toHHMM } from "@/lib/time";

import { TreasureMark } from "./TreasureMark";

/**
 * 보물 한 줄 — 표식 · 쓴 그대로의 문장 · 담은 시각(24시간 · `17:20`). 표식은 이렇게 **기록을 볼 때만**
 * 붙는다 — 담는 연출의 카드에는 없다(2026-10-08 · 사용자 피드백). 「오늘의 보물」과 「지난 보물」이 함께 쓴다.
 * 평가 · 개수 · 연속을 붙이지 않는다 — 남긴 것을 그대로 다시 보여 줄 뿐이다.
 */
export function TreasureRow({ treasure, mark }: { treasure: Treasure; mark: TreasureMarkName }) {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        <TreasureMark name={mark} size={treasureBoxSize.mark} />
      </View>
      <Text variant="body1" color={labelColor.strong} style={styles.content}>
        {treasure.content}
      </Text>
      <Text variant="caption1" color={labelColor.alternative}>
        {/* 24시간 숫자로 — 「낮 5:20」보다 「17:20」이 기록으로 또렷하다(2026-10-08 · 사용자 요청) */}
        {toHHMM(new Date(treasure.createdAt))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  // 표식은 첫 줄(행간 24)의 가운데에 앉는다 — 문장이 두 줄로 접혀도 위에 남는다
  mark: { paddingTop: (24 - treasureBoxSize.mark) / 2 },
  content: { flex: 1 },
});
