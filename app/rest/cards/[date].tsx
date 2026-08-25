import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Icon, Screen, Text, TopNavigation } from "@/components/ds";
import { fill, label as labelColor, radius, space, status } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { cardOn, datedCards, pastCards } from "@/features/rest/model/cards";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `R3` · 같은 행동카드의 **누적 기록** (`Rest.dc.html` R3).
 *
 * **행동 자체가 제목이다**(시안 주석) — 「행동 카드」라는 이름표 대신 무엇을
 * 하기로 했는지가 Title 3 로 선다. 그 아래 「이 카드가 만들어진 상황」이 붙는다.
 *
 * ## 여기서는 수행을 바꾸지 않는다
 *
 * 수행 체크와 느낀 점 입력은 `R2` 의 카드 안에 있다. 여기는 **읽는 화면**이다 —
 * 같은 일을 두 자리에서 할 수 있게 두면 어느 쪽이 최신인지가 흐려진다.
 *
 * - 지난 기록은 **세지 않고 나열한다** — 「n번 중 m번」 같은 수치를 두지 않는다
 *   (`RULES.md` 4)
 * - **느낀 점이 있을 때만 두 번째 줄을 노출한다**(시안 규칙) — 없는 줄까지 자리를
 *   차지하면 목록이 빽빽해진다
 */
export default function RestCardTrail() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const cards = useDiary((s) => s.actionCards);

  const all = useMemo(() => datedCards(cards), [cards]);
  const card = date == null ? null : cardOn(all, date);
  const past = date == null ? [] : pastCards(all, date);

  return (
    <Screen>
      {/* 제목을 두지 않는다 — 아래 행동 문장이 이 화면의 제목이다 */}
      <TopNavigation leading="arrow-left" onLeadingPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {card == null ? (
          // 없는 날짜는 조용히 빈 상태다 — 오류 화면을 만들지 않는다
          <Text variant="body2" color={labelColor.neutral}>
            이 날의 행동카드가 없어요.
          </Text>
        ) : (
          <>
            <View style={styles.head}>
              <Text variant="label2" color={labelColor.alternative}>
                제안된 행동
              </Text>
              {/* 제안된 행동 문구는 **손글씨(교보 2025)**로 — 회고가 건넨 말처럼 읽히게 */}
              <Text variant="title3Hand" color={labelColor.strong}>
                {card.targetAction}
              </Text>
            </View>

            <View style={styles.situation}>
              <Text variant="caption1" color={labelColor.alternative}>
                이 카드가 만들어진 상황
              </Text>
              <Text variant="body2" color={labelColor.neutral}>
                {card.situation}
              </Text>
            </View>

            {/* 이 날 기록 — 쉼터(`R2`)에서 「했어요」·느낀 점을 적으면 **같은 store 라
                여기 바로 반영된다**. 「지난 기록」이 그날 카드 자신은 빼고 세므로, 이 날의
                수행·느낀 점은 따로 보여준다(지난 기록과 같은 줄 모양). */}
            <View style={styles.trail}>
              <Text variant="label1" color={labelColor.neutral} style={styles.trailTitle}>
                이 날 기록
              </Text>
              <View style={styles.log}>
                <Icon
                  name={card.done ? "circle-check" : "clock"}
                  size={16}
                  color={card.done ? status.positive : labelColor.assistive}
                />
                <View style={styles.logCopy}>
                  <Text variant="body2" color={labelColor.normal}>
                    {`${formatKoreanDateShort(card.createdAt.slice(0, 10))} · ${card.done ? "수행함" : "수행 안 함"}`}
                  </Text>
                  {/* 느낀 점은 손글씨(교보 2025) — 일기 상세·쉼터와 결을 맞춘다 */}
                  {card.reflection != null && card.reflection.length > 0 ? (
                    <Text variant="label1Hand" color={labelColor.alternative}>
                      {card.reflection}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.trail}>
              <Text variant="label1" color={labelColor.neutral} style={styles.trailTitle}>
                지난 기록
              </Text>

              {past.length === 0 ? (
                <Text variant="caption1" color={labelColor.alternative} style={styles.trailTitle}>
                  아직 지난 기록이 없어요.
                </Text>
              ) : (
                past.map(({ card: c, date: d }) => (
                  <View key={c.id} style={styles.log}>
                    {/* 수행 여부는 아이콘과 **글자가 함께** 말한다 — 색만으로 두지 않는다 */}
                    <Icon
                      name={c.done ? "circle-check" : "clock"}
                      size={16}
                      color={c.done ? status.positive : labelColor.assistive}
                    />
                    <View style={styles.logCopy}>
                      <Text variant="body2" color={labelColor.normal}>
                        {`${formatKoreanDateShort(d)} · ${c.done ? "수행함" : "수행 안 함"}`}
                      </Text>
                      {/* 느낀 점이 있을 때만 둘째 줄이 열린다 (시안 규칙) · 손글씨로 통일 */}
                      {c.reflection != null && c.reflection.length > 0 ? (
                        <Text variant="label1Hand" color={labelColor.alternative}>
                          {c.reflection}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl, paddingBottom: space.xl },
  head: { gap: 6 },
  situation: {
    gap: 5,
    paddingVertical: space.lg,
    paddingHorizontal: 18,
    borderRadius: radius.medium,
    backgroundColor: fill.alternative,
  },
  trail: { gap: space.md },
  trailTitle: { paddingHorizontal: space.xs },
  log: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    paddingHorizontal: space.xs,
  },
  logCopy: { flex: 1, gap: 2 },
});
