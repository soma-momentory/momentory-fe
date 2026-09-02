import { StyleSheet, View } from "react-native";

import { Card, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import type { RestContent } from "@/features/rest/model/contents";

/**
 * 쉼 콘텐츠 2×2 격자 — `R1` 쉼터 진입의 행동카드 **아래**.
 *
 * ## 두 줄 × 두 칸으로 자른다
 *
 * `flexWrap` 격자는 칸 폭이 기기 픽셀로 반올림되면 마지막 칸이 다음 줄로 밀린다
 * (`ds/columnWidth.ts` 머리말). 항목이 **넷으로 고정**이라 잴 필요 없이 두 칸씩
 * 행으로 묶고 `flex: 1` 로 나눈다 — 행 안의 두 카드는 같은 높이로 늘어난다.
 *
 * ## 아직 눌리지 않는다
 *
 * 각 콘텐츠의 화면이 아직 없다. **눌리는데 아무 일도 없는 줄을 만들지 않는다**
 * (`CLAUDE.md` · `TASKS.md` 「마이의 편집 경로」)라 `Pressable` 을 두지 않는다 —
 * 화면이 생기면 `onPress` 를 받아 카드를 통째로 진입점으로 바꾼다(행동카드와 같은 규칙).
 *
 * ## 아이콘이 없다
 *
 * Wanted 세트 26개에 연못·상자·보물함·몸에 맞는 글리프가 없고 **없는 글리프를
 * 만들지 않는다**(`CLAUDE.md`). 제목과 설명만으로 칸을 채운다.
 */
type Props = {
  items: readonly RestContent[];
};

export function RestContentGrid({ items }: Props) {
  const rows: RestContent[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((item) => (
            <Card key={item.id} style={styles.tile}>
              <Text variant="label1" color={labelColor.strong}>
                {item.title}
              </Text>
              <Text variant="caption1" color={labelColor.neutral}>
                {item.description}
              </Text>
            </Card>
          ))}
          {/* 홀수 개가 오면 빈 칸으로 폭을 지킨다 — 마지막 칸이 혼자 넓어지지 않게 */}
          {row.length === 1 ? <View style={styles.tile} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.md },
  row: { flexDirection: "row", gap: space.md },
  tile: { flex: 1, gap: space.xs },
});
