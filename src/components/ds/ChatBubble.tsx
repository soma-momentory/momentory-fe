import { useEffect, useState } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

import {
  bubbleRadius,
  fill,
  label as labelColor,
  primary,
  radius,
  space,
  withAlpha,
} from "@/design/ds";

import { Text } from "./Text";

/**
 * 대화 말풍선 — `DESIGN.md` §4 + `Onboarding.dc.html` 「대화 문법」.
 *
 * | 역할 | 정렬   | 면                | Radius        | 최대 폭 | 타이포          |
 * | ---- | ------ | ----------------- | ------------- | ------- | --------------- |
 * | 질문 | 왼쪽   | `fill.alternative`(6%) | `16 16 16 4`  | 288     | Body 1 Reading  |
 * | 답변 | 오른쪽 | `primary` 22% 틴트     | `16 16 4 16`  | 260     | Body 1          |
 *
 * **꼬리·아바타·화자 이름이 없다.** 정렬과 면 색이 화자를 말한다 — 옛
 * `BabaBubble`+`Avatar` 조합과 다른 점이 이것이다.
 *
 * ## 지난 턴은 흐려지되 색은 그대로다
 *
 * `past` 를 켜면 **투명도만** 내린다(`DESIGN.md` 「온보딩」 — 질문 0.48 / 답변 0.62).
 * 색을 회색으로 바꾸지 않는 이유: 지난 답도 여전히 내가 한 말이고, 색을 바꾸면
 * 「취소된 것」처럼 읽힌다.
 *
 * ⚠ 시안(`.dc.html`)은 0.55 / 0.70 을 쓰고 프레임마다 0.55·0.7 이 섞여 있다.
 * **`DESIGN.md` 값을 따랐다** — 값이 어긋나면 `DESIGN.md` 가 이긴다(`EXPORT_MANIFEST` §1).
 *
 * 온보딩과 일기가 **같은 것을 쓴다**(`EXPORT_MANIFEST` §4 — 시안에선 두 파일에
 * 각각 인라인이었다). 스펙이 같은 것을 두 번 만들지 않는다.
 */
type Props = {
  children: string;
  /** 기본 `question`(왼쪽). 사용자가 한 말이면 `answer` */
  variant?: "question" | "answer";
  /** 지난 턴 — 투명도만 내린다 */
  past?: boolean;
  style?: ViewStyle;
};

/** `DESIGN.md` 「온보딩」 — 지난 질문 0.48 · 지난 답변 0.62 */
const PAST_OPACITY = { question: 0.48, answer: 0.62 } as const;

export function ChatBubble({ children, variant = "question", past = false, style }: Props) {
  const question = variant === "question";

  return (
    <View
      style={[
        styles.base,
        question ? styles.question : styles.answer,
        past ? { opacity: PAST_OPACITY[variant] } : null,
        style,
      ]}
    >
      <Text
        variant={question ? "body1Reading" : "body1"}
        color={labelColor.normal}
        // 낭독기는 정렬을 못 읽는다 — 누가 한 말인지 이름으로 준다
        accessibilityLabel={`${question ? "질문" : "내 답변"}: ${children}`}
      >
        {children}
      </Text>
    </View>
  );
}

/** 점 하나가 밝아졌다 어두워지는 데 걸리는 시간 · 점 사이의 시차 */
const DOT_MS = 420;
const DOT_STAGGER = 140;
const DOT_DIM = 0.28;

/**
 * 답장을 쓰는 중 — **질문 말풍선 자리에 점 셋**이 앉는다.
 *
 * 회전하는 원(`Spinner`)이 아니라 말풍선인 이유: 기다리는 대상이 **화면이 아니라
 * 상대의 말**이기 때문이다. 스피너는 「앱이 뭔가 하고 있다」를 말하지만, 여기서
 * 알려야 하는 것은 「바바가 지금 답을 쓰고 있다」다. 그래서 다음에 올 말이 앉을
 * 바로 그 자리에, 그 말풍선 모양으로 둔다 — 답이 도착하면 점이 글자로 바뀐다.
 *
 * `ChatBubble` 과 **같은 파일에 두는 것이 규칙**이다. 면·라운드·정렬·최대 폭을
 * 공유해야 점과 글자가 같은 자리에서 갈아끼워지는데, 파일이 갈리면 한쪽만
 * 고쳐졌을 때 말풍선이 미묘하게 어긋난다.
 *
 * **진행률도 남은 시간도 말하지 않는다**(`RULES.md` 4 · `Spinner` 머리말과 같은 규칙).
 *
 * ⚠ 점의 움직임은 **정보가 아니라 생동감**이다 — 낭독기에는 한 줄로만 말한다.
 */
export function TypingBubble({ style }: { style?: ViewStyle }) {
  // 값은 한 번 만들어 계속 쓴다 (`ScheduleList` 와 같은 방식)
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(DOT_DIM)));

  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * DOT_STAGGER),
          Animated.timing(v, { toValue: 1, duration: DOT_MS, useNativeDriver: true }),
          Animated.timing(v, { toValue: DOT_DIM, duration: DOT_MS, useNativeDriver: true }),
          // 한 바퀴 길이를 점마다 같게 맞춘다 — 어긋나면 시차가 조금씩 밀린다
          Animated.delay((dots.length - 1 - i) * DOT_STAGGER),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);

  return (
    <View
      style={[styles.base, styles.question, styles.typing, style]}
      accessible
      accessibilityLabel="답장을 쓰는 중"
    >
      {dots.map((v, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: v }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 0 },
  question: {
    alignSelf: "flex-start",
    maxWidth: 288,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    backgroundColor: fill.alternative,
    ...bubbleRadius.question,
  },
  /**
   * 글자 대신 점이 들어간 질문 말풍선. 세로 여백을 14 에서 줄이는 이유는 점의 높이가
   * 글자 한 줄(26)보다 낮아서다 — 그대로 두면 말풍선만 홀쭉하게 길어 보인다.
   */
  typing: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + space.xs2, // 6 — 점 지름과 같게 두면 셋이 한 덩어리로 읽힌다
    paddingVertical: space.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: labelColor.neutral,
  },
  answer: {
    alignSelf: "flex-end",
    maxWidth: 260,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    // 답변 면은 브랜드 초록 22% 틴트 (`Onboarding.dc.html` 「대화 문법」)
    backgroundColor: withAlpha(primary.normal, 0.22),
    ...bubbleRadius.answer,
  },
});
