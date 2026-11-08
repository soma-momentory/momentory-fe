import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { homeV2, restCards, restThemeCard, text as type } from "@/design/ds";

import { RestPaperClip, RestPaperSheet } from "./RestPaperSheet";

/**
 * 바람카드 칸 오른쪽의 **작은 쪽지 미리보기** — 날짜별 바람카드(`/rest/cards`)의 쪽지와 같은
 * 종이 · 클립 · 공책 줄이다(2026-11-08 · 사용자 요청 — 노을 사진 폴라로이드에서 바꿨다).
 *
 * 가장 최근 카드가 있으면 그 글(`text` — 바랐던 모습, 없으면 작은 행동)을 손글씨 세 줄까지 적는다.
 * 카드가 없으면 빈 줄 쪽지다 — 예시 문장을 지어 넣지 않는다(화면의 값은 서버 것뿐). 장식이라
 * 낭독기에는 읽히지 않는다 — 옆 요약 줄과 칸의 이름이 말한다.
 */
export function RestWishPreview({ text }: { text?: string | null }) {
  return (
    <View
      testID="rest-wish-preview"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.seat}
    >
      <View style={[styles.sheet, styles.back]} />
      <RestPaperSheet tilt={preview.frontTilt} style={[styles.sheet, styles.front]}>
        {text != null && text.trim() !== "" ? (
          <View>
            {/* 글 아래 공책 줄 — 줄 높이마다 하나 */}
            {ROWS.map((_, i) => (
              <View key={i} style={[styles.rule, { top: LINE * (i + 1) - 1 }]} />
            ))}
            <Text
              testID="rest-wish-preview-text"
              variant="label1Hand"
              color={restCards.color.ink}
              numberOfLines={ROWS.length}
            >
              {text.trim()}
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.bar, styles.title]} />
            {ROWS.map((width, i) => (
              <View key={i} style={styles.row}>
                {i === ROWS.length - 1 ? <View style={styles.highlight} /> : null}
                <View style={[styles.bar, { width }]} />
              </View>
            ))}
          </>
        )}
      </RestPaperSheet>
      {/* 쪽지를 집은 클립 — 바람카드 화면의 것을 쪽지 크기에 맞춰 줄인다 */}
      <View style={styles.clip}>
        <RestPaperClip />
      </View>
    </View>
  );
}

/** 공책 줄 위 글 막대의 길이 — 마지막 줄은 「작은 행동」처럼 꿀색 형광이 앞에 붙는다 */
const ROWS = ["88%", "70%", "54%"] as const;
/** 손글씨 한 줄 높이 — 공책 줄 간격이 같다 */
const LINE = type.label1Hand.lineHeight;

const colors = homeV2.color;
const preview = restThemeCard.wish.preview;

const styles = StyleSheet.create({
  seat: {
    width: preview.seatWidth,
    height: preview.seatHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: { position: "absolute", width: preview.width, height: preview.height },
  back: {
    borderRadius: preview.radius,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    backgroundColor: colors.date,
    transform: [{ rotate: preview.backTilt }],
  },
  front: {
    paddingHorizontal: preview.padding + 2,
    paddingTop: preview.padding + 12,
    paddingBottom: preview.padding,
    gap: preview.lineGap,
  },
  title: { width: "46%", marginLeft: "30%", backgroundColor: restCards.color.muted, opacity: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingBottom: preview.lineGap,
    borderBottomWidth: 1,
    borderBottomColor: restCards.color.rule,
  },
  rule: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: restCards.color.rule,
  },
  bar: {
    height: preview.lineHeight,
    borderRadius: preview.lineHeight / 2,
    backgroundColor: colors.emptyBorder,
  },
  highlight: {
    width: 14,
    height: preview.lineHeight + 3,
    borderRadius: 2,
    backgroundColor: restCards.color.highlight,
  },
  // 쪽지 왼쪽 위 — 0.55 배로 줄여 쪽지 윗변을 집게 한다
  clip: {
    position: "absolute",
    top: (preview.seatHeight - preview.height) / 2 + 2,
    left: (preview.seatWidth - preview.width) / 2 - 6,
    transform: [{ scale: 0.55 }],
  },
});
