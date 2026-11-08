import { useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { label, motion, space, text } from "@/design/ds";

/**
 * 네이티브 스플래시가 그림을 그리는 크기 — `app.config.ts` `expo-splash-screen` 의 `imageWidth`.
 * 두 곳이 어긋나면 S0 로 넘어가는 순간 얼굴이 커지거나 줄어든다.
 */
const SPLASH_IMAGE_SIZE = 288;
/** 캔버스(1024) 기준 — `splash-icon.png` 을 만들 때 쓴 값이다. 그림을 다시 만들면 같이 고친다 */
const CANVAS = 1024;
const FACE_CANVAS = 420;

/** 얼굴 한 변(dp) */
const FACE_SIZE = (SPLASH_IMAGE_SIZE * FACE_CANVAS) / CANVAS;
/** 얼굴과 워드마크 사이 */
const WORDMARK_GAP = space.lg;
/**
 * 얼굴 가운데가 화면 가운데에서 **위로** 떨어진 거리. `splash-icon.png` 에 얼굴이 이만큼(캔버스 86)
 * 올라가 그려져 있어 **그림을 다시 만들기 전에는 바꾸지 않는다** — 옛 `Momentory` 그림 워드마크
 * (230 × 540:76)의 높이로 잰 값이다.
 */
const FACE_LIFT = (WORDMARK_GAP + (230 * 76) / 540) / 2;
/** 워드마크 줄 높이 — 교보 손글씨 「모멘토리」(`wordmarkHand`) */
const WORDMARK_HEIGHT = text.wordmarkHand.lineHeight;

/** 묶음(얼굴 위 끝 ~ 워드마크 아래 끝)의 절반 높이 — 그 아래에 무언가를 둘 때 기준이다 */
export const SPLASH_LOGO_HALF_HEIGHT = (FACE_SIZE + WORDMARK_GAP + WORDMARK_HEIGHT) / 2;

type Props = {
  /** 얼굴이 그려졌다(또는 그림을 못 읽었다) — 네이티브 스플래시를 내려도 된다 */
  onFaceShown: () => void;
};

/**
 * 스플래시 로고 — **카피바라 얼굴 + `Momentory` 워드마크를 한 묶음으로 화면 한가운데에** 둔다
 * (2026-10-06 · 사용자 요청).
 *
 * ## 얼굴은 네이티브 스플래시와 같은 그림 · 같은 자리다
 *
 * 안드로이드 12+ 는 네이티브 스플래시 그림을 안쪽 66% 원으로 깎아서, 워드마크를 두 배로 키우면
 * 그 원 밖으로 나가 잘린다. 그래서 네이티브 스플래시에는 **얼굴만** 있고, 묶음 가운데가 화면
 * 가운데에 오도록 얼굴을 `FACE_LIFT` 만큼 **위로 올려** 그려 두었다(`splash-icon.png`). 여기서는
 * 그 그림을 같은 크기(288)로 화면 가운데에 그대로 깔고 — 얼굴이 한 픽셀도 움직이지 않는다 —
 * 얼굴 아래에 워드마크를 서서히 띄운다.
 *
 * 워드마크는 그림(`Momentory`)이 아니라 **교보 손글씨 「모멘토리」 글자**다(2026-11-08 · 사용자 요청).
 */
export function SplashLogo({ onFaceShown }: Props) {
  const [wordmarkOpacity] = useState(() => new Animated.Value(0));

  const shown = () => {
    onFaceShown();
    Animated.timing(wordmarkOpacity, {
      toValue: 1,
      duration: motion.duration,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={require("../../../assets/splash-icon.png")}
        style={styles.canvas}
        testID="splash-mark"
        resizeMode="contain"
        // 안드로이드는 그림을 0.3초에 걸쳐 서서히 띄운다 — 네이티브 스플래시와 같은 그림이
        // 옅어졌다 짙어지며 한 번 깜빡여 보였다
        fadeDuration={0}
        onLoad={shown}
        onError={shown}
      />
      <Animated.View
        style={[styles.wordmark, { opacity: wordmarkOpacity }]}
        testID="splash-wordmark"
      >
        <Text variant="wordmarkHand" color={label.strong}>
          모멘토리
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 화면 전체(상태바·내비 바 밑까지)의 한가운데 — 네이티브 스플래시가 그림을 앉히는 기준과 같다
  root: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  canvas: { width: SPLASH_IMAGE_SIZE, height: SPLASH_IMAGE_SIZE },
  // 얼굴 아랫변 아래 — 그림(캔버스)의 흐름 밖에 앉혀 얼굴을 밀지 않는다
  wordmark: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    marginTop: -FACE_LIFT + FACE_SIZE / 2 + WORDMARK_GAP,
  },
});
