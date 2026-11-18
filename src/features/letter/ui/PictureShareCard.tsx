import { forwardRef, useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, line, radius, space } from "@/design/ds";
import { letterPaper } from "@/design/ds/letterPaper";
import { LETTER_PICTURE_ASPECT } from "@/features/letter/model/letter";
import { figureLayers } from "@/features/wardrobe/model/figure";
import type { Outfit } from "@/features/wardrobe/model/types";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * 그림일기 공유 · 저장 카드(2026-11-18) — 9:16 종이 가운데에 4컷 그림, 아래에 **지금 꾸민 바바**와 한 줄.
 * 처음엔 서버가 앱 로고를 단 카드를 만들었는데, 사용자가 로고 자리에 자기 바바를 넣자고 했다(2026-11-18).
 * 바바 부품 그림과 손글씨 서체가 앱에만 있어 카드는 앱이 그리고 `lib/pictureCard.ts` 가 이미지로 찍는다.
 *
 * 공유받는 사람이 처음 보는 카드라 말은 한 줄만 둔다 — 언제의 하루인지와 누가 그렸는지. 닉네임은 넣지 않는다
 * (밖으로 나가는 이미지라 이름을 싣지 않는다). 아래 「- 모멘토리 -」는 앱 이름 표시다.
 *
 * 바바는 `BabaFigure` 를 쓰지 않고 같은 부품을 React Native `Image` 로 겹친다. `BabaFigure` 의 `expo-image` 는 Android 에서
 * 하드웨어 비트맵으로 읽힐 수 있는데, 카드를 찍는 소프트웨어 캔버스는 그 비트맵을 그리지 못해 캡처가 실패한다.
 */
type Props = {
  /** 그림 `data:` 주소 */
  picture: string;
  /** 편지의 출처 일기 날짜(yyyy-MM-dd) */
  date: string;
  outfit: Outfit;
  /** 그림과 바바 부품이 모두 읽혔는지 — 읽히기 전에 찍으면 빈 카드가 저장된다 */
  onReady: (ready: boolean) => void;
};

export const PictureShareCard = forwardRef<View, Props>(function PictureShareCard(
  { picture, date, outfit, onReady },
  ref,
) {
  const layers = figureLayers(outfit);
  const [loaded, setLoaded] = useState<ReadonlySet<string | number>>(() => new Set());
  const markLoaded = (source: string | number) =>
    setLoaded((prev) => (prev.has(source) ? prev : new Set(prev).add(source)));
  const ready = loaded.has(picture) && layers.every((source) => loaded.has(source));
  useEffect(() => onReady(ready), [ready, onReady]);

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.frame}>
        <Image
          testID="picture-card-image"
          source={{ uri: picture }}
          fadeDuration={0}
          style={styles.picture}
          onLoad={() => markLoaded(picture)}
        />
      </View>
      <View style={styles.sign}>
        <View style={styles.baba}>
          {layers.map((source) => (
            <Image
              key={source}
              testID="picture-card-image"
              source={source}
              fadeDuration={0}
              resizeMode="contain"
              style={styles.babaLayer}
              onLoad={() => markLoaded(source)}
            />
          ))}
        </View>
        <View style={styles.words}>
          <Text variant="body1ReadingHandLg" color={labelColor.strong}>
            {`${formatKoreanDateShort(date)} 하루를\n그림으로 기억해요`}
          </Text>
          <Text variant="label1Hand" color={labelColor.alternative}>
            - 모멘토리 -
          </Text>
        </View>
      </View>
    </View>
  );
});

const BABA_SIZE = {
  width: letterPaper.card.babaWidth,
  height: (letterPaper.card.babaWidth * 4) / 3,
};

const styles = StyleSheet.create({
  card: {
    width: letterPaper.card.width,
    height: letterPaper.card.height,
    backgroundColor: letterPaper.paper,
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
  },
  frame: {
    width: letterPaper.card.pictureWidth,
    aspectRatio: LETTER_PICTURE_ASPECT,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: line.neutral,
    overflow: "hidden",
  },
  picture: { width: "100%", height: "100%" },
  sign: {
    width: letterPaper.card.pictureWidth,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.md,
  },
  baba: BABA_SIZE,
  // 앱에 든 그림은 크기를 적지 않으면 원본 크기로 그려진다 — 부품마다 바바 상자 크기를 직접 준다
  babaLayer: { position: "absolute", top: 0, left: 0, ...BABA_SIZE },
  words: { flex: 1, gap: space.xs, paddingBottom: space.sm },
});
