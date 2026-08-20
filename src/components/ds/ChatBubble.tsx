import { StyleSheet, View, type ViewStyle } from "react-native";

import { bubbleRadius, fill, label as labelColor, primary, space, withAlpha } from "@/design/ds";

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
