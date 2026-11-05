import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, restCards, space } from "@/design/ds";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";
import { keepWords } from "@/features/letter/model/letter";

/**
 * 바람 카드의 본문 항목 — 쉼터 카드(R2)와 일기 상세(A3)가 함께 쓴다. 회고 완료 화면(`done`)의 카드와
 * 같은 항목·워딩이되, **저장된 카드는 빈 항목을 숨기지 않고** 「아직 정하지 않음」으로 표시한다
 * (사용자가 '아직 잘 모르겠어요'·'오늘은 여기까지'를 골라 비운 자리 — AI 가 임의로 채우지 않는다).
 *
 * 감정 성격(`positive`)에 따라 라벨이 갈린다: 바람은 「내 마음이 바랐던 것 / 내 마음을 채워준 것」,
 * 모습은 「바랐던 모습 / 좋았던 모습」.
 *
 * ## 배치가 둘이다 — 쓰는 자리의 **높이 제약**이 다르다 (2026-09-06)
 *
 * 기본은 **두 줄**(라벨 위 · 값 아래)이다. 일기 상세는 화면이 통째로 스크롤해서
 * 세로를 넉넉히 쓸 수 있고, 두 줄이 역할과 내용을 또렷하게 가른다.
 *
 * 쉼터 카드(`R2`)만 `inline` 로 **이어 쓴다**(`상황: 헌터헌터 시청`). 쪽지 위 공책 줄 한 칸에 항목 하나씩
 * 적는 모양이고, 값이 길면 라벨 아래로 이어져 접힌다(2026-11-05 · 값은 `ds/restCards.ts`).
 */
type Props = {
  situation: string;
  /** 확인한 감정(최대 2) */
  emotions: EmotionId[];
  /** 바란 것(단어, 최대 2) */
  needs: string[];
  desiredState: string | null;
  /** 작은 행동 */
  smallAction: string | null;
  /** 긍정 감정이면 라벨 워딩이 바뀐다 */
  positive: boolean;
  /** 라벨과 값을 공책 줄 한 칸에 이어 쓴다(`상황: …`) — 위 머리말 「배치가 둘이다」 */
  inline?: boolean;
  /** 일기 상세처럼 카드 전체 높이를 줄여야 할 때 항목 사이 여백만 한 단계 줄인다. */
  compact?: boolean;
  /**
   * 오늘 만든 카드인가 — 그러면 비어 있는 「작은 행동」에 예고 문구(`ACTION_FROM_LETTER`)를 둔다.
   * 다음 날부터는 「아직 정하지 않음」이다: 「내일 아침」이 틀린 말이 되고, 예전 카드에는 편지가 없다.
   */
  madeToday?: boolean;
};

const UNSET = "아직 정하지 않음";

/**
 * 작은 행동은 회고에서 고르지 않고 **다음 날 아침 편지**에서 고른다(2026-10-27 · PRD 14-3).
 * 편지에서 고르면 서버가 카드의 `targetAction` 을 채운다 — 그때까지 이 줄이 자리를 지킨다.
 */
export const ACTION_FROM_LETTER = "내일 아침 바바가 골라 올게요";

export function WishCardFields({
  situation,
  emotions,
  needs,
  desiredState,
  smallAction,
  positive,
  inline = false,
  compact = false,
  madeToday = false,
}: Props) {
  const emotionText = emotions.map(emotionName).filter(Boolean).join(", ");
  const needsText = needs.join(", ");
  const wishLabel = positive ? "내 마음을 채워준 것" : "내 마음이 바랐던 것";
  const shapeLabel = positive ? "좋았던 모습" : "바랐던 모습";

  return (
    <View style={inline ? styles.fieldsInline : compact ? styles.fieldsCompact : styles.fields}>
      <Field label="상황" value={situation} inline={inline} />
      <Field label="감정" value={emotionText || UNSET} inline={inline} />
      <Field label={wishLabel} value={needsText || UNSET} inline={inline} />
      <Field label={shapeLabel} value={desiredState || UNSET} inline={inline} />
      <Field
        label="작은 행동"
        value={smallAction || (madeToday ? ACTION_FROM_LETTER : UNSET)}
        inline={inline}
        strong
      />
    </View>
  );
}

function Field({
  label,
  value,
  inline,
  strong,
}: {
  label: string;
  value: string;
  inline: boolean;
  strong?: boolean;
}) {
  const valueColor = strong ? labelColor.strong : labelColor.normal;
  const valueVariant = strong ? "body1" : "body2";

  /**
   * 이어 쓰기 — 라벨을 **값 Text 안에 중첩**한다.
   *
   * 나란한 두 `Text` 를 `flexDirection: row` 로 두면, 값이 길어 접힐 때 라벨 아래가
   * 아니라 **라벨 오른쪽 폭 안에서만** 접혀 줄이 좁아진다. 중첩하면 값이 라벨 아래로
   * 자연스럽게 이어지고, 낭독기도 「상황: 헌터헌터 시청」을 **한 문장**으로 읽는다.
   *
   * 「작은 행동」은 이름에 꿀색 형광을 긋는다 — 글자색이 아니라 면이 생겨 색이 약한 눈에도 갈린다.
   */
  if (inline) {
    return (
      <View style={styles.ruled}>
        <Text style={styles.ruledValue} color={restCards.color.ink}>
          <Text
            style={[styles.ruledLabel, strong ? styles.ruledLabelStrong : null]}
            color={strong ? restCards.color.ink : restCards.color.muted}
          >
            {label}
          </Text>
          {": "}
          {/* 어절로 줄을 바꾼다 — 「만났 / 다」처럼 낱말 가운데서 접히지 않게 */}
          <Text style={styles.ruledValue} color={restCards.color.ink}>
            {keepWords(value)}
          </Text>
        </Text>
      </View>
    );
  }

  // 두 줄 — 라벨이 값 위에 선다. 역할과 내용이 갈린다
  return (
    <View style={styles.field}>
      <Text variant="label2" color={labelColor.alternative}>
        {label}
      </Text>
      <Text variant={valueVariant} color={valueColor}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: space.lg },
  fieldsCompact: { gap: space.md },
  field: { gap: space.xs },
  fieldsInline: { gap: 0 },
  // 공책 줄 — 항목 하나가 한 칸이다
  ruled: {
    paddingVertical: restCards.size.fieldPaddingY,
    borderBottomWidth: 1,
    borderBottomColor: restCards.color.rule,
  },
  ruledValue: { fontFamily: restCards.font.regular, ...restCards.type.fieldValue },
  ruledLabel: { fontFamily: restCards.font.regular, ...restCards.type.fieldLabel },
  ruledLabelStrong: { backgroundColor: restCards.color.highlight },
});
