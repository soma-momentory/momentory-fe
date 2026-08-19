import { StyleSheet, View } from "react-native";

import { Card, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";

/**
 * `W1` · 이어갈 한 가지 — **행동을 한 번만 짚는다.** 만든 수와 해본 수만 적고
 * **실행률·연속을 세지 않는다**(관찰이지 평가가 아니다). 별도 `[행동 인사이트]`
 * 탭을 만들지 않는다(`W1.md`).
 *
 * 섹션 라벨이 카드 **밖**에 선다 — 시안의 「이번 주 한눈에」와 같은 문법이다
 * (`Report.dc.html`). 카드 안에 라벨을 넣으면 값과 같은 위계로 읽힌다.
 */
export function ActionInsightCard({
  actionText,
  made,
  done,
}: {
  actionText: string;
  made: number;
  done: number;
}) {
  return (
    <View style={styles.section}>
      <Text variant="label1" color={labelColor.neutral} style={styles.sectionLabel}>
        이어갈 한 가지
      </Text>
      <Card padding="loose" style={styles.card}>
        <Text variant="body1" color={labelColor.normal}>
          {actionText}
        </Text>
        {/* 만든 수와 해본 수만 — 그 주 행동 카드에서 센다. 실행률이 아니다 */}
        <Text variant="caption1" color={labelColor.alternative}>
          {`${made}번 만들었고 · ${done}번 해봤어요`}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  // 시안이 섹션 라벨만 4px 안쪽에서 시작한다 — 카드 모서리와 글자 시작을 맞춘다
  sectionLabel: { paddingLeft: space.xs },
  card: { gap: space.sm },
});
