import { Pressable, StyleSheet, View } from "react-native";

import { Card, Icon, Text } from "@/components/ds";
import { label as labelColor, primary, space } from "@/design/ds";
import type { RestContent } from "@/features/rest/model/contents";

/**
 * 쉼 콘텐츠 2×2 격자 — `R1` 쉼터 진입의 바람카드 **아래**.
 *
 * ## 두 줄 × 두 칸으로 자른다
 *
 * `flexWrap` 격자는 칸 폭이 기기 픽셀로 반올림되면 마지막 칸이 다음 줄로 밀린다
 * (`ds/columnWidth.ts` 머리말). 항목이 **넷으로 고정**이라 잴 필요 없이 두 칸씩
 * 행으로 묶고 `flex: 1` 로 나눈다 — 행 안의 두 카드는 같은 높이로 늘어난다.
 *
 * ## 화면이 있는 것만 눌린다
 *
 * **눌리는데 아무 일도 없는 줄을 만들지 않는다**(`CLAUDE.md` · `TASKS.md` 「마이의
 * 편집 경로」). `route` 를 든 콘텐츠만 카드 전체가 진입점이 되고(바람카드와 같은
 * 규칙 · `onOpen`), 나머지는 `Pressable` 없이 그대로 놓인다 — 감각연못이 첫 번째다
 * (2026-09-03).
 *
 * ## 우상단에 작은 아이콘 하나
 *
 * 글자만 있으면 기능 메뉴처럼 읽힌다 — 쉼터는 **공간**이라 칸마다 시각 포인트를
 * 하나 둔다(2026-09-02). Wanted 세트에 없어 `logout` 처럼 직접 선으로 그린 글리프
 * 넷(`paths.ts` 「쉼터 콘텐츠」)이다. 20 · `primary.strong` — 바람카드의 하트와 같은 결.
 *
 * ## 위아래를 넉넉히
 *
 * 기본 카드 패딩(16)이면 텍스트 상자처럼 보여 위아래를 20 으로, 제목과 설명 사이를
 * 8 로 벌린다. 설명은 도메인이 **두 줄로 미리 끊어 둔** 문장이다(`contents.ts`).
 */
type Props = {
  items: readonly RestContent[];
  /** `route` 가 있는 콘텐츠를 눌렀을 때 — 어디로 갈지는 화면이 정한다 */
  onOpen?: (item: RestContent) => void;
};

export function RestContentGrid({ items, onOpen }: Props) {
  const rows: RestContent[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((item) => {
            const tile = (
              <Card padding="none" style={styles.tile}>
                <View style={styles.head}>
                  <Text variant="label1" color={labelColor.strong} style={styles.title}>
                    {item.title}
                  </Text>
                  <Icon name={item.icon} size={20} color={primary.strong} />
                </View>
                <Text variant="caption1" color={labelColor.neutral}>
                  {item.description}
                </Text>
              </Card>
            );
            return item.route != null ? (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.title} 열기`}
                onPress={() => onOpen?.(item)}
                style={styles.cell}
              >
                {tile}
              </Pressable>
            ) : (
              <View key={item.id} style={styles.cell}>
                {tile}
              </View>
            );
          })}
          {/* 홀수 개가 오면 빈 칸으로 폭을 지킨다 — 마지막 칸이 혼자 넓어지지 않게 */}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.md },
  row: { flexDirection: "row", gap: space.md },
  // 행 안의 두 칸 — 누르는 면과 카드가 같은 높이로 늘어난다
  cell: { flex: 1 },
  // ⚠ `flex: 1` 이 아니다 — 칸(세로 컨테이너) 안에서는 높이의 basis 가 0 이 돼
  // 카드가 접힌다(글자가 사라진 채 아이콘만 남았다 · 2026-09-03 에뮬레이터).
  // `flexGrow` 는 내용 높이에서 출발해 옆 칸 높이까지만 늘어난다
  tile: {
    flexGrow: 1,
    gap: space.sm,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: { flexShrink: 1 },
});
