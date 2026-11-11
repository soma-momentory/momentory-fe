import { Image } from "expo-image";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { homeV2 } from "@/design/ds";

import type { HomeWeatherView } from "./types";
import { WEATHER_FALLBACK_PHOTO, weatherStickerForKey } from "./weatherStickers";

/**
 * 홈 v2 히어로의 **날씨 스티커**(P4 · 계획 §4.5 · HW-4 · HW-5).
 *
 * - **사진 틀은 늘 있다**(2026-11-11 사용자 요청 — HW-4 「틀째 숨김」을 바꿨다). `weather` 가 없거나 그림이 없는
 *   열쇠면 날씨를 말하지 않는 기본 사진(`WEATHER_FALLBACK_PHOTO`)을 넣는다 — 문구는 없고, 눌리지 않으며
 *   (갈 곳이 없다) 낭독기에서 숨는다(장식). 날씨를 받으면 그 그림으로 바뀐다.
 * - 날씨가 있을 때 누르면 출처 · 갱신 시각 시트(`WeatherCreditSheet`)를 여는 것은 부르는 쪽 몫이다(`onPress`).
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
  const sticker = weather == null ? null : weatherStickerForKey(weather.stickerKey);
  if (weather == null || sticker == null) {
    return (
      <View
        testID="home-v2-weather-fallback"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.sticker, style]}
      >
        <Image source={WEATHER_FALLBACK_PHOTO} contentFit="cover" style={styles.image} />
      </View>
    );
  }

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
