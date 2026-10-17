import { Pressable, StyleSheet, View } from "react-native";

import { DiaryEmotionRow } from "@/components/diary/DiaryEmotionRow";
import { EmotionPebble, Text, WeekEmptyDot } from "@/components/ds";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { label as labelColor, space } from "@/design/ds";
import { reportPaper } from "@/design/ds/reportPaper";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";
import type { WeeklyMoodDay } from "@/features/report/model/weeklyReport";
import { koreanWeekday } from "@/lib/day";

/**
 * HTML `04-report.dc.html`의 요일별 종이 카드. 서버는 하루별 감정만 주므로
 * 시안의 하루별 일정 완료·쉼 아이콘은 가짜 값으로 채우지 않는다.
 * 여러 감정은 대표 조약돌 하나와 선택 시 전체 이름으로 확인한다.
 */
const namesOf = (emotions: readonly EmotionId[], written: boolean) => {
  const names = emotions.map(emotionName).filter((name) => name.length > 0);
  if (names.length > 0) return names.join(", ");
  return written ? "기록 있음" : "기록 없음";
};

type Props = {
  days: readonly WeeklyMoodDay[];
  writtenDates: ReadonlySet<string>;
  selected: string | null;
  onSelect: (date: string | null) => void;
};

export function WeekEmotionStack({ days, writtenDates, selected, onSelect }: Props) {
  const fontScale = useEffectiveFontScale();
  return (
    <View style={styles.row}>
      {days.map((day) => {
        const weekday = koreanWeekday(day.date);
        const written = writtenDates.has(day.date);
        const isSelected = day.date === selected;
        const firstEmotion = day.emotions[0] ?? null;
        const mood =
          firstEmotion == null
            ? written
              ? "기록"
              : "·"
            : emotionName(firstEmotion).replace(/함$/, "");

        return (
          <Pressable
            key={day.date}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${weekday}요일 ${namesOf(day.emotions, written)}`}
            onPress={() => onSelect(isSelected ? null : day.date)}
            style={styles.column}
          >
            <Text
              variant="label2"
              color={reportPaper.ink}
              style={[
                styles.weekday,
                isSelected && styles.selectedWeekday,
                { lineHeight: 20 * fontScale },
              ]}
            >
              {weekday}
            </Text>
            <View style={[styles.pebble, isSelected && styles.selectedPebble]}>
              {firstEmotion != null || written ? (
                <EmotionPebble id={firstEmotion} size={28} />
              ) : (
                <WeekEmptyDot size={28} />
              )}
            </View>
            <Text
              variant="label2"
              color={reportPaper.strong}
              style={[styles.mood, { lineHeight: 17 * fontScale }]}
            >
              {mood}
            </Text>
            <View style={styles.divider} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** 고른 날은 색에만 의존하지 않고 감정 전체를 글자로 말한다. */
export function WeekMoodReveal({ day, written }: { day: WeeklyMoodDay; written: boolean }) {
  return (
    <View style={styles.reveal}>
      <Text variant="label2" color={labelColor.neutral}>
        {`${koreanWeekday(day.date)}요일 ·`}
      </Text>
      {day.emotions.length > 0 ? (
        <DiaryEmotionRow emotions={day.emotions} align="flex-end" marker="pebble" />
      ) : (
        <Text variant="label2" color={labelColor.assistive}>
          {namesOf(day.emotions, written)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: space.xs2 },
  column: { flex: 1, minWidth: 0, alignItems: "center", gap: space.xs },
  weekday: { fontFamily: reportPaper.font.bold, fontSize: 15, lineHeight: 20 },
  selectedWeekday: { backgroundColor: reportPaper.tape, borderRadius: 8 },
  pebble: { marginTop: space.xs, borderRadius: 18 },
  selectedPebble: { backgroundColor: reportPaper.date, transform: [{ scale: 1.14 }] },
  mood: {
    fontFamily: reportPaper.font.bold,
    fontSize: 13,
    lineHeight: 17,
    textAlign: "center",
    minHeight: 34,
  },
  divider: {
    width: "100%",
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: reportPaper.line,
  },
  reveal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space.sm,
    flexShrink: 1,
    alignSelf: "center",
  },
});
