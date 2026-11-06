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
/** SE 처럼 낮은 화면은 칸을 다 채운다 — 바바가 커지는 만큼 말풍선을 내리지 않아 말풍선이 함께 올라간다 */
const SHORT_SCREEN = { below: 700, fill: 1 } as const;
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

/** 말풍선 윤곽의 그림 폭(`viewBox` 왼쪽 끝 · 폭)과 꼬리 끝이 갈 수 있는 범위 */
const BUBBLE_VIEW = { left: -4, top: -4, width: 228, height: 148 } as const;
/** 꼬리 끝이 갈 수 있는 범위 — 가로와 세로(꼬리 길이). 세로 `min` 은 머리가 말풍선까지 올라온 작은 화면의 짧은 꼬리다 */
const TAIL_TIP = { minX: 150, maxX: 190, fallbackX: 175, minY: 118, maxY: 139 } as const;
const TAIL_BASE_Y = 107;
/** 말풍선 아래로 내려오는 종이 높이 — `bubblePaper` 의 `bottom` 과 같은 값이다 */
const BUBBLE_PAPER_DROP = 22;
/** 바바가 앉는 기준선에서 귀 사이 머리 윗선까지의 높이(배율 1 기준 · 그림에서 잰 값) */
const BABA_HEAD_TOP = 147;
/** 꼬리 끝과 머리 사이를 이만큼 띄운다 */
const TAIL_HEAD_GAP = 8;

/**
 * 말풍선 윤곽 — 꼬리 끝을 (`tipX`, `tipY`)에 둔다. 말풍선은 왼쪽에 붙고 바바는 가운데에 앉아서 화면 폭 ·
 * 글씨 크기마다 둘의 거리가 달라진다. 꼬리를 고정하면 끝이 귀나 얼굴 위에 얹히므로 귀 사이 머리 위로 맞춘다.
 */
function bubbleOutline(tipX: number, tipY: number) {
  const y = (ratio: number) => TAIL_BASE_Y + (tipY - TAIL_BASE_Y) * ratio;
  return `M28 22 C55 12 77 0 106 5 C129 9 153 9 178 13 C210 14 219 34 216 58 C214 82 ${tipX + 18} 102 ${tipX - 8} 106 C${tipX - 7} ${y(0.35)} ${tipX - 5} ${y(0.72)} ${tipX} ${tipY} C${tipX - 17} ${y(0.69)} ${tipX - 30} ${y(0.34)} ${tipX - 39} 108 C${tipX - 49} 106 118 111 108 111 C78 110 50 106 29 103 C10 100 5 79 4 62 C2 47 11 35 28 22 Z`;
}

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
  const [bubbleBox, setBubbleBox] = useState({ x: 0, width: 0, height: 0 });
  const [talkHeight, setTalkHeight] = useState(0);
  const sceneHeight = scene.height;
  const { height: windowHeight } = useWindowDimensions();
  const babaFill = windowHeight < SHORT_SCREEN.below ? SHORT_SCREEN.fill : BABA_FILL;
  const babaScale =
    sceneHeight === 0
      ? BABA_SCALE.fallback
      : Math.min(
          BABA_SCALE.max,
          Math.max(BABA_SCALE.min, (babaFill * (sceneHeight + BUBBLE_OVERLAP)) / BABA_VISIBLE),
        );
  // 바바가 최대 크기에 걸려 남는 높이만큼 말풍선을 내린다 — 꼬리가 늘 얼굴에 닿게. 자리는 그대로라 배치가 다시 돌지 않는다
  const bubbleDrop =
    sceneHeight === 0 ? 0 : Math.max(0, sceneHeight + BUBBLE_OVERLAP - BABA_VISIBLE * babaScale);
  const bubbleOffset = bubbleDrop + (extra > 0 ? 0 : BUBBLE_NUDGE);
  // 바바는 장면 가운데에 앉는다 — 그 자리를 말풍선 그림의 좌표로 옮겨 꼬리 끝을 귀 사이 머리 위에 둔다
  const measured = bubbleBox.width > 0 && scene.width > 0;
  const tailX = measured
    ? BUBBLE_VIEW.left + ((scene.width / 2 - bubbleBox.x) / bubbleBox.width) * BUBBLE_VIEW.width
    : TAIL_TIP.fallbackX;
  const headTop = talkHeight + sceneHeight - BABA_HEAD_TOP * babaScale;
  const tailY = measured
    ? BUBBLE_VIEW.top +
      ((headTop - TAIL_HEAD_GAP - bubbleOffset) / (bubbleBox.height + BUBBLE_PAPER_DROP)) *
        BUBBLE_VIEW.height
    : TAIL_TIP.maxY;
  const bubblePath = bubbleOutline(
    Math.min(TAIL_TIP.maxX, Math.max(TAIL_TIP.minX, tailX)),
    Math.min(TAIL_TIP.maxY, Math.max(TAIL_TIP.minY, tailY)),
  );
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

      <View
        style={styles.talk}
        onLayout={(event) => setTalkHeight(event.nativeEvent.layout.height)}
      >
        <View
          testID="studio-home-bubble"
          onLayout={({ nativeEvent: { layout } }) =>
            setBubbleBox({ x: layout.x, width: layout.width, height: layout.height })
          }
          style={[
            styles.bubble,
            {
              minWidth: 214 + 120 * extra,
              borderRadius: design["home.bubble.borderRadius"],
              paddingHorizontal: design["home.bubble.paddingHorizontal"],
              transform: [{ translateY: bubbleOffset }, { rotate: homeV2.tilt.bubble }],
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
                d={bubblePath}
                transform="translate(0 3)"
                fill={homeV2.color.shadow}
                opacity={0.09}
              />
              <Path
                d={bubblePath}
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
export function ReflectionButton({
  color,
  onPress,
  label = "일기 작성하기",
  testID = "studio-home-cta",
  compact = false,
}: {
  color: string;
  onPress: () => void;
  label?: string;
  testID?: string;
  /** 줄 안에 놓는 작은 라벨(쉼터 바람카드의 「했어요」) — 기본은 화면 폭 전체다 */
  compact?: boolean;
}) {
  const gridId = `label-grid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.cta, compact ? styles.ctaCompact : null]}
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
            style={[
              styles.ctaFace,
              compact ? styles.ctaFaceCompact : null,
              pressed ? styles.ctaFacePressed : null,
            ]}
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
            <Text
              style={[styles.ctaText, compact ? styles.ctaTextCompact : null]}
              color={homeV2.color.white}
            >
              {label}
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
  bubblePaper: { ...StyleSheet.absoluteFill, bottom: -BUBBLE_PAPER_DROP },
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
  ctaCompact: { marginTop: 0, marginHorizontal: 0 },
  ctaFaceCompact: { minHeight: 44, paddingHorizontal: 22 },
  ctaTextCompact: { fontSize: 18, lineHeight: 24 },
  ctaText: {
    fontFamily: homeV2.font.bold,
    fontSize: CTA.fontSize,
    lineHeight: CTA.lineHeight,
    textAlign: "center",
  },
});
