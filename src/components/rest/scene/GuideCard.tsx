import { Image, type ImageSource } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Button, Text } from "@/components/ds";
import {
  background,
  elevation,
  label as labelColor,
  line,
  primary,
  radius,
  restGuideSize,
  restMoodMotion,
  retroDiary,
  space,
} from "@/design/ds";
import {
  REST_GUIDE_CLOSE,
  REST_GUIDE_NEXT,
  REST_GUIDES,
  type RestGuideExample,
} from "@/features/rest/model/restGuide";
import type { RestRecordContent } from "@/features/rest/model/restRecord";

const BABA = require("../../../../assets/home/v2/baba-composite.png");

/**
 * 예시 칸의 그림 — 쉼터마다 그 쉼터 장면에 나오는 것을 그대로 쓴다. `steps` 는 문안의 `steps` 와
 * 같은 순서로 한 칸씩, `target` 은 예시 글이 들어가는 상자 · 보물함이다.
 */
type GuideArt = { steps: ImageSource[]; target?: ImageSource; choices?: ImageSource[][] };

const ART: Record<RestRecordContent, GuideArt> = {
  sense_pond: {
    steps: [
      require("../../../../assets/sensory-pond/lily-01.png"),
      require("../../../../assets/sensory-pond/sound-mark-01.png"),
      require("../../../../assets/sensory-pond/touch-flower.png"),
    ],
  },
  worry_box: {
    steps: [],
    target: require("../../../../assets/worry-box/box-closed.webp"),
    // 고르는 길의 끝 모습 — 맡겨두면 상자 곁에서 쉬고, 흘려보내면 상자를 이고 멀어진다
    choices: [
      [
        require("../../../../assets/worry-box/capybara-rest.webp"),
        require("../../../../assets/worry-box/box-closed.webp"),
      ],
      [require("../../../../assets/worry-box/capybara-walk1.webp")],
    ],
  },
  treasure_box: { steps: [], target: require("../../../../assets/treasure-box/chest-closed.webp") },
  body_release: {
    steps: [
      require("../../../../assets/body-release/capybara-hands.webp"),
      require("../../../../assets/body-release/capybara-release.webp"),
    ],
  },
  meditation: { steps: [] },
};

/**
 * 쉼터 **설명 카드** (2026-11-01 · 사용자가 고른 세 장 시안) — 처음 들어간 쉼터에서 저절로, 그 뒤로는
 * 뒤로가기 원 옆 「?」 원으로 뜬다(`useRestGuide`).
 *
 * 바바가 세 장에 걸쳐 한 가지씩 말한다(BeCappy 의 기능 설명 카드 결 · 사용자 레퍼런스). 장마다
 * 위에서부터 (예시가 있는 장만) 예시 칸 → 바바 말풍선 → 바바 → 장 표시 점 → 버튼이다. 버튼은 「다음」이고
 * 마지막 장만 처음엔 「시작할게요」, 「?」로 열면 「알겠어요」다.
 *
 * 카드 · 버튼 · 말풍선은 **앱 공통 틀**이다 — 흰 면 · 모달 반경 · 번지는 옅은 그림자 · 앱 공통 어두운
 * 막 · 회고의 베이지 바바 말풍선 · 공용 초록 `Button`. 2026-10-12 판은 쉼터 장면 안의 빈티지 결(크림 면 ·
 * 잉크 선 · 단단한 그림자 · 꿀빛 알약)이었는데, 쉼터만 다른 화면과 따로 논다는 평가를 받았다.
 */
export function GuideCard({
  content,
  first,
  onClose,
  lastPageLink,
}: {
  content: RestRecordContent;
  first: boolean;
  onClose: () => void;
  /** 마지막 장 버튼 아래의 글자 버튼 — 3분 명상이 출처로 가는 길이다 */
  lastPageLink?: { label: string; onPress: () => void };
}) {
  const guide = REST_GUIDES[content];
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [veil] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(0));
  const current = guide.pages[page]!;
  const last = page === guide.pages.length - 1;

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
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: veil }]} />
      <Animated.View
        style={[
          styles.card,
          {
            opacity: rise.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [space.xl, 0] }) },
            ],
          },
        ]}
      >
        {current.example != null ? <Example example={current.example} art={ART[content]} /> : null}
        <View style={styles.body}>
          <View style={styles.bubble}>
            <Text variant="body1ReadingHandLg" color={labelColor.normal} style={styles.bubbleText}>
              {current.text}
            </Text>
            <Svg width={G.tail.width} height={G.tail.height} style={styles.tail} accessible={false}>
              <Path
                d={`M0 0 H${G.tail.width} L${G.tail.width / 2} ${G.tail.height} Z`}
                fill={retroDiary.question}
              />
            </Svg>
          </View>
          <Image source={BABA} style={styles.baba} contentFit="contain" accessible={false} />
        </View>
        <View style={styles.footer}>
          <View style={styles.dots} accessible={false}>
            {guide.pages.map((_, i) => (
              <View key={i} style={[styles.dot, i === page ? styles.dotOn : null]} />
            ))}
          </View>
          <Button
            label={
              last ? (first ? REST_GUIDE_CLOSE.first : REST_GUIDE_CLOSE.again) : REST_GUIDE_NEXT
            }
            labelVariant="headline1"
            fill
            onPress={last ? onClose : () => setPage(page + 1)}
          />
          {last && lastPageLink != null ? (
            <View style={styles.link}>
              <Button
                label={lastPageLink.label}
                labelVariant="label1"
                variant="text"
                size="small"
                onPress={lastPageLink.onPress}
              />
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * 장의 **예시 칸** — 글 대신 보여 준다. 그림 칸이 있으면 칸마다 무엇(작게) · 동작(크게)을,
 * 예시 글이 있으면 점선 쪽지 → 상자 · 보물함을, 고르는 길이 있으면 같은 크기의 그림 · 이름 카드를
 * 나란히 세우고, 그 아래 알약을 둔다.
 */
function Example({
  example: { note, steps = [], chips = [], choices = [] },
  art,
}: {
  example: RestGuideExample;
  art: GuideArt;
}) {
  return (
    <View style={styles.example}>
      {steps.length > 0 ? (
        <View style={styles.steps}>
          {steps.map((s, i) => (
            <View key={s.what} style={styles.step}>
              <View style={styles.tile}>
                <Image source={art.steps[i]} style={styles.tileArt} contentFit="contain" />
              </View>
              <Text variant="caption1" color={labelColor.neutral} numberOfLines={1}>
                {s.what}
              </Text>
              <Text variant="body2" color={labelColor.normal} numberOfLines={1}>
                {s.act}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {note != null ? (
        <View style={styles.noteRow}>
          <View style={styles.note}>
            <Text variant="body2" color={labelColor.normal}>
              {note}
            </Text>
          </View>
          <Text variant="body2" color={labelColor.neutral}>
            ›
          </Text>
          {art.target != null ? (
            <Image source={art.target} style={styles.target} contentFit="contain" />
          ) : null}
        </View>
      ) : null}
      {choices.length > 0 ? (
        <View style={styles.choices}>
          {choices.map((c, i) => (
            <View key={c} style={styles.choice}>
              <View style={styles.choiceArt}>
                {(art.choices?.[i] ?? []).map((src, j) => (
                  <Image key={j} source={src} style={styles.choiceImage} contentFit="contain" />
                ))}
              </View>
              <Text variant="label1" color={labelColor.normal}>
                {c}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((c) => (
            <View key={c} style={styles.chip}>
              <Text variant="label1" color={labelColor.normal}>
                {c}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const G = restGuideSize;

const styles = StyleSheet.create({
  overlay: { justifyContent: "center", paddingHorizontal: space.xl },
  dim: { backgroundColor: G.dim },
  card: {
    borderRadius: radius.xlarge,
    backgroundColor: background.elevated,
    paddingTop: space.xl2,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    gap: space.lg,
    ...elevation.overlay,
  },
  example: {
    borderRadius: radius.large,
    backgroundColor: background.alternative,
    padding: space.md,
    gap: space.sm,
  },
  steps: { flexDirection: "row", justifyContent: "space-around" },
  step: { alignItems: "center", gap: space.xs2 },
  tile: {
    width: G.tile,
    height: G.tile,
    borderRadius: radius.large,
    backgroundColor: background.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  tileArt: { width: G.tileArt, height: G.tileArt },
  noteRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  note: {
    flex: 1,
    borderRadius: radius.medium,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: line.neutral,
    backgroundColor: background.elevated,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  target: { width: G.target, height: G.target },
  choices: { flexDirection: "row", gap: space.sm },
  choice: {
    flex: 1,
    alignItems: "center",
    gap: space.xs,
    borderRadius: radius.large,
    backgroundColor: background.elevated,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
  },
  // 두 카드의 그림 자리를 같은 크기로 — 그림이 하나든 둘이든 카드 크기가 같다
  choiceArt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    width: G.choiceArt.width,
    height: G.choiceArt.height,
  },
  choiceImage: { width: G.choiceArt.width / 2, height: G.choiceArt.height },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm },
  chip: {
    borderRadius: radius.full,
    backgroundColor: retroDiary.question,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
  // 회고의 바바 말풍선과 같은 베이지 단색 · 테두리와 그림자 없이 아래 가운데 짧은 꼬리
  bubble: {
    borderRadius: retroDiary.radius,
    backgroundColor: retroDiary.question,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    marginBottom: G.tail.height,
  },
  bubbleText: { textAlign: "center" },
  tail: { position: "absolute", bottom: -G.tail.height + 1, alignSelf: "center" },
  // 처음 판(사이 12)보다 위아래를 조금씩 더 띄운다(2026-11-01 · 사용자 요청)
  body: { gap: space.lg },
  footer: { gap: space.md },
  // 글자 버튼을 앞 버튼과 카드 끝 사이 한가운데에 — 위아래 여백이 같고 카드가 늘지 않게 줄인다
  link: { marginTop: -G.link.top, marginBottom: -G.link.bottom },
  baba: { width: G.baba, aspectRatio: 436 / 600, alignSelf: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: space.sm - space.xs2 },
  dot: { width: G.dot, height: G.dot, borderRadius: G.dot / 2, backgroundColor: line.alternative },
  dotOn: { backgroundColor: primary.heavy },
});
