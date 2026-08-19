import { StyleSheet, View } from "react-native";

import { Card, Text } from "@/components/ds";
import { label as labelColor, line, space } from "@/design/ds";
import type { WeekDay } from "@/features/report/model/report";

import { WeekEmotionRow } from "./WeekEmotionRow";

/**
 * `W1` · 첫 카드 — **7일 감정 흐름 + 요약 2줄**(`design.md` 「리포트」).
 *
 * 시안이 「첫 카드가 가장 중요 — 제목 → 7일 흐름 → 구분선 → 요약 2줄」이라고
 * 못박은 그 카드다. 2세대에서 도넛·범례가 하던 일(그 주가 어떤 감정으로
 * 채워졌는가)을 **일곱 개의 점**이 대신하고, 비율(%)은 아예 말하지 않는다.
 *
 * ## 문안은 시안이 아니라 스펙이다
 *
 * 시안의 제목은 「이번 주의 마음」이지만 `W1.md` 는 **문구를 기간에 매지 않는다** —
 * "이번 주 …"가 아니라 「**한 주 요약**」이다. 지난 주차를 넘겨볼 때도 같은 말이
 * 맞아야 한다. 값이 어긋나면 `design.md` 가 이기지만 **문안은 예외**이고
 * `docs/spec/screens/` 가 정본이다(`PLAN.md` A §0 · 로그인에서 정한 규칙).
 *
 * 요약 두 줄은 서버가 그 주 대화를 읽고 쓰는 값이고, 아래 한 줄의 수치는
 * 데이터에서 센 값이다 — **문장이 수치와 함께 있어야 지어낸 말이 아니게 된다.**
 * 시안 주석대로 **두 번째 줄은 실제 변화가 있을 때만** 나온다(비면 한 줄로 끝난다).
 */
type Props = {
  summary: string;
  /** 그 주의 흐름 한 줄 — 없으면 두 번째 줄을 두지 않는다 */
  flow: string;
  days: readonly WeekDay[];
  retroCount: number;
  emotionCount: number;
};

export function WeeklySummaryCard({ summary, flow, days, retroCount, emotionCount }: Props) {
  return (
    <Card padding="loose" style={styles.card}>
      <View style={styles.top}>
        <Text variant="headline1" color={labelColor.strong}>
          한 주 요약
        </Text>
        <WeekEmotionRow days={days} />
      </View>

      <View style={styles.copy}>
        <Text variant="body1Reading" color={labelColor.normal}>
          {summary}
        </Text>
        {flow.length > 0 ? (
          <Text variant="body2Reading" color={labelColor.alternative}>
            {flow}
          </Text>
        ) : null}
        <Text variant="caption1" color={labelColor.alternative} style={styles.basis}>
          {`회고 ${retroCount}회 · 감정 기록 ${emotionCount}개를 바탕으로 바바가 정리했어요`}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xl },
  top: { gap: space.lg },
  // 구분선은 hairline 이다 — 카드 안에 또 하나의 카드를 만들지 않는다(`design.md` §5)
  copy: {
    gap: space.xs,
    paddingTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.alternative,
  },
  basis: { paddingTop: space.xs },
});
