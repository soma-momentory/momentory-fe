import { Pressable } from "react-native";
import { Text } from "@/components/ds";
import { label } from "@/design/ds";
import { openExternalLink } from "@/lib/links";

/** MET Norway CC BY 4.0 출처 표시. 실측값이 아니라 기록 시각의 지역 예보다. */
export function WeatherCredit() {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="날씨 예보 출처 MET Norway"
      onPress={() => void openExternalLink("weather")}
      hitSlop={8}
    >
      <Text variant="caption1" color={label.alternative}>
        날씨 예보 · MET Norway
      </Text>
    </Pressable>
  );
}
