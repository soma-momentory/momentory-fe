import { Image, StyleSheet, View } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";

import { retroDiary } from "@/design/ds";

export const RETRO_BABA_WIDTH = retroDiary.characterWidth;
export const RETRO_BABA_LEFT = retroDiary.characterLeft;
export const RETRO_BABA_NOSE_X = 0.675;

/** User-supplied Baba.png. Its transparent margins are clipped at render time; the asset is unchanged. */
const SOURCE = require("../../../../assets/retro/baba-diary.png");
const CROP = { x: 200, y: 230, width: 800, height: 1120, peekHeight: 850 };
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
  const scale = width / CROP.width;
  return (
    <View
      style={{ width, height: (peek ? CROP.peekHeight : CROP.height) * scale, overflow: "hidden" }}
    >
      <Image
        source={SOURCE}
        resizeMode="contain"
        style={{
          position: "absolute",
          width: 1200 * scale,
          height: 1600 * scale,
          left: -CROP.x * scale,
          top: -CROP.y * scale,
        }}
      />
      {peek ? (
        <View
          testID="retro-baba-peek-blink"
          style={[StyleSheet.absoluteFill, { opacity: eyesClosed ? 1 : 0 }]}
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
