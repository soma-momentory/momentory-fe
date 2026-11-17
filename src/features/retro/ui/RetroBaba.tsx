import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";

import { retroDiary } from "@/design/ds";
import { useWardrobe } from "@/features/wardrobe/model/wardrobe";
import { BabaFigure } from "@/features/wardrobe/ui/BabaFigure";

export const RETRO_BABA_WIDTH = retroDiary.characterWidth;
export const RETRO_BABA_LEFT = retroDiary.characterLeft;
export const RETRO_BABA_NOSE_X = 0.675;

/**
 * 꾸민 바바(`wardrobe/ui/BabaFigure`)를 1200 × 1600 캔버스에서 잘라 그린다(2026-11-17 · 옛 `baba-diary.png` 와 같은 포즈).
 * 모자는 머리 위로, 수건 · 넓은 옷은 옆으로 나가므로 위로 `hatRoom`, 양옆으로 `side` 만큼 더 그린다 —
 * 음수 여백이라 자리는 그대로다.
 */
const CROP = { x: 200, y: 230, width: 800, height: 1120, peekHeight: 850, hatRoom: 150, side: 160 };

/** 자리 밖으로 더 그리는 폭 — 엿보기처럼 바깥에서 다시 자르는 쪽도 이만큼 비켜 줘야 잘리지 않는다 */
export const retroBabaRoom = (width: number) => {
  const scale = width / CROP.width;
  return { top: CROP.hatRoom * scale, side: CROP.side * scale };
};
export const RETRO_BABA_HEIGHT = (RETRO_BABA_WIDTH * CROP.height) / CROP.width;

export function RetroBabaArtwork({
  width,
  peek = false,
  eyesClosed = false,
}: {
  width: number;
  peek?: boolean;
  eyesClosed?: boolean;
}) {
  const outfit = useWardrobe((state) => state.outfit);
  const scale = width / CROP.width;
  const { top: room, side } = retroBabaRoom(width);
  return (
    <View
      style={{
        width: width + side * 2,
        height: (peek ? CROP.peekHeight : CROP.height) * scale + room,
        marginTop: -room,
        marginHorizontal: -side,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          left: side - CROP.x * scale,
          top: room - CROP.y * scale,
        }}
      >
        <BabaFigure outfit={outfit} width={1200 * scale} />
      </View>
      {/* 눈 깜빡임은 기본 눈 위에 털색을 덮는 것이라, 얼굴 아이템을 끼면 그리지 않는다 */}
      {peek && outfit.eyes == null ? (
        <View
          testID="retro-baba-peek-blink"
          style={[
            StyleSheet.absoluteFill,
            { top: room, left: side, right: side, opacity: eyesClosed ? 1 : 0 },
          ]}
        >
          <Svg width={width} height={CROP.peekHeight * scale} viewBox="200 230 800 850">
            <Ellipse cx={523} cy={565} rx={39} ry={51} fill={retroDiary.babaSkin} />
            <Ellipse cx={854} cy={525} rx={30} ry={48} fill={retroDiary.babaSkin} />
            <Path
              d="M 502 569 Q 523 586 544 566 M 840 529 Q 855 545 869 527"
              stroke={retroDiary.babaInk}
              strokeWidth={12}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}

export function RetroBaba({ width = RETRO_BABA_WIDTH }: { width?: number }) {
  // 알림으로 회고부터 열면 홈을 거치지 않아 옷장을 아직 모른다 — 그때만 받는다
  useEffect(() => {
    if (!useWardrobe.getState().loaded) void useWardrobe.getState().load();
  }, []);
  return (
    <View
      testID="retro-baba"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <RetroBabaArtwork width={width} />
    </View>
  );
}
