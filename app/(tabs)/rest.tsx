import { track } from "@/features/analytics";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { Card, Icon, TabScreen, Text } from "@/components/ds";
import { RestCardPressable } from "@/components/rest/RestCardPressable";
import { RestContentGrid } from "@/components/rest/RestContentGrid";
import { label as labelColor, primary, space } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import { cardOn, datedCards, latestCardDay } from "@/features/rest/model/cards";
import { REST_CONTENTS, REST_CONTENTS_PROMPT } from "@/features/rest/model/contents";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `R1` · 쉼터 진입 — **바람카드가 있다는 사실만** 말한다.
 *
 * `Rest.dc.html` 규칙: 「R1 = 진입 — 바람카드가 있다는 사실만, **카드 전체가
 * 진입점**(「보기 →」)」 · 「**R1에서는 캘린더·수행 기록을 설명하지 않아요**」.
 *
 * ## 탭이 카드 화면 그 자체이던 것에서 바뀌었다
 *
 * 2세대에서는 이 탭이 곧 행동 카드 화면이었다(`PLAN.md` D1 — 룸 3종이 범위 밖이라
 * 허브를 두지 않았다). 새 시안은 **허브를 되살렸다** — 대신 룸이 아니라 **항목
 * 하나**다. 「쉼터에는 아직 바람카드만 — 기능이 늘면 R1에 항목을 더해요」가 시안
 * 주석에 그대로 적혀 있다. 늘어날 자리를 비워 두는 것과, 없는 것을 그리는 것은 다르다.
 *
 * **카드가 하나도 없어도 들어갈 수 있다** — 안에서 날짜로 둘러보고, 카드가 없는 날은
 * 「그 날 만들어진 바람카드가 없어요」로 답한다(2026-08-23). 요약 줄은 카드가 없으면
 * 회고가 먼저라는 사실만 말한다.
 *
 * ## 바람카드 아래에 쉼 콘텐츠 넷이 붙었다 (2026-09-02)
 *
 * 「기능이 늘면 R1 에 항목을 더해요」가 그 자리다 — 감각연못 · 걱정상자 · 오늘의
 * 보물함 · 몸에 힘 빼기를 **2×2** 로 놓는다(`features/rest/model/contents.ts`).
 * 바람카드는 그대로 첫 항목이고 진입점이다. 콘텐츠는 **화면이 생긴 것만 눌린다** —
 * 감각연못이 첫 번째다(2026-09-03 · `/rest/sense-pond`). 나머지 셋은 아직
 * 눌리지 않는다(`RestContentGrid`).
 */
export default function Rest() {
  const cards = useDiary((s) => s.actionCards);

  const all = useMemo(() => datedCards(cards), [cards]);
  const latest = latestCardDay(all);
  const { date: today } = useTodayContext();
  const hasToday = cardOn(all, today) != null;

  const summary =
    latest == null
      ? // 「아직 없어요」라고 말하지 않는다 — 회고가 먼저다
        "회고를 마치면 그날의 바람카드가 여기 남아요"
      : hasToday
        ? "오늘의 바람카드가 있어요"
        : `가장 최근 카드는 ${formatKoreanDateShort(latest)}이에요`;

  const open = () => {
    track("wish_card_open_clicked", { source: "rest" });
    router.push("/rest/cards");
  };

  return (
    <TabScreen active="쉼터">
      {/* 탭 루트라 상단 내비 제목을 두지 않는다 — 본문의 Title 3(손글씨)가 제목이다(`DESIGN.md` §10) */}
      <View style={styles.header}>
        <Text variant="title3Hand" color={labelColor.strong}>
          쉼터
        </Text>
      </View>

      <RestCardPressable accessibilityLabel="바람카드 보기" onPress={open}>
        <Card padding="loose" style={styles.entry}>
          {/* 이름은 왼쪽, 하트는 **오른쪽 끝**이다(2026-09-06). 예전에는 하트가
              이름 앞에 붙고 오른쪽에 「보기」가 서 있었는데, **카드 전체가 진입점**
              이라 그 글자는 눌리지도 않는 표시일 뿐이었다 — 없애고 그 자리를 하트에
              내줬다. 들어가는 길은 카드를 누르는 것 하나로 남는다 */}
          {/* 이름은 한 단 크게(`heading1` 22 · 2026-09-11 사용자 요청) — 아래 칸 제목(18)보다
              한 단 위라 「첫 항목이자 진입점」 위계가 그대로 남는다 */}
          <View style={styles.head}>
            <Text variant="heading1" color={labelColor.strong}>
              바람카드
            </Text>
            <Icon name="heart" size={20} color={primary.strong} />
          </View>

          <Text variant="body2" color={labelColor.neutral}>
            {summary}
          </Text>
        </Card>
      </RestCardPressable>

      {/* 안내 한 줄 + 2×2. 구역 제목(`SectionHeader`)이 아니라 **권유 문장**이라
          본문 급(`body2`)으로 쓴다 — 바람카드 제목과 위계를 다투지 않는다 */}
      <View style={styles.contents}>
        <Text variant="body2" color={labelColor.neutral}>
          {REST_CONTENTS_PROMPT}
        </Text>
        <RestContentGrid
          items={REST_CONTENTS}
          onOpen={(item) => {
            if (item.route != null) router.push(item.route);
          }}
        />
      </View>
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
  contents: { paddingTop: space.xl2, gap: space.md },
});
