import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button, Card, Icon, Screen, Text } from "@/components/ds";
import { label as labelColor, layout, primary, space, status, withAlpha } from "@/design/ds";
import { emotionName } from "@/features/emotion/model/emotion";
import { emotionIdOfKey, useRetro } from "@/features/retro/model/retro";
import { useTodayContext } from "@/features/home/model/day";
import { formatKoreanDateShort } from "@/lib/day";

/** 감정 키 목록 → 이름 문자열("화남, 답답함"). 모르는 키는 건너뛴다 */
const emotionNames = (keys: string[]): string =>
  keys
    .map(emotionIdOfKey)
    .filter((id): id is NonNullable<typeof id> => id != null)
    .map(emotionName)
    .join(", ");

/**
 * `C7` · 저장 완료 → 홈
 *
 * `DESIGN.md` 「일기」 5번: 「저장 완료: **바람카드가 없으면 안내만, 있으면 쉼터와
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
  const wishCard = useRetro((s) => s.wishCard);
  const resetRetro = useRetro((s) => s.reset);
  const { date: today } = useTodayContext();

  const wishLabel =
    wishCard?.sentiment === "positive" ? "내 마음을 채워준 것" : "내 마음이 바랐던 것";
  const emotions = wishCard != null ? emotionNames(wishCard.emotions) : "";
  const needs = wishCard != null ? wishCard.needs.map((n) => n.word).join(", ") : "";

  /** 나가는 길은 둘 뿐이고 **둘 다 회고를 닫고** 나간다 */
  const leave = (to: "/home" | "/rest/cards") => {
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
          {wishCard != null ? (
            <Text variant="body2Reading" color={labelColor.neutral} style={styles.centered}>
              오늘 이야기에서 마음을 하나 챙겨봤어요.
            </Text>
          ) : null}
        </View>

        {/* 바람 카드 — 감정 탐색을 거친 경우에만. 비운 항목은 숨긴다 */}
        {wishCard != null ? (
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
                {wishCard.situation}
              </Text>
            </View>

            {emotions.length > 0 ? (
              <View style={styles.field}>
                <Text variant="label2" color={labelColor.alternative}>
                  감정
                </Text>
                <Text variant="body2" color={labelColor.normal}>
                  {emotions}
                </Text>
              </View>
            ) : null}

            {needs.length > 0 ? (
              <View style={styles.field}>
                <Text variant="label2" color={labelColor.alternative}>
                  {wishLabel}
                </Text>
                <Text variant="body2" color={labelColor.normal}>
                  {needs}
                </Text>
              </View>
            ) : null}

            {wishCard.desiredState != null ? (
              <View style={styles.field}>
                <Text variant="label2" color={labelColor.alternative}>
                  바랐던 모습
                </Text>
                <Text variant="body2" color={labelColor.normal}>
                  {wishCard.desiredState}
                </Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text variant="label2" color={labelColor.alternative}>
                작은 행동
              </Text>
              <Text variant="body1" color={labelColor.strong}>
                {wishCard.smallAction ?? "아직 정하지 않음"}
              </Text>
            </View>
          </Card>
        ) : null}
      </View>

      <View style={styles.dock}>
        <Button label="홈으로 돌아가기" fill onPress={() => leave("/home")} />
        {wishCard != null ? (
          <View style={styles.secondary}>
            {/*
              쉼터 바람카드(R2)로 바로 간다. `/rest` 는 (tabs)·(onboarding) 두 그룹에
              같은 경로가 있어 온보딩으로 새는 반면, `/rest/cards` 는 실제 경로라 안전하다.
            */}
            <Button
              label="쉼터에서 보기"
              variant="text"
              size="small"
              onPress={() => leave("/rest/cards")}
            />
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

  // 주 버튼과 보조 버튼 사이 — 같은 짝을 쓰는 화면이 전부 같은 값이다(`layout.dockActionGap`)
  dock: { gap: layout.dockActionGap },
  secondary: { alignItems: "center" },
});
