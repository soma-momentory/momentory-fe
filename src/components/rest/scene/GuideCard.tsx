import { type ReactNode, useEffect, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

import { Icon, Text } from "@/components/ds";
import {
  label as labelColor,
  radius,
  restGuideTape,
  restMoodMotion,
  restMoodSize,
  restScene,
  restSceneSize,
  space,
  withAlpha,
} from "@/design/ds";
import { REST_CONTENTS } from "@/features/rest/model/contents";
import {
  REST_GUIDE_CLOSE,
  REST_GUIDE_HOW,
  REST_GUIDE_WHY,
  REST_GUIDES,
} from "@/features/rest/model/restGuide";
import type { RestRecordContent } from "@/features/rest/model/restRecord";

import { ScenePillButton } from "./SceneChrome";

/**
 * 쉼터 **설명 카드** (2026-10-12 · 사용자와 정함) — 처음 들어간 쉼터에서 저절로, 그 뒤로는 뒤로가기 원
 * 옆 「?」 원으로 뜬다(`useRestGuide`).
 *
 * 처음에는 기분 쪽지처럼 비스듬한 손글씨 쪽지였는데, 효용과 「왜 들였는지」까지 담으려니 쪽지로는
 * 글이 많아 **반듯한 안내 카드**로 다시 짰다(같은 날 · 사용자 요청). 장면 위에 크림빛 막이 깔리고
 * (기분 쪽지와 같은 짙기) 가운데에 카드가 아래에서 천천히 떠오른다.
 *
 * 카드는 쉼터 안 버튼과 같은 빈티지 결이다 — 크림 면 · 잉크 선 · 단단한 그림자. 머리는 쉼터 탭 카드와
 * 같은 이름 · 아이콘이고, 그 아래 한 줄 소개 · 「이럴 때 좋아요」 · 「이렇게 해요」(번호 원 셋)가 선다.
 * 작은 화면에서 넘치면 카드 안이 스크롤된다. 닫는 알약은 처음엔 「시작할게요」, 「?」로 열면 「알겠어요」.
 */
export function GuideCard({
  content,
  first,
  onClose,
}: {
  content: RestRecordContent;
  first: boolean;
  onClose: () => void;
}) {
  const guide = REST_GUIDES[content];
  const { title, icon } = REST_CONTENTS.find((c) => c.id === guide.id)!;
  const insets = useSafeAreaInsets();
  const [veil] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // 막은 기분 쪽지와 같은 박자로 깔리고, 카드는 쪽지가 내려앉는 만큼 걸려 떠오른다
    const it = Animated.parallel([
      Animated.timing(veil, { toValue: 1, duration: restMoodMotion.veil, useNativeDriver: true }),
      Animated.timing(rise, {
        toValue: 1,
        duration: restMoodMotion.land,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
    ]);
    it.start();
    return () => it.stop();
  }, [veil, rise]);

  return (
    <View
      testID="rest-guide-card"
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, { opacity: veil }]} />
      <Animated.View
        style={[
          styles.column,
          {
            opacity: rise.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [space.xl, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.cardWrap}>
          <View style={styles.shadow} />
          <View style={styles.card}>
            <ScrollView bounces={false} style={styles.scroll} contentContainerStyle={styles.body}>
              <View style={styles.head}>
                <View style={styles.iconRing}>
                  <Icon name={icon} size={24} color={restScene.ink} />
                </View>
                <Text variant="title3Hand" color={restScene.ink}>
                  {title}
                </Text>
              </View>
              <Text variant="body1" color={labelColor.normal}>
                {guide.tagline}
              </Text>
              <View style={styles.rule} />
              <Section label={REST_GUIDE_WHY}>
                <Text variant="body1" color={labelColor.normal}>
                  {guide.why}
                </Text>
              </Section>
              <Section label={REST_GUIDE_HOW}>
                {guide.steps.map((step, i) => (
                  <View key={step} style={styles.step}>
                    <View style={styles.num}>
                      <Text variant="label1" color={restScene.ink}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text variant="body1" color={labelColor.normal} style={styles.stepText}>
                      {step}
                    </Text>
                  </View>
                ))}
                {guide.note != null ? (
                  <Text variant="body2" color={labelColor.neutral}>
                    {guide.note}
                  </Text>
                ) : null}
              </Section>
            </ScrollView>
          </View>
        </View>
        <ScenePillButton
          tone="accent"
          label={first ? REST_GUIDE_CLOSE.first : REST_GUIDE_CLOSE.again}
          onPress={onClose}
        />
      </Animated.View>
    </View>
  );
}

/**
 * 소제목 — 본문과 같은 크기 · 옅은 색이면 묻혔다(2026-10-12 · 사용자 피드백). 손으로 붙인 **줄무늬
 * 테이프** 위에 손글씨로 적는다(`restGuideTape` · 사용자 레퍼런스) — 「테이프에 적은 제목」 단(`tapeHand`).
 */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.tapeLabel}>
        <Svg style={styles.tape} pointerEvents="none" accessible={false}>
          <Defs>
            <Pattern
              id="rest-guide-tape"
              width={T.stripeGap}
              height={T.stripeGap}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <Rect width={T.stripeWidth} height={T.stripeGap} fill={T.stripe} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill={T.color} />
          <Rect width="100%" height="100%" fill="url(#rest-guide-tape)" />
        </Svg>
        <Text variant="tapeHand" color={restScene.ink}>
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

const V = restSceneSize.vintage;
const T = restGuideTape;
/** 단계 번호 원 — 본문 첫 줄(26) 가운데에 오도록 */
const NUM = 24;
const ICON_RING = 44;

const styles = StyleSheet.create({
  overlay: { justifyContent: "center", paddingHorizontal: space.xl },
  // 장면 위 크림빛 한 겹 — 기분 쪽지와 같은 짙기(어둡게 덮지 않는다)
  veil: { backgroundColor: withAlpha(restScene.veil, restMoodSize.veilOpacity) },
  column: { flexShrink: 1, gap: space.xl },
  cardWrap: { flexShrink: 1 },
  // 카드 아래 단단한 그림자 — 빈티지 버튼과 같은 결(번지지 않는다)
  shadow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: V.depth,
    bottom: -V.depth,
    borderRadius: radius.xlarge,
    backgroundColor: restScene.shadow,
  },
  card: {
    flexShrink: 1,
    overflow: "hidden",
    borderRadius: radius.xlarge,
    borderWidth: V.stroke,
    borderColor: restScene.ink,
    backgroundColor: restScene.surface,
  },
  scroll: { flexGrow: 0 },
  body: { paddingVertical: space.xl, paddingHorizontal: space.xl, gap: space.md },
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  iconRing: {
    width: ICON_RING,
    height: ICON_RING,
    borderRadius: ICON_RING / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha(restScene.accent, 0.5),
  },
  rule: { height: 1, backgroundColor: withAlpha(restScene.ink, 0.12) },
  section: { gap: space.sm },
  // 테이프는 글자 아래쪽 절반 남짓에 깔리고 양옆으로 조금 삐져나온다 — 글자 시작은 본문과 맞춘다
  tapeLabel: { alignSelf: "flex-start" },
  tape: {
    position: "absolute",
    left: -T.bleed,
    right: -T.bleed,
    top: `${T.top * 100}%`,
    bottom: 0,
  },
  step: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  num: {
    width: NUM,
    height: NUM,
    marginTop: 1,
    borderRadius: NUM / 2,
    borderWidth: 1.5,
    borderColor: restScene.ink,
    backgroundColor: restScene.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { flex: 1 },
});
