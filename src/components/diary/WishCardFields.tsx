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
 *
 * ## 배치가 둘이다 — 쓰는 자리의 **높이 제약**이 다르다 (2026-09-06)
 *
 * 기본은 **두 줄**(라벨 위 · 값 아래)이다. 일기 상세는 화면이 통째로 스크롤해서
 * 세로를 넉넉히 쓸 수 있고, 두 줄이 역할과 내용을 또렷하게 가른다.
 *
 * 쉼터 카드(`R2`)만 `inline` 로 **한 줄**(`상황: 헌터헌터 시청`)을 쓴다. 그 카드는
 * 달력 위 **정해진 자리**에 다 들어와야 해서(`app/rest/cards/index.tsx`) 두 줄이면
 * 다섯 항목이 자리를 넘어 카드 안이 스크롤됐다. 값이 길어 접히는 항목은 여전히
 * 두 줄이 되지만, 라벨이 자기 줄을 차지하지 않는 만큼이 그대로 줄어든다.
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
  /**
   * 라벨과 값을 **한 줄**에 붙인다(`상황: …`). 높이가 정해진 자리에 쓸 때만 켠다 —
   * 위 머리말 「배치가 둘이다」.
   */
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

/**
 * 한 줄 배치가 쓰는 단 — 두 줄 배치보다 **한 단계 크다**(2026-09-06 · 약 1.2배).
 *
 * 값 15 → **18**(꼭 1.2배) · 라벨 13 → **15**(1.15배). **새 숫자를 만들지 않고**
 * 12단 안에서 가장 가까운 것을 골랐다(`CLAUDE.md` 「색·크기·시간을 하드코딩하지
 * 않는다」) — 라벨의 1.2배인 15.6 은 스케일에 없다. 16(`body1`)이 배율로는 더
 * 가깝지만 값 18 과 2pt 밖에 안 벌어져 라벨이 값과 대등해 보인다.
 *
 * ⚠ 값 두 단이 **하나로 합쳐졌다.** 원래 「작은 행동」만 16(`body1`)으로 1pt 컸는데
 * 18 로 올리면서 같아졌다 — 1pt 차이는 이 크기에서 신호가 되지 못한다. 그 항목은
 * 이제 **색**(`label.strong`)으로만 도드라진다.
 */
const INLINE_LABEL = "body2";
const INLINE_VALUE = "headline1";

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
  const valueVariant = inline ? INLINE_VALUE : strong ? "body1" : "body2";
  const labelVariant = inline ? INLINE_LABEL : "label2";

  /**
   * 한 줄 — 라벨을 **값 Text 안에 중첩**한다.
   *
   * 나란한 두 `Text` 를 `flexDirection: row` 로 두면, 값이 길어 접힐 때 라벨 아래가
   * 아니라 **라벨 오른쪽 폭 안에서만** 접혀 줄이 좁아진다. 중첩하면 값이 라벨 아래로
   * 자연스럽게 이어지고, 낭독기도 「상황: 헌터헌터 시청」을 **한 문장**으로 읽는다.
   *
   * 라벨과 값은 **각자 노드로 남긴다** — 합쳐 한 문자열로 두면 둘의 색·크기를 나눌
   * 수 없고, 「라벨이 있다 · 값이 있다」를 따로 확인하던 자리도 사라진다.
   * 값 노드에 바깥과 **같은 단**을 다시 주는 이유는 `Text` 의 `variant` 기본값이
   * `body1` 이라, 비워 두면 중첩된 값만 크기가 달라지기 때문이다.
   */
  if (inline) {
    return (
      <Text variant={valueVariant} color={valueColor}>
        <Text variant={labelVariant} color={labelColor.alternative}>
          {label}
        </Text>
        {": "}
        <Text variant={valueVariant} color={valueColor}>
          {value}
        </Text>
      </Text>
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
  /**
   * 한 줄 배치의 항목 간격. 두 줄(`space.lg` 16)보다 훨씬 좁다 — 항목이 한 줄이라
   * 이웃과 섞일 위험이 적고, **다섯 항목이 정해진 자리에 들어오는 것**이 이 배치의
   * 목적이라 아낀 세로를 여기서 한 번 더 아낀다.
   *
   * 줄 간격은 이미 행간이 만든다 — 18 단의 행간이 26 이라 글자 사이에 8 이 이미
   * 들어 있고, 여기 8 은 **그 위에 더하는 값**이다.
   */
  fieldsInline: { gap: space.sm },
});
