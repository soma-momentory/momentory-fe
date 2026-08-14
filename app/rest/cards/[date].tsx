import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { AppText } from "@/components/primitives/AppText";
import { RestActionCard } from "@/components/rest/RestActionCard";
import { paperColors, paperRadius, paperShadows, paperTypography } from "@/design/paper";
import { useDiary } from "@/features/diary/model/diary";
import { cardOn, datedCards, pastCards } from "@/features/rest/model/cards";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * 행동 카드 상세 — `docs/design/prototype/쉼터.dc.html` 의 상세 화면.
 *
 * **화면 자체가 한 장의 카드**다(`design-system.md` §4.5): 상황 → 제안된 행동 →
 * 수행/느낀 점 → **지난 기록**(과거 카드에서 최신순 6건).
 *
 * 지난 기록은 **세지 않고 나열한다** — 「n번 중 m번」 같은 수치를 두지 않는다
 * (`RULES.md` 「숫자로 압박하지 않는다」).
 */
export default function RestCardDetail() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const diaries = useDiary((s) => s.diaries);
  const cards = useDiary((s) => s.actionCards);
  const markDone = useDiary((s) => s.markActionDone);
  const undoDone = useDiary((s) => s.undoActionDone);
  const setReflection = useDiary((s) => s.setReflection);

  const all = useMemo(() => datedCards(diaries, cards), [diaries, cards]);
  const card = date == null ? null : cardOn(all, date);
  const past = date == null ? [] : pastCards(all, date);

  return (
    <ScreenBackground variant="paperFlat">
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          hitSlop={11}
          onPress={() => router.back()}
        >
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <AppText weight="700" style={styles.title}>
          행동 카드
        </AppText>
        {date != null ? <AppText style={styles.date}>{formatKoreanDateShort(date)}</AppText> : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {card == null ? (
          <View style={styles.sheet}>
            <AppText style={styles.emptyText}>이 날의 행동 카드가 없어요.</AppText>
          </View>
        ) : (
          <View style={styles.sheet}>
            <RestActionCard
              card={card}
              onToggleDone={() => (card.done ? undoDone(card.id) : markDone(card.id))}
              onSetReflection={(text) => setReflection(card.id, text)}
            />

            <View style={styles.divider} />

            <AppText weight="700" style={styles.pastTitle}>
              지난 기록
            </AppText>
            {past.length === 0 ? (
              <AppText style={styles.emptyText}>아직 지난 기록이 없어요.</AppText>
            ) : (
              past.map(({ card: c, date: d }) => (
                <View key={c.id} style={styles.log}>
                  <View style={[styles.logMark, c.done ? styles.logMarkOn : null]} />
                  <View style={styles.logCopy}>
                    <AppText weight="700" style={styles.logDate}>
                      {`${formatKoreanDateShort(d)} · ${c.done ? "수행함" : "수행 안 함"}`}
                    </AppText>
                    {c.reflection != null && c.reflection.length > 0 ? (
                      <AppText style={styles.logNote}>{c.reflection}</AppText>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
  back: { fontSize: 19, lineHeight: 24, color: paperColors.text.primary },
  title: {
    flex: 1,
    fontSize: type.sheetTitle.fontSize,
    lineHeight: type.sheetTitle.lineHeight,
    color: paperColors.text.primary,
  },
  date: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.mutedWarmText,
  },

  content: { paddingTop: 8, paddingBottom: 24 },
  // 화면 자체가 한 장의 카드다 (design-system.md §4.5)
  sheet: {
    gap: 14,
    padding: 18,
    borderRadius: paperRadius.sheet,
    backgroundColor: paperColors.bg.cardOpaque,
    ...paperShadows.floating,
  },
  divider: { height: 1, backgroundColor: paperColors.line.detail },
  pastTitle: {
    fontSize: type.cardTitle.fontSize,
    lineHeight: type.cardTitle.lineHeight,
    color: paperColors.text.primary,
  },
  emptyText: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.mutedWarmText,
  },

  log: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: paperRadius.field,
    backgroundColor: paperColors.bg.field,
  },
  // 수행 여부는 채움으로 — 색만이 아니라 글자(「수행함」)가 함께 말한다
  logMark: {
    width: 18,
    height: 18,
    marginTop: 2,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: paperColors.neutral.task,
  },
  logMarkOn: {
    backgroundColor: paperColors.brand.green,
    borderColor: paperColors.brand.green,
  },
  logCopy: { flex: 1, gap: 2 },
  logDate: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },
  logNote: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },
});
