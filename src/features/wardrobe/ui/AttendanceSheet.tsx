import { StyleSheet, View } from "react-native";

import { BottomSheet, Button, Text } from "@/components/ds";
import { label, space, wardrobe } from "@/design/ds";

import { AttendanceGrid } from "./AttendanceGrid";
import { TangerineIcon } from "./Tangerine";

/**
 * 출석 완료 — 그날 처음 홈에 들어와 출석 귤을 받으면 한 번 뜬다(위기 안내가 있던 날은 뜨지 않는다).
 * 같은 정산에서 받은 일기 · 쉼터 귤도 함께 더해 한 줄로 말한다.
 */
export function AttendanceSheet({
  total,
  day,
  rewards,
  onDismiss,
}: {
  total: number;
  day: number;
  rewards: readonly number[];
  onDismiss: () => void;
}) {
  return (
    <BottomSheet title="출석 완료" onDismiss={onDismiss}>
      <View testID="attendance-sheet" style={styles.body}>
        <View style={styles.got} accessible accessibilityLabel={`귤 ${total}개를 받았어요`}>
          <TangerineIcon size={wardrobe.attendance.icon} />
          <Text variant="body1" color={label.normal}>
            귤 {total}개를 받았어요
          </Text>
        </View>
        <AttendanceGrid day={day} rewards={rewards} checkedToday stamp />
        <Button label="확인" fill onPress={onDismiss} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg, paddingBottom: space.sm },
  got: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs },
});
