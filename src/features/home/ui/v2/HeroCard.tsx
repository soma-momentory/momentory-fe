import { useId, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, Path, Pattern } from "react-native-svg";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { Text, useEffectiveFontScale } from "@/components/ds/Text";
import { homeV2, raisedShadow } from "@/design/ds";
import { approvedDesign, type StudioDesign } from "@/design/studioDesign";

import { Baba } from "./Baba";
import { Rug } from "./Rug";
import type { HomeWeatherView } from "./types";
import { WeatherSticker } from "./WeatherSticker";
import { weatherStickerForKey } from "./weatherStickers";

/**
 * 홈 v2 히어로 — **홈의 주인공**(2026-11-03 · 시안 4). 면을 그리지 않는다 — **홈 배경 자체가 카드 한 장**이고
 * 이건 그 위의 장면이다.
 *
 * 위에서 아래로 칸반 보드(일정 · 감정) → 말풍선과 날씨 → 바바 → **전체 폭 「일기 작성하기」** 다 — 눈이
 * 말풍선 → 바바 → 버튼으로 내려와 엄지가 닿는 곳에서 끝난다. 바바를 가리는 것은 없다.
 * 말풍선 꼬리는 바바 얼굴로 이어지고, 바바는 가운데 칸의 높이만큼 커진다.
 * 날씨 사진은 테이프로 붙는다 — 못 얻으면 테이프째 숨긴다(HW-4).
 */
type Props = {
  design?: StudioDesign;
  weather: HomeWeatherView | null;
  onStartReflection: () => void;
  onOpenWeatherInfo: () => void;
  /** 맨 위의 칸반 보드. 화면이 낮으면 `compact` 로 낮게, 그래도 모자라면 `headOnly` 로 머리만 그린다 */
  board?: (compact: boolean, headOnly: boolean) => ReactNode;
};

/** 바바 배율의 범위 — 재어 본 가운데 칸 높이에 맞춘다 */
const BABA_SCALE = { min: 0.7, max: 1.7, fallback: 1.2 } as const;
/** 가운데 칸을 다 채우지 않고 이만큼만 채운다 — 위아래로 숨 쉴 자리를 둔다 */
const BABA_FILL = 0.86;
/** 바바 캔버스(170 × 227)에서 몸이 차지하는 높이 · 몸 아래 투명 여백 */
const BABA_VISIBLE = 168;
const BABA_CANVAS_BOTTOM = 35;
/** 말풍선 꼬리가 바바 얼굴로 이어지도록 머리를 말풍선 아래까지 올린다 */
const BUBBLE_OVERLAP = 28;
/** 말풍선을 바바 쪽으로 조금 더 내린다 — 머리 위에 말이 얹힌 느낌 */
const BUBBLE_NUDGE = 8;
/** 바닥 — 바바보다 넉넉히 넓어야 안정적으로 앉아 보인다 */
const RUG = { width: 184, height: 62, edge: 6, grow: 1.14 } as const;
/**
 * 히어로가 이보다 낮으면 보드를 낮게 그린다. 보드 높이에 따라 달라지지 않는 히어로 전체 높이로
 * 판단한다 — 가운데 칸으로 판단하면 낮춘 만큼 칸이 커져 판단이 되돌아간다.
 */
const COMPACT_BELOW = 540;
/** 작은 화면 + 큰 글씨 — 주 버튼이 탭바에 잘리지 않게 보드는 머리만 남긴다. 창 높이라 판단이 되돌아가지 않는다 */
const HEAD_ONLY = { below: 700, fontScale: 1.3 } as const;
const CTA = { height: 62, fontSize: 24, lineHeight: 30, depth: 3 } as const;
/** 날씨 사진 — 글씨가 커지면 말풍선에 자리를 내주려고 조금 줄인다 */
const WEATHER = { width: 104, height: 118, shrink: 56 } as const;
/** 손으로 오린 라벨의 윤곽과 그 안쪽 바느질 */
const LABEL_OUTLINE =
  "M14 4 C70 1 130 5 190 3 C250 1 300 4 336 4 C346 5 348 14 347 24 C346 36 349 48 346 56 C344 62 336 62 326 62 C260 64 190 61 120 63 C80 64 40 62 16 62 C6 61 3 54 3 44 C2 32 4 20 4 12 C5 7 8 4 14 4 Z";
const LABEL_STITCH =
  "M20 11 C80 9 140 12 195 10 C250 9 295 11 328 11 C338 12 340 18 340 27 C339 37 341 46 338 50 C336 54 330 55 322 55 C260 56 190 54 122 56 C82 56 44 55 22 55 C13 54 11 49 11 41 C10 32 12 24 12 18 C13 13 15 11 20 11 Z";

const BUBBLE_OUTLINE =
  "M28 22 C55 12 77 0 106 5 C129 9 153 9 178 13 C210 14 219 34 216 58 C214 78 198 90 199 106 C201 119 207 132 215 139 C193 129 179 119 169 109 C145 104 134 112 108 111 C78 110 50 106 29 103 C10 100 5 79 4 62 C2 47 11 35 28 22 Z";

export function HeroCard({
  design = approvedDesign,
  weather,
  onStartReflection,
  onOpenWeatherInfo,
  board,
}: Props) {
  const fontScale = useEffectiveFontScale();
  const extra = Math.max(0, fontScale - 1);
  const [heroHeight, setHeroHeight] = useState(0);
  const [scene, setScene] = useState({ width: 0, height: 0 });
  const sceneHeight = scene.height;
  const babaScale =
    sceneHeight === 0
      ? BABA_SCALE.fallback
      : Math.min(
          BABA_SCALE.max,
          Math.max(BABA_SCALE.min, (BABA_FILL * (sceneHeight + BUBBLE_OVERLAP)) / BABA_VISIBLE),
        );
  // 바바가 최대 크기에 걸려 남는 높이만큼 말풍선을 내린다 — 꼬리가 늘 얼굴에 닿게. 자리는 그대로라 배치가 다시 돌지 않는다
  const bubbleDrop =
    sceneHeight === 0 ? 0 : Math.max(0, sceneHeight + BUBBLE_OVERLAP - BABA_VISIBLE * babaScale);
  const { height: windowHeight } = useWindowDimensions();
  const headOnly = fontScale > HEAD_ONLY.fontScale && windowHeight < HEAD_ONLY.below;
  const compact = fontScale > 1.2 || (heroHeight > 0 && heroHeight < COMPACT_BELOW);
  // 러그는 바바 가운데에 맞추되 화면 밖으로 잘리지 않을 만큼만 넓힌다
  const rugWidth = Math.min(
    RUG.width * RUG.grow * babaScale,
    Math.max(0, scene.width - RUG.edge * 2),
  );
  const visibleWeather = weather != null && weatherStickerForKey(weather.stickerKey) != null;
  const bubbleSize = design["home.bubbleText.fontSize"] + 3;
  const weatherWidth = WEATHER.width - WEATHER.shrink * extra;

  return (
    <View
      testID="studio-home-hero"
      style={styles.hero}
      onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}
    >
      {board != null ? (
        <View testID="home-v2-board" style={styles.board}>
          {board(compact, headOnly)}
        </View>
      ) : null}

      <View style={styles.talk}>
        <View
          testID="studio-home-bubble"
          style={[
            styles.bubble,
            {
              minWidth: 214 + 120 * extra,
              borderRadius: design["home.bubble.borderRadius"],
              paddingHorizontal: design["home.bubble.paddingHorizontal"],
              transform: [
                { translateY: bubbleDrop + (extra > 0 ? 0 : BUBBLE_NUDGE) },
                { rotate: homeV2.tilt.bubble },
              ],
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
                fontSize: bubbleSize,
                lineHeight: bubbleSize + 4,
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
            <WeatherSticker
              weather={weather}
              onPress={onOpenWeatherInfo}
              style={{
                width: weatherWidth,
                height: (weatherWidth * WEATHER.height) / WEATHER.width,
              }}
            />
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.tape}
            >
              <MaskingTape color={homeV2.color.tapeBase} stripeColor={homeV2.color.tapeStripe} />
            </View>
          </View>
        ) : null}
      </View>

      <View
        testID="home-v2-scene"
        style={styles.scene}
        onLayout={({ nativeEvent: { layout } }) =>
          setScene({ width: layout.width, height: layout.height })
        }
      >
        <View
          testID="home-v2-rug"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.ground,
            {
              left: (scene.width - rugWidth) / 2,
              width: rugWidth,
              height: (rugWidth * RUG.height) / RUG.width,
            },
          ]}
        >
          <Rug />
        </View>
        <View
          testID="studio-home-baba"
          pointerEvents="none"
          style={[styles.baba, { bottom: 8 - BABA_CANVAS_BOTTOM * babaScale }]}
        >
          <Baba scale={babaScale} />
        </View>
      </View>

      <ReflectionButton color={design["home.cta.backgroundColor"]} onPress={onStartReflection} />
    </View>
  );
}

/**
 * 화면의 유일한 주 버튼 — **오려 붙인 천 라벨**이다. 말풍선처럼 손으로 그린 윤곽에 옛 스티커의 격자와
 * 점선 바느질을 얹어 다꾸 페이지와 어울리게 했다. 초록 면 + 흰 글자는 대비 기준 그대로다.
 * 아래에 같은 윤곽을 짙은 초록으로 깔았고, 누르면 면이 내려앉는다. 바깥 상자는 그대로라 자리가 밀리지 않는다.
 */
function ReflectionButton({ color, onPress }: { color: string; onPress: () => void }) {
  const gridId = `label-grid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Pressable
      testID="studio-home-cta"
      accessibilityRole="button"
      accessibilityLabel="일기 작성하기"
      onPress={onPress}
      style={styles.cta}
    >
      {({ pressed }) => (
        <>
          <View pointerEvents="none" style={styles.ctaDepth}>
            <Svg width="100%" height="100%" viewBox="0 0 350 66" preserveAspectRatio="none">
              <Path d={LABEL_OUTLINE} fill={raisedShadow.grass} />
            </Svg>
          </View>
          <View
            testID="home-v2-cta-face"
            style={[styles.ctaFace, pressed ? styles.ctaFacePressed : null]}
          >
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={StyleSheet.absoluteFill}
            >
              <Svg width="100%" height="100%" viewBox="0 0 350 66" preserveAspectRatio="none">
                <Defs>
                  <Pattern id={gridId} patternUnits="userSpaceOnUse" width={12} height={12}>
                    <Path
                      d="M0 12 V0 H12"
                      fill="none"
                      stroke={homeV2.color.white}
                      strokeOpacity={0.16}
                      strokeWidth={0.7}
                    />
                  </Pattern>
                </Defs>
                <Path d={LABEL_OUTLINE} fill={color} />
                <Path d={LABEL_OUTLINE} fill={`url(#${gridId})`} />
                <Path
                  d={LABEL_STITCH}
                  fill="none"
                  stroke={homeV2.color.white}
                  strokeOpacity={0.6}
                  strokeWidth={1.4}
                  strokeDasharray="7 6"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </Svg>
            </View>
            <Text style={styles.ctaText} color={homeV2.color.white}>
              일기 작성하기
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1 },
  board: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    // 요일 테이프가 머리 칸보다 아래로 내려온 만큼 비운다
    marginTop: 30,
    marginHorizontal: 22,
  },
  // 말풍선과 날씨가 한 줄에 선다 — 말풍선 꼬리는 그 아래 바바에게 내려간다
  talk: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 10,
    paddingLeft: 20,
    paddingRight: 12,
    zIndex: 3,
  },
  bubble: {
    paddingTop: 26,
    paddingBottom: 30,
    paddingHorizontal: 18,
    borderRadius: 22,
  },
  bubbleText: {
    fontFamily: homeV2.font.bold,
    ...homeV2.type.bubble,
    transform: [{ translateY: 2 }],
  },
  bubblePaper: { ...StyleSheet.absoluteFill, bottom: -22 },
  weather: { marginTop: 22 },
  // 날씨 사진의 위쪽 가운데에 붙인다 — 사진과 같은 쪽으로 조금 기운다
  tape: {
    position: "absolute",
    alignSelf: "center",
    top: -11,
    width: 82,
    height: 24,
    transform: [{ rotate: "4deg" }],
  },
  scene: { flex: 1, minHeight: 104, marginTop: 8 },
  ground: {
    position: "absolute",
    bottom: 0,
    transform: [{ rotate: homeV2.tilt.ground }],
  },
  baba: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  cta: {
    marginTop: 14,
    marginHorizontal: 16,
    paddingBottom: CTA.depth,
    transform: [{ rotate: "-0.6deg" }],
  },
  // 바깥 상자의 아래 여백이 곧 그림자 깊이다 — 면과 같은 윤곽을 깊이만큼 아래에 깐다
  ctaDepth: { ...StyleSheet.absoluteFill, top: CTA.depth, bottom: 0 },
  ctaFace: {
    minHeight: CTA.height,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaFacePressed: { transform: [{ translateY: CTA.depth }] },
  ctaText: {
    fontFamily: homeV2.font.bold,
    fontSize: CTA.fontSize,
    lineHeight: CTA.lineHeight,
    textAlign: "center",
  },
});
