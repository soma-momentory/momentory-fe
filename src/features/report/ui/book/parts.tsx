import { useState, type ReactNode } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type TextLayoutLine,
  type TextStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { Text } from "@/components/ds";
import { homeV2, reportBook } from "@/design/ds";
import type { EmotionId } from "@/features/emotion/model/emotion";
import { Rug, RUG_ASPECT } from "@/features/home/ui/v2/Rug";

const { color, font } = reportBook;
const BABA_COMPOSITE = require("../../../../../assets/home/v2/baba-composite.png");
const BABA_STICKER = require("../../../../../assets/report/stickers/baba.png");
const PEBBLE_STICKERS: Record<EmotionId, number> = {
  1: require("../../../../../assets/report/stickers/happy.png"),
  2: require("../../../../../assets/report/stickers/proud.png"),
  3: require("../../../../../assets/report/stickers/calm.png"),
  4: require("../../../../../assets/report/stickers/tired.png"),
  5: require("../../../../../assets/report/stickers/stuck.png"),
  6: require("../../../../../assets/report/stickers/lethargic.png"),
  7: require("../../../../../assets/report/stickers/anxious.png"),
  8: require("../../../../../assets/report/stickers/depressed.png"),
  9: require("../../../../../assets/report/stickers/angry.png"),
  10: require("../../../../../assets/report/stickers/frustrated.png"),
};
const NO_EMOTION_STICKER = require("../../../../../assets/report/stickers/no-emotion.png");

/** 손글씨 글자 — 크기와 줄 높이를 함께 준다 */
export const hand = (fontSize: number, lineHeight: number): TextStyle => ({
  fontFamily: font,
  fontSize,
  lineHeight,
});

/**
 * 공책 글 — 글자가 실제로 그려진 줄마다 밑줄을 긋는다(`LetterPaper` 와 같은 판단). 빈 줄에는 긋지 않는다.
 * `onTextLayout` 이 없는 곳(웹 · Lab)에서는 전체 높이를 줄 높이로 나눈다.
 */
export function Ruled({
  size,
  lineHeight,
  textColor = homeV2.color.ink,
  testID,
  children,
}: {
  size: number;
  lineHeight: number;
  textColor?: string;
  testID?: string;
  children: ReactNode;
}) {
  const [textLines, setTextLines] = useState<readonly TextLayoutLine[] | null>(null);
  const [boxHeight, setBoxHeight] = useState(0);
  const lines: readonly Pick<TextLayoutLine, "y" | "height">[] =
    textLines ??
    Array.from({ length: Math.round(boxHeight / lineHeight) }, (_, i) => ({
      y: i * lineHeight,
      height: lineHeight,
    }));
  return (
    <View onLayout={(e) => setBoxHeight(e.nativeEvent.layout.height)}>
      {lines.map((line, i) => (
        <View
          key={i}
          testID="book-rule"
          pointerEvents="none"
          style={[styles.rule, { top: line.y + line.height - 1 }]}
        />
      ))}
      <Text
        testID={testID}
        style={hand(size, lineHeight)}
        color={textColor}
        onTextLayout={(e) => setTextLines(e.nativeEvent.lines)}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * 흰 테두리 스티커 — 테두리가 그림에 들어 있다(`scripts/make-report-stickers.py`). 그림 둘레의 여백(`pad`,
 * 폭에 대한 비율)만큼 상자 밖으로 크게 그려서, 테두리 안쪽 그림이 상자에 꼭 맞게 한다.
 */
function Sticker({
  source,
  width,
  height,
  pad,
  testID,
}: {
  source: number;
  width: number;
  height: number;
  pad: number;
  testID?: string;
}) {
  const out = width * pad;
  return (
    <View
      style={{ width, height }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        testID={testID}
        source={source}
        resizeMode="contain"
        style={[
          styles.layer,
          { left: -out, top: -out, width: width + out * 2, height: height + out * 2 },
        ]}
      />
    </View>
  );
}

export function PebbleSticker({ id, size }: { id: EmotionId | null; size: number }) {
  return (
    <Sticker
      source={id == null ? NO_EMOTION_STICKER : PEBBLE_STICKERS[id]}
      width={size}
      height={size}
      pad={6 / 96}
    />
  );
}

/**
 * 그림이 상자 안에서 실제로 차지하는 몸 — 가로 범위와 발끝 높이(상자 위에서부터). 러그는 이것에 맞춘다.
 */
type BabaBody = { left: number; width: number; feet: number };

/**
 * 바바 아래 러그 자리 — 홈 히어로와 같은 결(`DESIGN.md` 「리포트」 2026-11-06). 가로 가운데를 몸과 맞추고, 몸보다
 * 넉넉히 넓게 깔고, 발끝이 러그 앞쪽에 얹히게 한다. 상자는 러그 아래 끝까지다 — 러그가 상자 밖으로 새어 표지
 * 가장자리를 넘지 않게.
 */
function rugUnder(body: BabaBody) {
  const width = body.width * reportBook.size.rug.perBody;
  const height = width * RUG_ASPECT;
  const top = body.feet - height * reportBook.size.rug.feet;
  return { left: body.left + (body.width - width) / 2, top, width, height, bottom: top + height };
}

/** 스티커 바바(`baba.png`)의 불투명 범위 — 픽셀. 그림은 흰 테두리 여백(`pad`)을 빼고 436 × 600 상자에 맞는다 */
const STICKER_ART = { width: 436, height: 600, pad: 10, left: 15, right: 441, feet: 606 } as const;

export function BabaSticker({ width }: { width: number }) {
  const unit = width / STICKER_ART.width;
  const height = STICKER_ART.height * unit;
  const rug = rugUnder({
    left: (STICKER_ART.left - STICKER_ART.pad) * unit,
    width: (STICKER_ART.right - STICKER_ART.left) * unit,
    feet: (STICKER_ART.feet - STICKER_ART.pad) * unit,
  });
  return (
    <View testID="book-baba-sticker" style={{ width, height: rug.bottom }}>
      <View
        testID="book-baba-rug"
        style={[
          styles.babaRug,
          { left: rug.left, top: rug.top, width: rug.width, height: rug.height },
        ]}
      >
        <Rug />
      </View>
      <Sticker
        source={BABA_STICKER}
        width={width}
        height={height}
        pad={STICKER_ART.pad / STICKER_ART.width}
        testID="book-baba-sticker-art"
      />
    </View>
  );
}

/**
 * 여백을 잘라 낸 합친 그림을 레이어 바바가 있던 자리에 놓는다(레이어 상자 폭에 대한 비율). 레이어 바바는 그림
 * 아홉 장이라 장마다 두면 공책을 여는 일이 밀린다.
 */
const compositeBox = (width: number) => ({
  left: width * 0.1527,
  top: width * 0.1818,
  width: width * 0.688,
  height: width * 0.9468,
});

/** 합친 그림(`baba-composite.png`)의 불투명 범위 — 픽셀 */
const COMPOSITE_ART = { width: 436, left: 12, right: 424, feet: 589 } as const;

/** 속지 위의 바바 — 홈과 같은 그림을 스티커 없이 앉힌다 */
export function BabaOnRug({ width }: { width: number }) {
  const box = compositeBox(width);
  const unit = box.width / COMPOSITE_ART.width;
  const rug = rugUnder({
    left: box.left + COMPOSITE_ART.left * unit,
    width: (COMPOSITE_ART.right - COMPOSITE_ART.left) * unit,
    feet: box.top + COMPOSITE_ART.feet * unit,
  });
  return (
    <View
      testID="book-baba-on-rug"
      style={{ width, height: rug.bottom }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        testID="book-baba-rug"
        style={[
          styles.babaRug,
          { left: rug.left, top: rug.top, width: rug.width, height: rug.height },
        ]}
      >
        <Rug />
      </View>
      <Image source={BABA_COMPOSITE} resizeMode="contain" style={[styles.layer, box]} />
    </View>
  );
}

const BUBBLE =
  "M28 22 C55 12 77 0 106 5 C129 9 153 9 178 13 C210 14 219 34 216 58 C214 82 186 102 128 106 C127 116 122 128 114 139 C108 128 102 116 100 108 C80 110 50 106 29 103 C10 100 5 79 4 62 C2 47 11 35 28 22 Z";

/** 바바 말풍선 — 홈과 같은 손그림 윤곽. 꼬리는 아래 바바를 향해 가운데에 둔다 */
export function Bubble({
  size,
  lineHeight,
  testID,
  children,
}: {
  size: number;
  lineHeight: number;
  testID?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.bubble}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="-4 -4 228 148" preserveAspectRatio="none">
          <Path d={BUBBLE} transform="translate(0 3)" fill={color.shadow} opacity={0.09} />
          <Path
            d={BUBBLE}
            fill={color.page}
            stroke={homeV2.color.bubbleBorder}
            strokeWidth={1.8}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
      </View>
      <Text
        testID={testID}
        style={[hand(size, lineHeight), styles.bubbleText]}
        color={homeV2.color.ink}
      >
        {children}
      </Text>
    </View>
  );
}

/** 장 제목 테이프 */
export function TapeTitle({ children }: { children: string }) {
  return (
    <View style={styles.tape}>
      <MaskingTape color={color.tape} />
      <Text style={hand(18, 24)} color={homeV2.color.ink} accessibilityRole="header">
        {children}
      </Text>
    </View>
  );
}

const NOTE =
  "M6 4 C34 2 58 5 88 3 C118 2 142 5 164 4 C168 5 169 12 168 30 C167 52 170 78 168 104 C167 108 162 108 150 107 C120 109 92 106 62 108 C40 109 20 107 7 107 C3 106 2 100 3 84 C4 62 1 36 3 12 C3 7 4 5 6 4 Z";

/** 손으로 오린 종이 면 — 안쪽 버튼과 카드가 같이 쓴다 */
export function CutPaper({ fill, stroke }: { fill: string; stroke?: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 172 111" preserveAspectRatio="none">
        <Path
          d={NOTE}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke == null ? 0 : 1.3}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    </View>
  );
}

/** 앞 장 · 다음 장 · 닫기 — 같은 오린 종이 모양이고 앞으로 가는 쪽만 초록이다 */
export function PaperButton({
  label,
  go = false,
  disabled = false,
  onPress,
  leading,
  trailing,
  testID,
}: {
  label: string;
  go?: boolean;
  disabled?: boolean;
  onPress: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={[styles.paperButton, disabled ? styles.disabled : null]}
    >
      <CutPaper
        fill={go ? color.green : color.card}
        stroke={go ? undefined : homeV2.color.bubbleBorder}
      />
      <View style={styles.paperButtonFace}>
        {leading}
        <Text style={hand(17, 22)} color={go ? homeV2.color.white : homeV2.color.ink}>
          {label}
        </Text>
        {trailing}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rule: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: color.rule },
  layer: { position: "absolute", left: 0, top: 0 },
  babaRug: { position: "absolute" },
  bubble: {
    alignSelf: "stretch",
    paddingTop: 16,
    paddingBottom: 34,
    paddingHorizontal: 14,
    zIndex: 3,
  },
  bubbleText: { textAlign: "center" },
  tape: {
    minHeight: 34,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignSelf: "flex-start",
    transform: [{ rotate: "-1.5deg" }],
  },
  paperButton: {
    minHeight: 48,
    minWidth: 76,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-1deg" }],
  },
  paperButtonFace: { flexDirection: "row", alignItems: "center", gap: 4 },
  disabled: { opacity: 0.4 },
});
