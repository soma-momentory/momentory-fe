import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Image, StyleSheet } from "react-native";

import { babaBlink, motion } from "@/design/ds";

import { RETRO_BABA_LEFT, RETRO_BABA_NOSE_X, RETRO_BABA_WIDTH } from "./RetroBaba";

/**
 * 입력창 위로 **고개를 내민 바바** — 키보드가 올라와 있는 동안만 선다(2026-10-03 · 사용자 요청).
 *
 * 키보드가 올라오면 왼쪽 아래에 앉은 바바(`RetroBaba`)가 키보드·입력창에 덮여 사라진다. 그동안
 * 바바가 입력창 윗변 너머로 얼굴을 내밀고 **앞발 둘을 입력창에 걸친다.** 키보드가 내려가면 다시
 * 빈백에 앉은 바바다. 둘을 바꿔 드는 것은 `ChatScaffold` 의 `companionRaised` 가 한다.
 *
 * 그림은 몸이 판에 잘린 모양이다 — 잘린 줄이 입력창 윗변에 오고, 그 아래로 내려온 앞발만큼
 * 입력창 위에 걸친다(`PAW_RATIO`). 색은 앉은 바바에 맞춰 옮겨 칠했다(`scripts/keyout-retro-baba-peek.py`).
 *
 * **머리·몸은 원본보다 낮게 앉혔다**(2026-10-03 · 「너무 튀어나와 있다 · 손 위치는 맘에 든다」 사용자 요청).
 * 앞발은 제자리에 두고 머리·몸만 내려 몸 아래를 입력창에 더 숨겼다 — 입 아래로 몸통이 살짝 보일 만큼이다
 * (스크립트의 `BODY_DROP` · 100 은 너무 줄어 50).
 * 두 앞발은 아주 조금 안쪽으로 모았다(「손을 아주 조금만 서로 모이게」 · `PAW_GATHER`).
 *
 * 나타날 때 옅게 떠오른다(fade 하나 — `motion` 머리말 「슬라이드를 만들지 않는다」).
 *
 * ## 눈을 깜빡인다 (2026-10-03 · 사용자 요청)
 *
 * 감은 눈 그림(`baba-peek-blink.png`)을 **같은 상자로 잘라** 위에 겹쳐 두고, 몇 초에 한 번 잠깐 켠다
 * (`babaBlink` · 간격을 흔들고 가끔 두 번 연달아). 눈 말고는 픽셀이 같아 눈만 감았다 뜬 것으로 보인다.
 * 감은 장은 처음부터 그려 둔다 — 깜빡일 때 처음 불러오면 한 번 비어 보인다.
 * **기기에서 동작 줄이기를 켰으면 깜빡이지 않는다.**
 *
 * **움직이지도, 눌리지도 않는다** — 낭독기에도 없는 것으로 둔다(`RetroBaba` 와 같은 판단).
 */
type Props = {
  /** 그림의 폭 — 높이는 그림의 비율이 정한다 */
  width?: number;
};

/**
 * 기본 폭 — **120dp**. 키보드가 올라온 동안은 대화 칸이 좁아서(대화가 머리 위에서 끝난다)
 * 앉은 바바(260)보다 훨씬 작게 둔다. 줄이거나 키우고 싶으면 이 값 하나만 고친다.
 */
export const RETRO_BABA_PEEK_WIDTH = 120;

/** 코 한가운데가 그림 폭의 어디인가 — 스크립트가 함께 출력한 값 */
const NOSE_X = 0.5393;

/**
 * 그림의 왼쪽 끝 — 입력창 왼쪽 끝 기준. **앉은 바바와 코가 같은 가로 자리에 오게** 잡는다
 * (2026-10-03 · 「채팅창 내렸을 때 캐릭터 위치랑 비슷하게」 사용자 요청 · 가운데 → 모서리 안쪽 → 여기).
 * 키보드가 오르내리며 둘이 바뀌어도 바바가 옆으로 움직이지 않고 제자리에서 앉았다 일어선 것처럼 보인다.
 *
 * 앉은 바바와 입력창은 둘 다 Screen 패딩 안쪽이 0 이라 같은 자로 잰다. 그림의 크기나 자리
 * (`RETRO_BABA_WIDTH` · `RETRO_BABA_LEFT`)가 바뀌어도 따라온다(지금 약 60dp).
 */
export const RETRO_BABA_PEEK_LEFT =
  RETRO_BABA_LEFT + RETRO_BABA_WIDTH * RETRO_BABA_NOSE_X - RETRO_BABA_PEEK_WIDTH * NOSE_X;

/** 가로 ÷ 세로 — 잘라 낸 그림에서 잰 값(480 × 349 · `scripts/keyout-retro-baba-peek.py`) */
const ASPECT = 480 / 349;

/** 그림 높이 가운데 **판(입력창) 윗변 아래로 내려온 앞발**의 몫 — 스크립트가 함께 출력한 값 */
const PAW_RATIO = 0.0586;

const SOURCE = require("../../../../assets/retro/baba-peek.png");
/** 눈만 감은 같은 그림 — 같은 스크립트가 같은 상자로 잘랐다 */
const BLINK_SOURCE = require("../../../../assets/retro/baba-peek-blink.png");

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
      // 앞발만큼 아래로 걸친다 — 음수 여백이라 독 위로 솟은 높이(대화가 비킬 몫)에는 앞발이 빠진다
      style={{ width, height, marginBottom: -height * PAW_RATIO, opacity }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {/* ⚠ 두 장 다 **폭·높이를 직접 준다.** `require` 한 그림은 파일 크기(480 × 389)를 기본 크기로
          들고 오고, 상하좌우만 잡는 `absoluteFill` 은 그걸 이기지 못한다 — 실기기에서 바바가 네 배로
          커졌다(2026-10-03) */}
      <Image source={SOURCE} style={{ width, height }} resizeMode="contain" />
      <Image
        testID="retro-baba-peek-blink"
        source={BLINK_SOURCE}
        style={[styles.overlay, { width, height, opacity: eyesClosed ? 1 : 0 }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 뜬 눈 위에 그대로 겹친다
  overlay: { position: "absolute", top: 0, left: 0 },
});
