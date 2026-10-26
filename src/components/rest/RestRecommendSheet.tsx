import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { BottomSheet, Button, Text } from "@/components/ds";
import { fill, label as labelColor, layout, radius, space } from "@/design/ds";
import type { RestContent, RestContentId } from "@/features/rest/model/contents";

/**
 * 쉼터 화면 가운데의 장면 — 위 안내 글과 아래 카드 사이의 띠를 잘라 만들었다
 * (`scripts/make-rest-recommend-art.py`). 들어가면 보게 될 장면을 시트가 미리 보여 준다.
 */
const ART: Record<RestContentId, number> = {
  sensePond: require("../../../assets/sensory-pond/recommend.webp"),
  worryBox: require("../../../assets/worry-box/recommend.webp"),
  treasureBox: require("../../../assets/treasure-box/recommend.webp"),
  bodyRelease: require("../../../assets/body-release/recommend.webp"),
};

/** 그림 칸의 가로:세로 — 그림을 자른 비율(`make-rest-recommend-art.py` `ASPECT`)과 같다 */
const ART_ASPECT = 1.8;

/**
 * 일기를 쓴 날 쉼터(`R1`)에 올라오는 **쉼 추천 시트** (2026-10-12 · 사용자와 정함).
 *
 * 글자만 있던 첫 판이 밋밋해서 사용자 시안대로 다시 짰다(같은 날):
 *
 * - 맨 위 작은 한 줄은 **왜 골랐는지**(`reason`) — 무작위면 「바바가 하나 골라 봤어요」
 * - 그 쉼터의 **장면 그림** 한 장 — 카피바라와 소품이 앉은 화면 가운데
 * - 제목은 **하자는 말**(`invite`), 그 아래 **하고 나면 무엇이 달라지는지** 한 줄(`benefit`)
 * - 알약 셋 — 쉼터 이름 · 하는 일 · 걸리는 시간. 시간을 보여 줘 부담을 낮춘다
 * - 주 버튼 「지금 해 볼게요」 하나, 그 아래 「다른 쉼터 둘러보기」 — 닫고 쉼터에 남는다.
 *   ✕ · 쓸어내리기 · 바깥 누르기와 같은 닫기다(공용 시트가 맡는다)
 *
 * 「오늘의 일기를 저장했어요」는 뺐다(사용자 요청) — 쉼터로 넘어온 것이 곧 저장이 끝났다는 뜻이다.
 * **모달이 아니라 시트다** — 화면을 막는 모달은 되돌릴 수 없는 행동의 확인에만 쓴다(`DESIGN.md`).
 */
type Props = {
  content: RestContent;
  reason: string;
  onAccept: () => void;
  onDismiss: () => void;
};

export function RestRecommendSheet({ content, reason, onAccept, onDismiss }: Props) {
  return (
    <BottomSheet eyebrow={reason} closable onDismiss={onDismiss}>
      {/* 장식이다 — 무엇을 하는지는 아래 글이 말한다. 비율은 틀이 잡고 그림은 그 안을 채운다
          (RN `Image` 는 원본 크기로 그려져 시트가 화면 밖으로 넘쳤다 · 2026-10-12 시뮬레이터 —
          쉼터 기록 화면처럼 `expo-image` 로 채운다) */}
      <View style={styles.art} {...decorativeAccessibilityProps}>
        <Image
          testID="rest-recommend-art"
          source={ART[content.id]}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
          accessible={false}
        />
      </View>

      <View style={styles.copy}>
        <Text variant="heading1" color={labelColor.strong}>
          {content.invite}
        </Text>
        <Text variant="body2" color={labelColor.neutral}>
          {content.benefit}
        </Text>
      </View>

      <View style={styles.pills}>
        {[content.title, content.activity, content.duration].map((pill) => (
          <View key={pill} style={styles.pill}>
            <Text variant="label2" color={labelColor.normal}>
              {pill}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="지금 해 볼게요" fill raised onPress={onAccept} />
        <View style={styles.secondary}>
          <Button label="다른 쉼터 둘러보기" variant="text" size="small" onPress={onDismiss} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  art: { aspectRatio: ART_ASPECT, borderRadius: radius.xlarge, overflow: "hidden" },
  copy: { gap: space.xs },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  // 알약은 글자를 감싸는 자국이지 버튼이 아니다 — 주간 리포트의 바람 알약과 같은 결(`WeekWishCard`)
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    backgroundColor: fill.normal,
  },
  // 주 버튼과 보조 버튼 사이 — 같은 짝을 쓰는 화면이 전부 같은 값이다(`layout.dockActionGap`)
  actions: { gap: layout.dockActionGap },
  secondary: { alignItems: "center" },
});
