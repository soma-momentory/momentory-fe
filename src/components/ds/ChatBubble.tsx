import { useEffect, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";

import {
  bubbleRadius,
  fill,
  label as labelColor,
  primary,
  retroDiary,
  radius,
  space,
  withAlpha,
} from "@/design/ds";

import Svg, { Path } from "react-native-svg";

import { Text, useEffectiveFontScale } from "./Text";
import { chatSentenceLines } from "./chatSentenceLines";

/**
 * 대화 말풍선 — `DESIGN.md` §4 + `Onboarding.dc.html` 「대화 문법」.
 *
 * | 역할 | 정렬   | 면                | Radius        | 최대 폭 | 타이포          |
 * | ---- | ------ | ----------------- | ------------- | ------- | --------------- |
 * | 질문 | 왼쪽   | `fill.alternative`(6%) | `16 16 16 4`  | 288     | Body 1 Reading  |
 * | 답변 | 오른쪽 | `primary` 22% 틴트     | `16 16 4 16`  | 260     | Body 1          |
 *
 * 기본형은 **꼬리·아바타·화자 이름이 없다.** 정렬과 면 색이 화자를 말한다 — 옛
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
 * 회고의 `appearance="diary"`는 불투명한 단색 면과 둥근 삼각 꼬리로 스티커를 표현한다.
 * 온보딩과 일기가 **같은 것을 쓴다**(`EXPORT_MANIFEST` §4 — 시안에선 두 파일에
 * 각각 인라인이었다). 스펙이 같은 것을 두 번 만들지 않는다.
 */
type Props = {
  children: string;
  /** 기본 `question`(왼쪽). 사용자가 한 말이면 `answer` */
  variant?: "question" | "answer";
  /** 지난 턴 — 투명도만 내린다 */
  past?: boolean;
  appearance?: "default" | "diary";
  style?: ViewStyle;
};

/** `DESIGN.md` 「온보딩」 — 지난 질문 0.48 · 지난 답변 0.62 */
const PAST_OPACITY = { question: 0.48, answer: 0.62 } as const;

export function ChatBubble({
  children,
  variant = "question",
  past = false,
  appearance = "default",
  style,
}: Props) {
  const question = variant === "question";
  const { width: windowWidth } = useWindowDimensions();
  const fontScale = useEffectiveFontScale();
  const diary = appearance === "diary";
  const displayed = diary ? chatSentenceLines(children) : children;
  const layoutKey = JSON.stringify([displayed, variant, windowWidth, fontScale, style?.maxWidth]);
  const [measurement, setMeasurement] = useState<{
    key: string;
    width: number;
    text: string;
  } | null>(null);
  const fitted = diary && measurement?.key === layoutKey ? measurement : null;
  const fit = (lineWidth: number, text = displayed) => {
    if (Number.isFinite(lineWidth) && lineWidth > 0) {
      setMeasurement({
        key: layoutKey,
        // 글줄의 소수점 반올림 때문에 마지막 글자가 다시 접히지 않도록 1dp를 더 둔다.
        width: Math.min(
          question ? retroDiary.bubbleMaxWidth : retroDiary.answerMaxWidth,
          Math.max(retroDiary.radius * 2, Math.ceil(lineWidth) + space.lg * 2 + 1),
        ),
        text,
      });
    }
  };

  return (
    <View
      testID={diary ? "diary-chat-bubble" : undefined}
      onLayout={
        fitted
          ? (event) => {
              // Lab의 기기 폭처럼 부모만 좁아져도 넘치지 않게 새 폭에서 다시 잰다.
              if (event.nativeEvent.layout.width + 1 < fitted.width) setMeasurement(null);
            }
          : undefined
      }
      style={[
        styles.base,
        question ? styles.question : styles.answer,
        appearance === "diary" ? (question ? styles.diaryQuestion : styles.diaryAnswer) : null,
        past ? { opacity: PAST_OPACITY[variant] } : null,
        fitted ? { width: fitted.width, maxWidth: "100%" } : null,
        style,
      ]}
    >
      {appearance === "diary" ? <StickerTail question={question} /> : null}
      <Text
        key={diary ? layoutKey : undefined}
        variant={question ? "body1Reading" : "body1"}
        style={appearance === "diary" ? styles.diaryText : undefined}
        color={appearance === "diary" && !question ? retroDiary.onGreen : labelColor.normal}
        onTextLayout={
          diary && Platform.OS !== "web" && fitted == null
            ? (event) => {
                const lines = event.nativeEvent.lines;
                if (lines.length === 0) return;
                // 실제로 접힌 줄을 고정해 폭 보정이 재줄바꿈·재측정을 반복하지 않게 한다.
                fit(
                  Math.max(...lines.map((line) => line.width)),
                  lines.map((line) => line.text.trimEnd()).join("\n"),
                );
              }
            : undefined
        }
        onLayout={
          diary && Platform.OS === "web" && fitted == null
            ? (event) => {
                // React Native Web은 nativeEvent에 DOM target을 제공한다.
                const nativeEvent = event.nativeEvent as typeof event.nativeEvent & {
                  target?: unknown;
                };
                const width = webLineWidth(nativeEvent.target);
                if (width != null) fit(width);
              }
            : undefined
        }
        // 낭독기는 정렬을 못 읽는다 — 누가 한 말인지 이름으로 준다
        accessibilityLabel={`${question ? "질문" : "내 답변"}: ${children}`}
      >
        {fitted?.text ?? displayed}
      </Text>
    </View>
  );
}

/** Web 미리보기에서도 글줄을 잰다. 축소된 기기 프레임의 배율을 제외한 너비다. */
function webLineWidth(target: unknown): number | undefined {
  const node = target as HTMLElement | null;
  if (typeof node?.getBoundingClientRect !== "function" || !node.offsetWidth) return;
  const scale = node.getBoundingClientRect().width / node.offsetWidth;
  if (scale <= 0) return;
  const range = node.ownerDocument.createRange();
  range.selectNodeContents(node);
  return Math.max(0, ...Array.from(range.getClientRects(), (rect) => rect.width / scale));
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
export function TypingBubble({
  style,
  appearance = "default",
}: {
  style?: ViewStyle;
  appearance?: "default" | "diary";
}) {
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
      style={[
        styles.base,
        styles.question,
        styles.typing,
        appearance === "diary" ? styles.diaryQuestion : null,
        style,
      ]}
      accessible
      accessibilityLabel="답장을 쓰는 중"
    >
      {appearance === "diary" ? <StickerTail question /> : null}
      {dots.map((v, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: v }]} />
      ))}
    </View>
  );
}

/** A compact triangular tail with a softly rounded tip, matching its sticker. */
function StickerTail({ question }: { question: boolean }) {
  return (
    <Svg
      pointerEvents="none"
      focusable={false}
      width={30}
      height={22}
      viewBox="0 0 30 22"
      style={[styles.tail, question ? styles.tailLeft : styles.tailRight]}
    >
      <Path
        d="M 4 0 H 30 L 8 19 Q 4 22 4 17 Z"
        fill={question ? retroDiary.question : retroDiary.answer}
      />
    </Svg>
  );
}

const DIARY_CORNERS = {
  borderTopLeftRadius: retroDiary.radius,
  borderTopRightRadius: retroDiary.radius,
  borderBottomLeftRadius: retroDiary.radius,
  borderBottomRightRadius: retroDiary.radius,
};

const styles = StyleSheet.create({
  diaryQuestion: {
    flexDirection: "row",
    maxWidth: retroDiary.bubbleMaxWidth,
    backgroundColor: retroDiary.question,
    ...DIARY_CORNERS,
    paddingVertical: space.md,
    marginBottom: space.sm,
  },
  diaryAnswer: {
    flexDirection: "row",
    maxWidth: retroDiary.answerMaxWidth,
    backgroundColor: retroDiary.answer,
    ...DIARY_CORNERS,
    paddingVertical: space.md,
    marginBottom: space.sm,
  },
  diaryText: { flexShrink: 1 },
  tail: { position: "absolute", bottom: -12 },
  tailLeft: { left: 16 },
  tailRight: { right: 16, transform: [{ scaleX: -1 }] },
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
