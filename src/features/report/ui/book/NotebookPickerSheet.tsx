import { ScrollView, useWindowDimensions, View } from "react-native";

import { BottomSheet, Icon, ListCell, ListDivider, Text } from "@/components/ds";
import { label as labelColor, primary } from "@/design/ds";
import type { NotebookOption } from "@/features/report/model/weeklyBook";

/** 예전 공책 고르기 — 일기가 남은 끝난 주만 선다. 시트는 화면의 절반까지만 자란다 */
export function NotebookPickerSheet({
  options,
  current,
  onSelect,
  onDismiss,
}: {
  options: readonly NotebookOption[];
  current: string | null;
  onSelect: (weekStart: string) => void;
  onDismiss: () => void;
}) {
  const { height } = useWindowDimensions();
  return (
    <BottomSheet onDismiss={onDismiss}>
      <ScrollView
        testID="book-picker"
        style={{ maxHeight: height / 2 }}
        showsVerticalScrollIndicator={false}
      >
        {options.map((option, i) => (
          <View key={option.weekStart}>
            {i > 0 ? <ListDivider /> : null}
            <ListCell
              title={option.range}
              description={`일기 ${option.diaryCount}일`}
              trailing={
                option.weekStart === current ? (
                  <Icon name="check" size={20} color={primary.normal} />
                ) : undefined
              }
              onPress={() => onSelect(option.weekStart)}
            />
          </View>
        ))}
      </ScrollView>
      {options.length === 0 ? (
        <Text variant="caption1" color={labelColor.alternative}>
          일기를 남긴 주가 여기에 쌓여요
        </Text>
      ) : null}
    </BottomSheet>
  );
}
