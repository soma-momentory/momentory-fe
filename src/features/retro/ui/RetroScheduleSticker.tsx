import { StyleSheet, View } from "react-native";
import { DayScheduleList } from "@/components/archive/DayScheduleList";
import { Text } from "@/components/ds";
import { label, retroDiary, space } from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";
import { formatKoreanDate } from "@/lib/day";

/** Read-only schedule note, shared with the diary design preview. */
export function RetroScheduleSticker({
  date,
  schedules,
}: {
  date: string;
  schedules: readonly Schedule[];
}) {
  return (
    <View style={styles.paper}>
      <Text variant="body1ReadingHand" color={label.neutral}>
        {formatKoreanDate(date)}
      </Text>
      <DayScheduleList schedules={schedules} showStatusDot itemVariant="body1ReadingHand" />
    </View>
  );
}
const styles = StyleSheet.create({
  paper: {
    alignSelf: "flex-start",
    maxWidth: retroDiary.scheduleWidth,
    gap: space.md,
    padding: space.xl,
    backgroundColor: retroDiary.question,
    borderRadius: retroDiary.radius,
  },
});
