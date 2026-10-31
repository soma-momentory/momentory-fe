import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated } from "react-native";

import { babaBlink, motion, retroDiary } from "@/design/ds";

import {
  RETRO_BABA_LEFT,
  RETRO_BABA_WIDTH,
  RETRO_BABA_NOSE_X,
  RetroBabaArtwork,
} from "./RetroBaba";

/** The same supplied character peeks over the diary input while the keyboard is open. */
type Props = { width?: number };
export const RETRO_BABA_PEEK_WIDTH = retroDiary.peekWidth;
export const RETRO_BABA_PEEK_LEFT =
  RETRO_BABA_LEFT + (RETRO_BABA_WIDTH - RETRO_BABA_PEEK_WIDTH) * RETRO_BABA_NOSE_X;
const ASPECT = 800 / 850;
export const RETRO_BABA_PEEK_HEIGHT = RETRO_BABA_PEEK_WIDTH / ASPECT - retroDiary.peekDrop;

/** 다음 깜빡임까지 — 늘 같은 간격이면 기계처럼 보여 `jitter` 만큼 흔든다 */
const nextBlinkIn = () => babaBlink.interval + (Math.random() * 2 - 1) * babaBlink.jitter;

export function RetroBabaPeek({ width = RETRO_BABA_PEEK_WIDTH }: Props) {
  const height = width / ASPECT;
  // 값은 한 번 만들어 계속 쓴다 (`TypingBubble` 과 같은 방식)
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const appear = Animated.timing(opacity, {
      toValue: 1,
      duration: motion.duration,
      useNativeDriver: true,
    });
    appear.start();
    return () => appear.stop();
  }, [opacity]);

  const [eyesClosed, setEyesClosed] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const later = (ms: number, then: () => void) => {
      timer = setTimeout(() => {
        if (alive) then();
      }, ms);
    };
    // 한 번 감았다 뜨고, 뜬 뒤에 `after` 를 부른다
    const blink = (after: () => void) => {
      setEyesClosed(true);
      later(babaBlink.closed, () => {
        setEyesClosed(false);
        after();
      });
    };
    const loop = () =>
      later(nextBlinkIn(), () =>
        blink(() =>
          Math.random() < babaBlink.doubleChance
            ? later(babaBlink.between, () => blink(loop))
            : loop(),
        ),
      );

    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (alive && !reduced) loop();
      });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <Animated.View
      testID="retro-baba-peek"
      // 같은 배율의 그림을 아래로 앉히고, 입력창 뒤로 들어가는 몸통은 잘라낸다.
      // 대화가 비키는 높이도 함께 줄어 머리 위에 빈 공간이 남지 않는다.
      style={{
        width,
        height: height - retroDiary.peekDrop,
        overflow: "hidden",
        opacity,
      }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <RetroBabaArtwork width={width} peek eyesClosed={eyesClosed} />
    </Animated.View>
  );
}
