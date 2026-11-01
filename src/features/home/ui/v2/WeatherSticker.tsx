import { Image } from "expo-image";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { homeV2 } from "@/design/ds";

import type { HomeWeatherView } from "./types";
import { weatherStickerForKey } from "./weatherStickers";

/**
 * 홈 v2 히어로의 **날씨 스티커**(P4 · 계획 §4.5 · HW-4 · HW-5).
 *
 * - `weather` 가 없거나 그림이 없는 열쇠면 **아무것도 그리지 않는다** — 빈 틀도 문구도 없다(HW-4).
 * - 누르면 출처 · 갱신 시각 시트(`WeatherCreditSheet`)를 여는 것은 부르는 쪽 몫이다(`onPress`).
 * - 자리(히어로 오른쪽 위 · `position`)는 부르는 쪽이 `style` 로 정한다 — 이 컴포넌트는 종이 한 장이다.
 *
 * 2026-11-01 사용자 요청: 사진을 80×90pt로 줄이고 고정 장식 없이 표시한다.
 */
export function WeatherSticker({
  weather,
  onPress,
  style,
}: {
  weather: HomeWeatherView | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  if (weather == null) return null;
  const sticker = weatherStickerForKey(weather.stickerKey);
  if (sticker == null) return null;

  return (
    <Pressable
      testID="home-v2-weather-sticker"
      accessibilityRole="button"
      accessibilityLabel={weatherAccessibilityLabel(weather)}
      accessibilityHint="출처와 갱신 시각 보기"
      onPress={onPress}
      style={[styles.sticker, style]}
    >
      <Image source={sticker.source} contentFit="cover" style={styles.image} />
    </Pressable>
  );
}

/** 「날씨: 맑음 22도」 — 기온이 없으면 「날씨: 맑음」 */
export function weatherAccessibilityLabel({ label, temperatureC }: HomeWeatherView): string {
  return temperatureC == null ? `날씨: ${label}` : `날씨: ${label} ${temperatureC}도`;
}

const styles = StyleSheet.create({
  sticker: {
    width: 80,
    height: 90,
    padding: 6,
    paddingBottom: 15,
    backgroundColor: homeV2.color.white,
    boxShadow: homeV2.shadow.sticker,
    transform: [{ rotate: homeV2.tilt.weather }],
  },
  image: { width: "100%", height: "100%", backgroundColor: homeV2.color.card },
});
