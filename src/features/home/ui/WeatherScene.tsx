import { Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { CHARACTERS } from "@/components/icons/characters";
import { AppText } from "@/components/primitives/AppText";
import {
  paperColors,
  paperHomeCard,
  paperRadius,
  paperSceneFill,
  paperTypography,
  paperWeatherOf,
} from "@/design/paper";

/**
 * 홈의 날씨 씬 — `docs/design/prototype/홈.dc.html` 의 320px 씬.
 *
 * 하늘 그라디언트 → 구름·해/달/비 → **언덕 셋** → 카피바라(우) · 병아리(좌).
 * 병아리는 장식이 아니라 **회고로 가는 문**이다(`docs/design/app-flow.md` §1 —
 * 「홈 ─ 병아리 탭 ─▶ 하루 회고」). 그래서 병아리와 말풍선이 한 덩어리로 눌린다.
 *
 * 시안과 다른 것 둘:
 * 1. **말풍선이 두 줄이다.** 시안은 한 줄 인사(「일찍 쓰러 가요」)지만, 회고 진입이
 *    줄에서 병아리로 옮겨오면서 갈 곳과 시각(`12.md` 「정한 시각만 말한다」)을
 *    말할 자리가 여기뿐이다. 뜻 모를 새를 누르게 두지 않는다
 * 2. **글자색이 날씨마다 다르다** — 시안의 단일 `#5C7C8A` 는 네 하늘 전부 AA 미달이고
 *    밤 하늘에서는 어두운 글자가 아예 읽히지 않는다(`paper.ts` `paperWeather`)
 *
 * 비의 빗줄기 애니메이션은 아직 없다 — 정지 상태로 그린다(`PLAN.md` Phase 5).
 */
export const SCENE_HEIGHT = 260;

// 언덕 셋 — 시안의 `left:-30;right:-30` · `bottom:-92/-96/-104` · `height:190/160/130`
// 을 타원(cy·ry)으로 옮긴 값. 봉우리가 씬 바닥에서 98 · 64 · 26 위에 선다
const HILLS = [
  { color: paperColors.bg.hillHomeTop, cy: SCENE_HEIGHT - 3, ry: 95 },
  { color: paperColors.bg.hillHomeMid, cy: SCENE_HEIGHT + 16, ry: 80 },
  { color: paperColors.bg.hillHome, cy: SCENE_HEIGHT + 39, ry: 65 },
];

const CAPYBARA = { width: 110, ratio: 941 / 677 };
const CHICK = { width: 67, ratio: 673 / 589 };

type Props = {
  /** 「맑음」 「흐림」 「비」 「밤」 — 모르는 값이면 맑음으로 그린다 */
  weatherLabel: string;
  /** 말풍선 첫 줄 — 회고로 가는 문의 이름 */
  bubbleTitle: string;
  /** 둘째 줄 — 정한 시각이 있을 때만 그 시각을 말한다 */
  bubbleCaption: string;
  onRetroPress: () => void;
};

export function WeatherScene({ weatherLabel, bubbleTitle, bubbleCaption, onRetroPress }: Props) {
  const { width } = useWindowDimensions();
  const sky = paperWeatherOf(weatherLabel);
  // 언덕은 화면보다 넓다 — 그래야 곡률이 완만해진다(시안 좌우 -30)
  const hillRx = (width + 60) / 2;

  return (
    <View style={styles.scene} pointerEvents="box-none">
      <Svg
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Defs>
          <LinearGradient id="homeSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky.top2} />
            <Stop offset="0.62" stopColor={sky.sky} />
            <Stop offset="1" stopColor={sky.sky} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#homeSky)" />

        {weatherLabel === "밤" ? (
          // 초승달 — 원 하나를 하늘색 원으로 깎아 만든다
          <>
            <Circle cx={width - 62} cy={62} r={24} fill={paperSceneFill.moon} />
            <Circle cx={width - 52} cy={54} r={22} fill={sky.top2} />
          </>
        ) : weatherLabel === "흐림" || weatherLabel === "비" ? null : (
          <Circle cx={width - 62} cy={62} r={26} fill={paperSceneFill.sun} />
        )}

        {/* 구름 — 시안의 알약 + 원 둘. 시안(씬 320)보다 씬이 낮아 그대로 두면
            말풍선이 구름을 덮는다 — 시안의 구름·말풍선 간격(49)이 남게 올렸다 */}
        <Rect x={24} y={40} width={74} height={26} rx={13} fill={paperSceneFill.cloud} />
        <Circle cx={56} cy={48} r={20} fill={paperSceneFill.cloud} />
        <Circle cx={80} cy={51} r={16} fill={paperSceneFill.cloud} />

        {weatherLabel === "비" ? (
          <Path
            d="M40 75l-4 12M58 77l-4 12M76 75l-4 12"
            stroke={paperSceneFill.rain}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ) : null}

        {HILLS.map((h) => (
          <Ellipse key={h.color} cx={width / 2} cy={h.cy} rx={hillRx} ry={h.ry} fill={h.color} />
        ))}
      </Svg>

      <Image
        source={CHARACTERS.capybara}
        resizeMode="contain"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.capybara,
          { width: CAPYBARA.width, height: CAPYBARA.width * CAPYBARA.ratio },
        ]}
      />

      {/* 병아리 + 말풍선이 한 덩어리로 회고를 연다 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={bubbleTitle}
        accessibilityHint={bubbleCaption}
        onPress={onRetroPress}
        style={styles.retro}
      >
        <View style={styles.bubble}>
          <AppText weight="700" style={styles.bubbleTitle}>
            {bubbleTitle}
          </AppText>
          <AppText style={styles.bubbleCaption}>{bubbleCaption}</AppText>
          {/* 꼬리 — 45° 돌린 사각형의 두 변만 남긴다. 아래 병아리를 가리킨다 */}
          <View style={styles.bubbleTail} />
        </View>
        <Image
          source={CHARACTERS.chick}
          resizeMode="contain"
          style={{ width: CHICK.width, height: CHICK.width * CHICK.ratio }}
        />
      </Pressable>
    </View>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  scene: { height: SCENE_HEIGHT, overflow: "hidden" },
  capybara: { position: "absolute", right: 24, bottom: 24 },
  retro: { position: "absolute", left: 24, bottom: 24, alignItems: "flex-start", gap: 8 },
  bubble: {
    maxWidth: 210,
    backgroundColor: paperColors.bg.card,
    borderRadius: paperRadius.card,
    paddingVertical: 8,
    paddingHorizontal: 13,
    gap: 2,
    borderWidth: paperHomeCard.borderWidth,
    borderColor: paperHomeCard.borderColor,
    ...paperHomeCard.shadow,
  },
  bubbleTitle: {
    fontSize: type.cardTitle.fontSize,
    lineHeight: type.cardTitle.lineHeight,
    color: paperColors.text.primaryHome,
  },
  bubbleCaption: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },
  bubbleTail: {
    position: "absolute",
    left: 26,
    bottom: -6,
    width: 11,
    height: 11,
    backgroundColor: paperColors.bg.card,
    borderRightWidth: paperHomeCard.borderWidth,
    borderBottomWidth: paperHomeCard.borderWidth,
    borderColor: paperHomeCard.borderColor,
    transform: [{ rotate: "45deg" }],
  },
});
