import { useEffect, useState } from "react";
import { Animated, StyleSheet, View, type ViewProps } from "react-native";

import { useReduceMotion } from "@/components/primitives/AppButton";
import { paperChat, paperShadows } from "@/design/paper";
import theme from "@/design/theme";
import { chat } from "@/design/tokens.mvp";

/**
 * 답장을 준비 중. 상류 `flows/ui.mjs` `typing()`.
 *
 * 62×35 풍선 안에 7px 점 셋. 바바 풍선과 **같은 모서리**(왼쪽 아래 꼬리)라
 * 곧 그 자리에 말이 들어온다는 것이 모양으로 읽힌다.
 *
 * 회고 채팅의 AI 응답 대기에도 그대로 쓴다 — `COMPONENTS.md` 가 꼽은
 * **가장 중요한 재사용**이다. 새로 만들지 않는다.
 *
 * Reduce Motion 이면 루프를 멈추고 점을 고르게 남긴다. 깜빡임 없이도
 * "무언가 오고 있다" 는 것은 자리로 전달된다.
 */
const PULSE = theme.motion.duration.slow;

type Props = Omit<ViewProps, "children"> & {
  /**
   * 새 디자인 — **6px 점 셋**이 바바 말풍선과 같은 반투명 흰 면 안에 든다
   * (`paperChat.dot` · `회고.dc.html`). 회고 화면만 켠다.
   */
  variant?: "default" | "paper";
};

export function TypingDots({ variant = "default", style, ...rest }: Props) {
  const reduceMotion = useReduceMotion();
  const paper = variant === "paper";

  return (
    <View
      accessibilityRole="progressbar"
      accessible
      accessibilityLabel="답장을 쓰는 중"
      {...rest}
      style={[styles.bubble, paper ? styles.bubblePaper : styles.bubbleDefault, style]}
    >
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} reduceMotion={reduceMotion} paper={paper} />
      ))}
    </View>
  );
}

function Dot({
  index,
  reduceMotion,
  paper,
}: {
  index: number;
  reduceMotion: boolean;
  paper: boolean;
}) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    // 점마다 1/3 주기씩 밀어 물결처럼 흐르게 한다.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay((PULSE / 3) * index),
        Animated.timing(opacity, { toValue: 0.3, duration: PULSE, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: PULSE, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, index, reduceMotion]);

  return (
    <Animated.View
      testID="typing-dot"
      style={[styles.dot, paper ? styles.dotPaper : null, { opacity }]}
    />
  );
}

const { semantic } = theme.colors;

const PAPER_DOT = 6;

const styles = StyleSheet.create({
  bubble: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: chat.typing.dotGap,
  },
  bubbleDefault: {
    width: chat.typing.width,
    height: chat.typing.height,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: `${semantic.textPrimary}1A`, // ink 10%
    // 바바 풍선과 같은 모서리 — 꼬리가 왼쪽 아래
    borderTopLeftRadius: chat.baba.radius.topLeft,
    borderTopRightRadius: chat.baba.radius.topRight,
    borderBottomRightRadius: chat.baba.radius.bottomRight,
    borderBottomLeftRadius: chat.baba.radius.bottomLeft,
  },
  dot: {
    width: chat.typing.dot,
    height: chat.typing.dot,
    borderRadius: chat.typing.dot / 2,
    backgroundColor: semantic.textMuted,
  },

  // ── 새 디자인 — 바바 말풍선과 같은 면·모서리, 시안 padding 14/15 ──────
  bubblePaper: {
    backgroundColor: paperChat.baba.background,
    borderTopLeftRadius: paperChat.baba.radius.topLeft,
    borderTopRightRadius: paperChat.baba.radius.topRight,
    borderBottomRightRadius: paperChat.baba.radius.bottomRight,
    borderBottomLeftRadius: paperChat.baba.radius.bottomLeft,
    paddingVertical: 14,
    paddingHorizontal: 15,
    ...paperShadows.flat,
  },
  dotPaper: {
    width: PAPER_DOT,
    height: PAPER_DOT,
    borderRadius: PAPER_DOT / 2,
    backgroundColor: paperChat.dot,
  },
});
