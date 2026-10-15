import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { Text } from "@/components/ds/Text";
import { homeV2, maxFontScale } from "@/design/ds";
import { formatKoreanTime } from "@/lib/time";

import { Baba } from "./Baba";
import type { HomeWeatherView } from "./types";

/**
 * 홈 v2 의 **히어로 카드** — 말풍선 · 리마인더 · 바바 · 「하루 돌아보기」(시안 `HeroCard` · HD-6).
 *
 * ## 문안 (계획 §2.2)
 *
 * - 말풍선 「오늘 하루는 / 어땠어요?」 — v2
 * - 리마인더는 **설정 시각으로 만든다** — 「{밤 9:30}엔 제가 / 먼저 말 걸어요」. v2 시안은 「밤 9:30」을
 *   하드코딩했지만 운영은 `formatKoreanTime` 을 지난다. 하드 줄바꿈은 **시각 뒤에만** 둔다
 * - 알림을 끄면 「편할 때 언제든 돌아볼 수 있어요」(`12.md`) — 줄바꿈은 글자 폭에 맡긴다
 * - 「하루 돌아보기 ›」 — 화면의 **유일한 주 CTA**. `›` 는 장식이라 접근성 이름은 「하루 돌아보기」다
 *
 * ## 날씨 자리 (P4)
 *
 * `weather` 가 `null` 이면 **스티커 자리를 그리지 않는다** — 빈 틀도 문구도 없다(HW-4 와 같은 모양).
 * P2 는 늘 `null` 이다. 스티커(`WeatherSticker`)와 그림은 P4 가 더한다(결정 D4 — 그림은 그때 승격).
 */
type Props = {
  retroReminderTime: string | null;
  weather: HomeWeatherView | null;
  onStartReflection: () => void;
};

/** 녹색 체크무늬 테이프 한 장 — 시안의 92 × 24 */
const TAPE = { width: 92, height: 24, cell: 6, pitch: 12 } as const;

export function HeroCard({ retroReminderTime, onStartReflection }: Props) {
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, maxFontScale);
  const extra = Math.max(0, scale - 1);
  const note =
    retroReminderTime != null
      ? `${formatKoreanTime(retroReminderTime)}엔 제가\n먼저 말 걸어요`
      : "편할 때 언제든 돌아볼 수 있어요";

  return (
    <View style={[styles.hero, { height: homeV2.size.hero.height + 90 * extra }]}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.tape}
      >
        <Svg width={TAPE.width} height={TAPE.height}>
          <Rect width={TAPE.width} height={TAPE.height} fill={homeV2.color.tapeBase} />
          {Array.from({ length: TAPE.width / TAPE.pitch + 1 }, (_, i) => (
            <Rect
              key={`c${i}`}
              x={i * TAPE.pitch}
              width={TAPE.cell}
              height={TAPE.height}
              fill={homeV2.color.tapeStripe}
            />
          ))}
          {[0, TAPE.pitch].map((y) => (
            <Rect
              key={`r${y}`}
              y={y}
              width={TAPE.width}
              height={TAPE.cell}
              fill={homeV2.color.tapeStripe}
            />
          ))}
        </Svg>
      </View>

      <View style={[styles.bubble, { minWidth: 150 + 150 * extra }]}>
        <Text
          style={[styles.bubbleText, { lineHeight: homeV2.type.bubble.lineHeight * scale }]}
          color={homeV2.color.ink}
        >
          {"오늘 하루는\n어땠어요?"}
        </Text>
        <View style={styles.bubbleTail} />
      </View>

      <Text
        style={[
          styles.note,
          {
            top: 128 + 60 * extra,
            lineHeight: homeV2.type.note.lineHeight * scale,
          },
        ]}
        color={homeV2.color.muted}
      >
        {note}
      </Text>

      <View pointerEvents="none" style={styles.ground} />
      <View style={styles.baba}>
        <Baba />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="하루 돌아보기"
        onPress={onStartReflection}
        style={styles.cta}
      >
        <Text
          style={[styles.ctaText, { lineHeight: homeV2.type.cta.lineHeight * scale }]}
          color={homeV2.color.white}
        >
          하루 돌아보기 ›
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: homeV2.size.hero.height,
    marginTop: homeV2.size.hero.marginTop,
    borderRadius: homeV2.size.hero.radius,
    backgroundColor: homeV2.color.card,
    boxShadow: homeV2.shadow.hero,
  },
  tape: {
    position: "absolute",
    left: 140,
    top: -12,
    width: TAPE.width,
    height: TAPE.height,
    transform: [{ rotate: homeV2.tilt.tape }],
  },
  bubble: {
    position: "absolute",
    left: 18,
    top: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: homeV2.color.white,
    transform: [{ rotate: homeV2.tilt.bubble }],
    zIndex: 2,
    boxShadow: homeV2.shadow.bubble,
  },
  bubbleText: { fontFamily: homeV2.font.bold, ...homeV2.type.bubble },
  bubbleTail: {
    position: "absolute",
    right: 28,
    bottom: -8,
    width: 16,
    height: 16,
    backgroundColor: homeV2.color.white,
    transform: [{ rotate: "45deg" }],
  },
  note: {
    position: "absolute",
    left: 26,
    top: 128,
    maxWidth: 160,
    fontFamily: homeV2.font.regular,
    ...homeV2.type.note,
    transform: [{ rotate: homeV2.tilt.note }],
  },
  ground: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 170,
    height: 40,
    borderRadius: 24,
    backgroundColor: homeV2.color.heroGround,
    transform: [{ rotate: homeV2.tilt.ground }],
  },
  baba: { position: "absolute", right: 16, bottom: -24, zIndex: 1 },
  cta: {
    position: "absolute",
    left: 18,
    bottom: 20,
    minHeight: homeV2.size.cta.height,
    paddingHorizontal: 20,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 36,
    borderBottomLeftRadius: 26,
    backgroundColor: homeV2.color.green,
    justifyContent: "center",
    zIndex: 2,
    borderWidth: 3,
    borderColor: homeV2.color.paper,
  },
  ctaText: { fontFamily: homeV2.font.bold, ...homeV2.type.cta },
});
