import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { Text, useEffectiveFontScale } from "@/components/ds/Text";
import { homeV2 } from "@/design/ds";
import { approvedDesign, type StudioDesign } from "@/design/studioDesign";

import { Baba } from "./Baba";
import { Rug } from "./Rug";
import { ScallopedSticker } from "./ScallopedSticker";
import type { HomeWeatherView } from "./types";
import { WeatherSticker } from "./WeatherSticker";
import { weatherStickerForKey } from "./weatherStickers";

/** 홈 v2 히어로 — 말풍선 · 날씨 스티커 · 바바 · 일기 작성하기. */
type Props = {
  design?: StudioDesign;
  weather: HomeWeatherView | null;
  onStartReflection: () => void;
  onOpenWeatherInfo: () => void;
};

/** 녹색 체크무늬 테이프 — 사용자 요청으로 104 × 28로 확대 */
const TAPE = { width: 104, height: 28 } as const;
const BABA_RIGHT = 16;
const RUG_WIDTH = 184;

const BUBBLE_OUTLINE =
  "M28 22 C55 12 77 0 106 5 C129 9 153 9 178 13 C210 14 219 34 216 58 C214 78 198 90 199 106 C201 119 207 132 215 139 C193 129 179 119 169 109 C145 104 134 112 108 111 C78 110 50 106 29 103 C10 100 5 79 4 62 C2 47 11 35 28 22 Z";

export function HeroCard({
  design = approvedDesign,
  weather,
  onStartReflection,
  onOpenWeatherInfo,
}: Props) {
  const fontScale = useEffectiveFontScale();
  const scale = fontScale;
  const extra = Math.max(0, scale - 1);
  const visibleWeather = weather != null && weatherStickerForKey(weather.stickerKey) != null;

  return (
    <View
      testID="studio-home-hero"
      style={[
        styles.hero,
        {
          // 글씨가 커지면 말풍선 아래의 버튼 자리도 함께 확보한다.
          paddingTop: 162 + 163 * extra,
          backgroundColor: design["home.hero.backgroundColor"],
          borderRadius: design["home.hero.borderRadius"],
        },
      ]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.tape}
      >
        <MaskingTape color={homeV2.color.tapeBase} stripeColor={homeV2.color.tapeStripe} />
      </View>

      <View
        testID="studio-home-bubble"
        style={[
          styles.bubble,
          {
            minWidth: 188 + 120 * extra,
            borderRadius: design["home.bubble.borderRadius"],
            paddingHorizontal: design["home.bubble.paddingHorizontal"],
          },
        ]}
      >
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.bubblePaper}
        >
          <Svg width="100%" height="100%" viewBox="-4 -4 228 148" preserveAspectRatio="none">
            <Path
              d={BUBBLE_OUTLINE}
              transform="translate(0 3)"
              fill={homeV2.color.shadow}
              opacity={0.09}
            />
            <Path
              d={BUBBLE_OUTLINE}
              fill={design["home.bubble.backgroundColor"]}
              stroke={homeV2.color.bubbleBorder}
              strokeWidth={1.8}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </Svg>
        </View>
        <Text
          testID="studio-home-bubble-text"
          style={[
            styles.bubbleText,
            {
              fontSize: design["home.bubbleText.fontSize"],
              lineHeight: design["home.bubbleText.fontSize"] + 4,
              fontFamily: design["home.bubbleText.fontFamily"],
              textAlign: design["home.bubbleText.textAlign"] as "left" | "center" | "right",
              letterSpacing: design["home.bubbleText.letterSpacing"],
            },
          ]}
          color={design["home.bubbleText.color"]}
        >
          {"오늘 하루는\n어땠어요?"}
        </Text>
      </View>

      {visibleWeather ? (
        <View testID="home-v2-weather" style={styles.weather}>
          <WeatherSticker weather={weather} onPress={onOpenWeatherInfo} />
        </View>
      ) : null}

      <View
        testID="home-v2-rug"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.ground}
      >
        <Rug />
      </View>
      <View testID="studio-home-baba" style={styles.baba}>
        <Baba />
      </View>

      <Pressable
        testID="studio-home-cta"
        accessibilityRole="button"
        accessibilityLabel="일기 작성하기"
        onPress={onStartReflection}
        style={[
          styles.cta,
          {
            paddingHorizontal: design["home.cta.paddingHorizontal"],
          },
        ]}
      >
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        >
          <ScallopedSticker color={design["home.cta.backgroundColor"]} />
        </View>
        <Text
          style={[styles.ctaText, { lineHeight: homeV2.type.cta.lineHeight }]}
          color={homeV2.color.white}
        >
          일기 작성하기
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: homeV2.size.hero.height,
    marginTop: homeV2.size.hero.marginTop,
    borderRadius: homeV2.size.hero.radius,
    backgroundColor: homeV2.color.card,
    boxShadow: homeV2.shadow.hero,
  },
  tape: {
    position: "absolute",
    left: 134,
    top: -14,
    width: TAPE.width,
    height: TAPE.height,
    transform: [{ rotate: homeV2.tilt.tape }],
  },
  bubble: {
    position: "absolute",
    left: 18,
    top: 24,
    paddingTop: 22,
    paddingBottom: 26,
    paddingHorizontal: 18,
    borderRadius: 22,
    transform: [{ rotate: homeV2.tilt.bubble }],
    zIndex: 2,
  },
  bubbleText: {
    fontFamily: homeV2.font.bold,
    ...homeV2.type.bubble,
    transform: [{ translateY: 2 }],
  },
  weather: { position: "absolute", top: -13, right: 14, alignItems: "center", zIndex: 3 },
  bubblePaper: { ...StyleSheet.absoluteFill, bottom: -22 },
  ground: {
    position: "absolute",
    right: BABA_RIGHT + (homeV2.size.baba.width - RUG_WIDTH) / 2,
    bottom: 5,
    width: RUG_WIDTH,
    height: 62,
    transform: [{ rotate: homeV2.tilt.ground }],
  },
  baba: { position: "absolute", right: BABA_RIGHT, bottom: -22, zIndex: 1 },
  cta: {
    alignSelf: "flex-start",
    marginLeft: 18,
    marginTop: 10,
    marginBottom: 44,
    minHeight: homeV2.size.cta.height,
    paddingHorizontal: 20,
    minWidth: 164,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  ctaText: { fontFamily: homeV2.font.bold, ...homeV2.type.cta, textAlign: "center" },
});
