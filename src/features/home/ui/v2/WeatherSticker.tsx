import { Image } from "expo-image";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

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
 * 크기 · 기울기는 홈 v2 시안의 Lab 번역(`HomeView.tsx` 의 `weatherSticker`)을 따르고,
 * 색 · 그림자 · 기울기는 `homeV2` 토큰이다.
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
      <View pointerEvents="none" style={styles.tape} />
    </Pressable>
  );
}

/** 「날씨: 맑음 22도」 — 기온이 없으면 「날씨: 맑음」 */
export function weatherAccessibilityLabel({ label, temperatureC }: HomeWeatherView): string {
  return temperatureC == null ? `날씨: ${label}` : `날씨: ${label} ${temperatureC}도`;
}

const styles = StyleSheet.create({
  sticker: {
    width: 96,
    height: 106,
    padding: 7,
    paddingBottom: 18,
    backgroundColor: homeV2.color.white,
    boxShadow: homeV2.shadow.sticker,
    transform: [{ rotate: homeV2.tilt.weather }],
  },
  image: { width: "100%", height: "100%", backgroundColor: homeV2.color.card },
  tape: {
    position: "absolute",
    left: 26,
    top: -8,
    width: 44,
    height: 16,
    backgroundColor: homeV2.color.weatherTape,
    opacity: 0.85,
    transform: [{ rotate: homeV2.tilt.weatherTape }],
  },
});
