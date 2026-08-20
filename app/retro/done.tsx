import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button, Card, Icon, Screen, Text } from "@/components/ds";
import { label as labelColor, primary, space, status, withAlpha } from "@/design/ds";
import { useRetro } from "@/features/retro/model/retro";
import { useTodayContext } from "@/features/home/model/day";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `C7` · 저장 완료 → 홈
 *
 * `design.md` 「일기」 5번: 「저장 완료: **행동카드가 없으면 안내만, 있으면 쉼터와
 * 동일한 카드를 함께 보여줘요**」
 *
 * - **다음 행동 제안을 늘리지 않는다** — 버튼은 `홈으로 돌아가기` 하나이고,
 *   카드가 있을 때만 보조로 `쉼터에서 보기` 가 붙는다(시안 ④-d2)
 * - ⚠ **카드가 없는 날은 아무 설명도 하지 않는다** — 시안 주석이 「「오늘은 카드가
 *   없어요」 금지」라고 못박았다. 없는 것을 굳이 알리면 없는 것이 결핍이 된다
 * - **점수·연속 일수·배지·축하 연출을 쓰지 않는다**
 * - 카드의 **수행 체크는 쉼터에서만** 한다(시안 ④-d2) — 여기서는 읽기다
 *
 * 상단바를 두지 않는다 — 되돌아갈 회고가 이미 끝났다. 그래서 `replace` 로 들어온다.
 *
 * ## 회고 한 벌을 여기서 비운다
 *
 * `C6` 이 아니라 여기다 — 카드를 보여주려면 `actionCard` 가 아직 살아 있어야 한다.
 * 나가는 두 길 모두 비우고 나간다.
 */
export default function RetroDone() {
  const actionCard = useRetro((s) => s.actionCard);
  const resetRetro = useRetro((s) => s.reset);
  const { date: today } = useTodayContext();

  /** 나가는 길은 둘 뿐이고 **둘 다 회고를 닫고** 나간다 */
  const leave = (to: "/home" | "/rest") => {
    resetRetro();
    router.replace(to);
  };

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.copy}>
          {/* 체크 원 56 — 축하 연출이 아니라 확인 표시다 */}
          <View style={styles.check}>
            <Icon name="circle-check" size={24} color={status.positive} />
          </View>
          <Text variant="title3" color={labelColor.strong} style={styles.centered}>
            오늘의 일기를 저장했어요.
          </Text>
          {actionCard != null ? (
            <Text variant="body2Reading" color={labelColor.neutral} style={styles.centered}>
              오늘 이야기에서 하나 챙겨봤어요.
            </Text>
          ) : null}
        </View>

        {/* 쉼터(R2)와 같은 anatomy·같은 문구 — 수행 체크만 거기에 있다 */}
        {actionCard != null ? (
          <Card padding="loose" style={styles.card}>
            <View style={styles.cardHead}>
              <Text variant="headline1" color={labelColor.strong}>
                {`${formatKoreanDateShort(today)} 카드`}
              </Text>
              <Text variant="caption1" color={labelColor.alternative}>
                오늘
              </Text>
            </View>

            <View style={styles.field}>
              <Text variant="label2" color={labelColor.alternative}>
                상황
              </Text>
              <Text variant="body2" color={labelColor.normal}>
                {actionCard.situation}
              </Text>
            </View>

            <View style={styles.field}>
              <Text variant="label2" color={labelColor.alternative}>
                제안된 행동
              </Text>
              <Text variant="body1" color={labelColor.strong}>
                {actionCard.action}
              </Text>
            </View>
          </Card>
        ) : null}
      </View>

      <View style={styles.dock}>
        <Button label="홈으로 돌아가기" fill onPress={() => leave("/home")} />
        {actionCard != null ? (
          <View style={styles.secondary}>
            <Button label="쉼터에서 보기" variant="text" onPress={() => leave("/rest")} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", gap: 28 },
  copy: { alignItems: "center", gap: space.sm },
  check: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    // 초록 18% 원 — 시안의 `rgba(124,158,134,0.18)` 자리다
    backgroundColor: withAlpha(primary.normal, 0.18),
    marginBottom: 2,
  },
  centered: { textAlign: "center" },

  card: { gap: 14 },
  cardHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.md,
  },
  field: { gap: space.xs },

  dock: { gap: space.xs },
  secondary: { alignItems: "center" },
});
