import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";

/**
 * 바람 카드의 본문 항목 — 쉼터 카드(R2)와 일기 상세(A3)가 함께 쓴다. 회고 완료 화면(`done`)의 카드와
 * 같은 항목·워딩이되, **저장된 카드는 빈 항목을 숨기지 않고** 「아직 정하지 않음」으로 표시한다
 * (사용자가 '아직 잘 모르겠어요'·'오늘은 여기까지'를 골라 비운 자리 — AI 가 임의로 채우지 않는다).
 *
 * 감정 성격(`positive`)에 따라 라벨이 갈린다: 바람은 「내 마음이 바랐던 것 / 내 마음을 채워준 것」,
 * 모습은 「바랐던 모습 / 좋았던 모습」.
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
};

const UNSET = "아직 정하지 않음";

export function WishCardFields({
  situation,
  emotions,
  needs,
  desiredState,
  smallAction,
  positive,
}: Props) {
  const emotionText = emotions.map(emotionName).filter(Boolean).join(", ");
  const needsText = needs.join(", ");
  const wishLabel = positive ? "내 마음을 채워준 것" : "내 마음이 바랐던 것";
  const shapeLabel = positive ? "좋았던 모습" : "바랐던 모습";

  return (
    <View style={styles.fields}>
      <Field label="상황" value={situation} />
      <Field label="감정" value={emotionText || UNSET} />
      <Field label={wishLabel} value={needsText || UNSET} />
      <Field label={shapeLabel} value={desiredState || UNSET} />
      <Field label="작은 행동" value={smallAction || UNSET} strong />
    </View>
  );
}

/** 라벨이 값 위에 선다 — 역할과 내용이 두 줄로 갈린다 */
function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.field}>
      <Text variant="label2" color={labelColor.alternative}>
        {label}
      </Text>
      <Text
        variant={strong ? "body1" : "body2"}
        color={strong ? labelColor.strong : labelColor.normal}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: space.lg },
  field: { gap: space.xs },
});
