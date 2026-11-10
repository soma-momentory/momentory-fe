import { Image, type ImageSource } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Button, Text } from "@/components/ds";

import { ScenePillButton } from "./SceneChrome";
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
  weeklyHappiness,
} from "@/design/ds";
import {
  REST_GUIDE_CLOSE,
  REST_GUIDE_NEXT,
  REST_GUIDES,
  type RestGuideContent,
  type RestGuideExample,
} from "@/features/rest/model/restGuide";

const BABA = require("../../../../assets/home/v2/baba-composite.png");

/**
 * 예시 칸의 그림 — 쉼터마다 그 쉼터 장면에 나오는 것을 그대로 쓴다. `steps` 는 문안의 `steps` 와
 * 같은 순서로 한 칸씩, `target` 은 예시 글이 들어가는 상자 · 보물함이다.
 */
type GuideArt = { steps: ImageSource[]; target?: ImageSource; choices?: ImageSource[][] };

const ART: Record<RestGuideContent, GuideArt> = {
  sense_pond: {
    steps: [
      require("../../../../assets/sensory-pond/eye.webp"),
      require("../../../../assets/sensory-pond/sound.webp"),
      require("../../../../assets/sensory-pond/hand.webp"),
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
  wish: { steps: [], target: require("../../../../assets/wish/flower.webp") },
  body_release: {
    steps: [
      require("../../../../assets/body-release/capybara-hands.webp"),
      require("../../../../assets/body-release/capybara-release.webp"),
    ],
  },
  meditation: { steps: [] },
  weekly_happiness: { steps: [] },
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
  content: RestGuideContent;
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
  const [heights, setHeights] = useState<Record<number, number>>({});
  const tallest = Math.max(0, ...Object.values(heights));
  const labelOf = (i: number) =>
    i === guide.pages.length - 1
      ? first
        ? REST_GUIDE_CLOSE.first
        : REST_GUIDE_CLOSE.again
      : REST_GUIDE_NEXT;
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
      {/* 가장 긴 장만큼 자리를 잡고 카드를 그 바닥에 붙인다 — 장을 넘겨도 바바 · 점 · 버튼이 그 자리에 있다 */}
      <View testID="rest-guide-seat" style={[styles.seat, { minHeight: tallest }]}>
        {/* 낭독기 · 키보드에서 뺀다 — 웹은 `aria-hidden` 만 듣고, 버튼은 비활성이어야 Tab 이 들어오지 않는다 */}
        <View pointerEvents="none" aria-hidden style={styles.measure}>
          {guide.pages.map((_, i) => (
            <View
              key={i}
              testID={`rest-guide-measure-${i}`}
              style={[styles.card, styles.measureCard]}
              onLayout={({ nativeEvent }) => {
                const { height } = nativeEvent.layout;
                setHeights((all) => (all[i] === height ? all : { ...all, [i]: height }));
              }}
            >
              <GuidePage content={content} page={i} label={labelOf(i)} link={lastPageLink} />
            </View>
          ))}
        </View>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: rise.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
              transform: [
                {
                  translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [space.xl, 0] }),
                },
              ],
            },
          ]}
        >
          <GuidePage
            content={content}
            page={page}
            label={labelOf(page)}
            onPress={last ? onClose : () => setPage(page + 1)}
            link={lastPageLink}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const noop = () => {};

/** 카드 한 장의 내용 — 보이는 장과 높이를 재는 장이 같은 것을 그린다. `onPress` 가 없으면 재는 장이다 */
function GuidePage({
  content,
  page,
  label,
  onPress,
  link,
}: {
  content: RestGuideContent;
  page: number;
  label: string;
  onPress?: () => void;
  link?: { label: string; onPress: () => void };
}) {
  const measuring = onPress == null;
  const { pages } = REST_GUIDES[content];
  const current = pages[page]!;
  return (
    <>
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
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i === page ? styles.dotOn : null]} />
          ))}
        </View>
        {/* 쉼 콘텐츠 안쪽 버튼은 빈티지 알약 하나의 결이다 — 크림 카드 바로 아래 주 행동이라 꿀빛
            (`DESIGN.md` 쉼 콘텐츠 공통 규칙 5 · 2026-11-10 사용자 요청으로 DS 단색에서 바꿨다) */}
        <ScenePillButton
          label={label}
          tone="accent"
          disabled={measuring}
          onPress={onPress ?? noop}
        />
        {page === pages.length - 1 && link != null ? (
          <View style={styles.link}>
            <Button
              label={link.label}
              labelVariant="label1"
              variant="text"
              size="small"
              disabled={measuring}
              onPress={measuring ? noop : link.onPress}
            />
          </View>
        ) : null}
      </View>
    </>
  );
}

/**
 * 장의 **예시 칸** — 글 대신 보여 준다. 그림 칸이 있으면 칸마다 무엇(작게) · 동작(크게)을,
 * 예시 글이 있으면 점선 쪽지 → 상자 · 보물함을, 고르는 길이 있으면 같은 크기의 그림 · 이름 카드를
 * 나란히 세우고, 그 아래 알약을 둔다. 기록장 줄이 있으면 쉼터 화면과 같은 청록 선으로 칸을 나눈다.
 */
function Example({
  example: { note, steps = [], chips = [], choices = [], rows = [] },
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
      {rows.length > 0 ? (
        <View style={styles.ledger}>
          {rows.map((row) => (
            <View key={row.label} style={styles.ledgerRow}>
              <Text
                variant="caption1"
                color={weeklyHappiness.color.text}
                numberOfLines={1}
                style={styles.ledgerLabel}
              >
                {row.label}
              </Text>
              <View style={styles.ledgerDivider} />
              <Text variant="body2" color={labelColor.normal} style={styles.ledgerEntry}>
                {row.entry}
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
  seat: { justifyContent: "flex-end" },
  // 높이를 재는 장들 — 카드와 같은 폭으로 겹쳐 두고 보이지 않게 한다
  measure: { position: "absolute", top: 0, left: 0, right: 0, opacity: 0 },
  measureCard: { position: "absolute", top: 0, left: 0, right: 0 },
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
  ledger: {
    borderTopWidth: G.ledger.topLine,
    borderTopColor: weeklyHappiness.color.line,
  },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: G.ledger.rowHeight,
    borderBottomWidth: G.ledger.line,
    borderBottomColor: weeklyHappiness.color.line,
  },
  ledgerLabel: { width: G.ledger.labelWidth, textAlign: "center" },
  ledgerDivider: {
    width: G.ledger.line,
    height: G.ledger.divider,
    backgroundColor: weeklyHappiness.color.line,
  },
  ledgerEntry: { flex: 1, paddingHorizontal: space.sm },
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
