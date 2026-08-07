import { StyleSheet } from "react-native";

import { SectionLabel } from "@/components/common/SectionLabel";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";

/**
 * `W1` · 이어갈 한 가지 — **행동을 한 번만 짚는다.** 만든 수와 해본 수만 적고
 * **실행률·연속을 세지 않는다**(관찰이지 평가가 아니다). 별도 `[행동 인사이트]`
 * 탭을 만들지 않는다.
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
    <Card style={styles.card}>
      <SectionLabel>이어갈 한 가지</SectionLabel>
      <AppText tone="strong" weight="500" style={styles.actionText}>
        {actionText}
      </AppText>
      {/* 만든 수와 해본 수만 — 그 주 행동 카드에서 센다. 실행률이 아니다 */}
      <AppText variant="caption" tone="caption">
        {`${made}번 만들었고 · ${done}번 해봤어요`}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 9 },
  actionText: { fontSize: 14, lineHeight: 22 },
});
