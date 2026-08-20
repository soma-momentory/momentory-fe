import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Calendar, Screen, Text, TopNavigation, type CalendarMark } from "@/components/ds";
import { RestActionCard } from "@/components/rest/RestActionCard";
import { label as labelColor, space, status } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { cardDaysIn, cardOn, datedCards, latestCardDay } from "@/features/rest/model/cards";
import { clock } from "@/lib/clock";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `R2` · 날짜별 행동카드 (`Rest.dc.html` R2-a·b·c).
 *
 * **위계가 둘이다**(시안 주석): 고른 날의 카드만 **흰 카드**(Primary)이고,
 * 「지난 행동카드」는 **배경 위에 직접** 놓인다(Secondary). 카드가 둘로 보이면
 * 어느 것이 오늘 할 일인지가 흐려진다.
 *
 * ## 캘린더는 날짜 탐색만 한다
 *
 * 시안 규칙: 「**R2 캘린더는 3가지를 분리해요** — 카드 존재는 **텍스트 대비**,
 * 수행은 날짜 아래 **작은 초록 dot**, 선택은 **초록 아웃라인** (배경 채움·범례 없음)」.
 *
 * 셋을 한 자리에 겹쳐 칠하면(옛 화면의 배경 채움) 「카드가 있다」와 「해냈다」가
 * 같은 신호로 읽힌다. **수행률·연속 일수를 세지 않는다**(`RULES.md` 4) —
 * 달력은 「있었다」와 「했다」를 말할 뿐 잘했는지를 말하지 않는다.
 *
 * 카드가 없는 날은 **고를 수 없다** — 눌러도 빈 화면으로 데려갈 뿐이다.
 */
export default function RestCards() {
  const diaries = useDiary((s) => s.diaries);
  const cards = useDiary((s) => s.actionCards);
  const markDone = useDiary((s) => s.markActionDone);
  const undoDone = useDiary((s) => s.undoActionDone);
  const setReflection = useDiary((s) => s.setReflection);

  const all = useMemo(() => datedCards(diaries, cards), [diaries, cards]);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? latestCardDay(all);
  const [month, setMonth] = useState<string | null>(null);
  const today = clock.today();
  const shownMonth = month ?? (selected ?? today).slice(0, 7);

  const card = selected == null ? null : cardOn(all, selected);
  const days = cardDaysIn(all, shownMonth);

  /** 카드 존재 · 수행 · 선택을 **셋으로 나눠** 표시한다(시안 규칙) */
  const markOf = (date: string): CalendarMark => {
    const has = days.includes(date);
    if (!has) return { disabled: true };
    return { emphasized: true, dotColor: cardOn(all, date)?.done ? status.positive : undefined };
  };

  const step = (by: -1 | 1) => {
    const [y, m] = [Number(shownMonth.slice(0, 4)), Number(shownMonth.slice(5, 7))];
    const next = new Date(y, m - 1 + by, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <Screen>
      <TopNavigation leading="arrow-left" title="행동카드" onLeadingPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {card == null || selected == null ? (
          // 빈 상태 — 「아직」이라고 말하지 않는다. 회고가 먼저다
          <Text variant="body2" color={labelColor.neutral} style={styles.empty}>
            회고를 마치면 그날의 행동카드가 여기 남아요.
          </Text>
        ) : (
          <RestActionCard
            card={card}
            date={formatKoreanDateShort(selected)}
            dateNote={selected === today ? "오늘" : undefined}
            onToggleDone={() => (card.done ? undoDone(card.id) : markDone(card.id))}
            onSetReflection={(t) => setReflection(card.id, t)}
            onOpenTrail={() =>
              router.push({ pathname: "/rest/cards/[date]", params: { date: selected } })
            }
          />
        )}

        {/* 배경 위에 직접 — 흰 카드로 감싸면 위 카드와 같은 무게가 된다 */}
        <View style={styles.past}>
          <View style={styles.pastHead}>
            <Text variant="label1" color={labelColor.neutral}>
              지난 행동카드
            </Text>
            <Text variant="caption1" color={labelColor.alternative}>
              카드가 있었던 날을 골라보세요.
            </Text>
          </View>

          <Calendar
            month={shownMonth}
            selectedDate={selected}
            onSelect={(date) => {
              setPicked(date);
              setMonth(date.slice(0, 7));
            }}
            onMonthStep={step}
            markOf={markOf}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.xl },
  empty: { paddingVertical: space.xl },
  // 지난 카드 블록은 위 카드와 16 띄운다 (시안 `margin-top:16`)
  past: { gap: 10, marginTop: space.lg },
  pastHead: { gap: 2, paddingHorizontal: space.xs },
});
