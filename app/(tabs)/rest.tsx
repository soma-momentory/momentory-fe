import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Card, Icon, TabScreen, Text } from "@/components/ds";
import { label as labelColor, primary, space } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { cardOn, datedCards, latestCardDay } from "@/features/rest/model/cards";
import { clock } from "@/lib/clock";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `R1` · 쉼터 진입 — **행동카드가 있다는 사실만** 말한다.
 *
 * `Rest.dc.html` 규칙: 「R1 = 진입 — 행동카드가 있다는 사실만, **카드 전체가
 * 진입점**(「보기 →」)」 · 「**R1에서는 캘린더·수행 기록을 설명하지 않아요**」.
 *
 * ## 탭이 카드 화면 그 자체이던 것에서 바뀌었다
 *
 * 2세대에서는 이 탭이 곧 행동 카드 화면이었다(`PLAN.md` D1 — 룸 3종이 범위 밖이라
 * 허브를 두지 않았다). 새 시안은 **허브를 되살렸다** — 대신 룸이 아니라 **항목
 * 하나**다. 「쉼터에는 아직 행동카드만 — 기능이 늘면 R1에 항목을 더해요」가 시안
 * 주석에 그대로 적혀 있다. 늘어날 자리를 비워 두는 것과, 없는 것을 그리는 것은 다르다.
 *
 * **카드가 하나도 없으면 누를 수 없다** — 갈 곳은 있지만 보여줄 것이 없는 자리를
 * 누르게 하지 않는다(`CLAUDE.md`). 대신 회고가 먼저라는 사실만 말한다.
 */
export default function Rest() {
  const diaries = useDiary((s) => s.diaries);
  const cards = useDiary((s) => s.actionCards);

  const all = useMemo(() => datedCards(diaries, cards), [diaries, cards]);
  const latest = latestCardDay(all);
  const today = clock.today();
  const hasToday = cardOn(all, today) != null;

  const summary =
    latest == null
      ? // 「아직 없어요」라고 말하지 않는다 — 회고가 먼저다
        "회고를 마치면 그날의 행동카드가 여기 남아요"
      : hasToday
        ? "오늘의 행동카드가 있어요"
        : `가장 최근 카드는 ${formatKoreanDateShort(latest)}이에요`;

  const open = () => router.push("/rest/cards");

  return (
    <TabScreen active="쉼터">
      {/* 탭 루트라 상단 내비 제목을 두지 않는다 — 본문의 Title 3 가 제목이다(`design.md` §10) */}
      <View style={styles.header}>
        <Text variant="title3" color={labelColor.strong}>
          쉼터
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="행동카드 보기"
        disabled={latest == null}
        onPress={open}
      >
        <Card padding="loose" style={styles.entry}>
          <View style={styles.head}>
            <View style={styles.name}>
              <Icon name="heart" size={20} color={primary.strong} />
              <Text variant="headline1" color={labelColor.strong}>
                행동카드
              </Text>
            </View>
            {/* 카드 전체가 진입점이라 이 글자는 **표시**다 — 따로 눌리지 않는다 */}
            {latest != null ? (
              <Text variant="label2" color={primary.heavy}>
                보기
              </Text>
            ) : null}
          </View>

          <Text variant="body2" color={labelColor.neutral}>
            {summary}
          </Text>
        </Card>
      </Pressable>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.sm, paddingBottom: space.xl },
  entry: { gap: space.md },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  name: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
