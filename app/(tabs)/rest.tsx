import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Hill } from "@/components/common/Hill";
import { TabScreen } from "@/components/common/TabScreen";
import { AppText } from "@/components/primitives/AppText";
import { CardMiniCalendar } from "@/components/rest/CardMiniCalendar";
import { RestActionCard } from "@/components/rest/RestActionCard";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import { useDiary } from "@/features/diary/model/diary";
import { cardDaysIn, cardOn, datedCards, latestCardDay } from "@/features/rest/model/cards";
import { clock } from "@/lib/clock";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * 쉼터 — **행동 카드만 있다**(2026-08-14 결정 · `PLAN.md` D1).
 *
 * 시안의 룸 3종(대나무 숲 · 감각 연못 · 걱정 상자)은 구현 범위 밖이라 타일을
 * 아예 두지 않는다 — 눌리는데 아무 일도 없는 자리를 만들지 않는다(`CLAUDE.md`).
 * 그래서 이 탭은 시안의 허브가 아니라 **행동 카드 화면 그 자체**다.
 *
 * 위: 고른 날의 카드 한 장(자세히 보기 없이 바로 보인다) →
 * 곡선 언덕 → 아래: **카드가 있는 날만 고를 수 있는 달력**.
 *
 * **수행률·연속 일수를 세지 않는다**(`RULES.md`) — 달력은 「있었다」만 말한다.
 */
export default function Rest() {
  const diaries = useDiary((s) => s.diaries);
  const cards = useDiary((s) => s.actionCards);
  const markDone = useDiary((s) => s.markActionDone);
  const undoDone = useDiary((s) => s.undoActionDone);
  const setReflection = useDiary((s) => s.setReflection);

  const all = useMemo(() => datedCards(diaries, cards), [diaries, cards]);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? latestCardDay(all);
  const [month, setMonth] = useState<string | null>(null);
  const shownMonth = month ?? (selected ?? clock.today()).slice(0, 7);

  const card = selected == null ? null : cardOn(all, selected);
  const days = cardDaysIn(all, shownMonth);

  const shiftMonth = (by: number) => {
    const [y, m] = [Number(shownMonth.slice(0, 4)), Number(shownMonth.slice(5, 7))];
    const next = new Date(y, m - 1 + by, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <TabScreen active="쉼터" background="paperSky">
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText weight="700" style={styles.title}>
          행동 카드
        </AppText>

        {card == null || selected == null ? (
          // 빈 상태 — 「아직」이라고 말하지 않는다. 회고가 먼저다
          <View style={styles.empty}>
            <AppText style={styles.emptyText}>
              회고를 마치면 그날의 행동 카드가 여기 남아요.
            </AppText>
          </View>
        ) : (
          <>
            <AppText style={styles.date}>{formatKoreanDateShort(selected)}</AppText>
            <RestActionCard
              card={card}
              onOpen={() =>
                router.push({ pathname: "/rest/cards/[date]", params: { date: selected } })
              }
              onToggleDone={() => (card.done ? undoDone(card.id) : markDone(card.id))}
              onSetReflection={(text) => setReflection(card.id, text)}
            />
          </>
        )}
      </ScrollView>

      <View style={styles.hillWrap}>
        <Hill color={paperColors.bg.hill} height="md" />
      </View>

      <View style={styles.calendarArea}>
        <CardMiniCalendar
          month={shownMonth}
          cardDays={days}
          selected={selected}
          onSelect={(date) => {
            setPicked(date);
            setMonth(date.slice(0, 7));
          }}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          canNext={shownMonth < clock.today().slice(0, 7)}
        />
      </View>
    </TabScreen>
  );
}

const { styles: type } = paperTypography;
const FULL_BLEED = -20;

const styles = StyleSheet.create({
  body: { flex: 1 },
  content: { gap: 12, paddingTop: 8, paddingBottom: 16 },
  title: {
    fontSize: type.screenTitle.fontSize,
    lineHeight: type.screenTitle.lineHeight,
    color: paperColors.text.primary,
  },
  date: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.muted,
  },
  empty: {
    padding: 20,
    borderRadius: paperRadius.card,
    backgroundColor: paperColors.bg.cardSoft,
  },
  emptyText: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    textAlign: "center",
    color: paperColors.text.primary,
  },

  hillWrap: { marginHorizontal: FULL_BLEED },
  calendarArea: {
    marginHorizontal: FULL_BLEED,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: paperColors.bg.hill,
  },
});
