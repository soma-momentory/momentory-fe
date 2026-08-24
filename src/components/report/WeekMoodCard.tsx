import { StyleSheet, View } from "react-native";

import { Card, Text } from "@/components/ds";
import { label as labelColor, line, space } from "@/design/ds";
import { splitMoodMessage, type WeeklyReport } from "@/features/report/model/weeklyReport";

import { WeekMoodRow } from "./WeekMoodRow";

/**
 * `W1` · 첫 카드 「**이번 주의 마음**」 — 일곱 칸의 점 + 구분선 + 요약 문장.
 *
 * 시안이 「첫 카드가 가장 중요 — 제목 → 7일 흐름 → 구분선 → 요약」이라고 못박은
 * 그 카드다. 감정 **비율**(도넛·%)은 여기에도 어디에도 없다(`DESIGN.md` 「리포트」).
 *
 * ## 문장을 지어내지 않는다
 *
 * 요약은 **서버가 감정에 따라 고른 고정 문장**이다(BE `WeeklyMood` — AI 를 쓰지
 * 않는다). 화면은 그 한 덩이를 첫 마침표에서 둘로 갈라 **관찰**과 **권유**를 다른
 * 굵기로 세울 뿐이고(`splitMoodMessage`), 문장을 고치거나 보태지 않는다. 한 문장뿐인
 * 주(여러 감정이 최다를 나눠 가진 주 · 기록이 없는 주)는 그대로 한 줄이다.
 *
 * ## 「이번 주」라고 쓴다
 *
 * `W1.md` 는 문구를 기간에 매지 말라고 했지만(「한 주 요약」), 서버 멘트 자체가
 * 「**이번 주에는** …」으로 시작한다. 제목만 기간에서 떼면 카드 안에서 말이 갈린다 —
 * 시안(`Report · 리포트 주간`)을 따라 「이번 주의 마음」으로 맞췄다.
 * 기록: `docs/PRODUCT.md` 「상류와 차이」.
 */
export function WeekMoodCard({ report }: { report: WeeklyReport }) {
  const { lead, follow } = splitMoodMessage(report.moodMessage);

  return (
    <Card padding="loose" style={styles.card}>
      <View style={styles.top}>
        <Text variant="headline1" color={labelColor.strong}>
          이번 주의 마음
        </Text>
        <WeekMoodRow days={report.days} />
      </View>

      {lead.length > 0 ? (
        <View style={styles.copy}>
          <Text variant="body1Reading" color={labelColor.normal}>
            {lead}
          </Text>
          {follow.length > 0 ? (
            <Text variant="body2Reading" color={labelColor.alternative}>
              {follow}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xl },
  top: { gap: space.lg },
  // 구분선은 hairline 이다 — 카드 안에 또 하나의 카드를 만들지 않는다(`DESIGN.md` §5)
  copy: {
    gap: space.xs,
    paddingTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.alternative,
  },
});
