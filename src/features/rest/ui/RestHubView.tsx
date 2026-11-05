import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { Text } from "@/components/ds";
import { RestCardPressable } from "@/components/rest/RestCardPressable";
import { RestWishPreview } from "@/components/rest/RestWishPreview";
import { RestThemeGrid } from "@/components/rest/RestThemeGrid";
import { homeV2, layout, radius, restThemeCard } from "@/design/ds";
import { approvedDesign, type StudioDesign } from "@/design/studioDesign";
import { keepWords } from "@/features/letter/model/letter";
import { REST_CONTENTS_PROMPT, type RestContent } from "@/features/rest/model/contents";

type Props = {
  design?: StudioDesign;
  summary: string;
  contents: readonly RestContent[];
  onOpenCards: () => void;
  onOpenContent: (content: RestContent) => void;
};

/** 스크롤 이벤트 간격(ms) — 흐림을 끄고 켜는 데만 쓴다 */
const SCROLL_THROTTLE = 100;
/** 맨 아래 여백 안쪽이면 끝까지 내린 것으로 본다 */
const MORE_SLACK = 24;

/** Production and Expo Lab share this display-only view. Navigation and recommendation stay in adapters. */
export function RestHubView({
  summary,
  contents,
  onOpenCards,
  onOpenContent,
  design = approvedDesign,
}: Props) {
  const scrollBox = useRef({ y: 0, view: 0, content: 0 });
  const [hasMore, setHasMore] = useState(false);
  const updateMore = () => {
    const { y, view, content } = scrollBox.current;
    setHasMore(view > 0 && content - view - y > MORE_SLACK);
  };
  return (
    <View style={styles.root}>
      <ScrollView
        testID="studio-rest-root"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={SCROLL_THROTTLE}
        onLayout={(e) => {
          scrollBox.current.view = e.nativeEvent.layout.height;
          updateMore();
        }}
        onContentSizeChange={(_, height) => {
          scrollBox.current.content = height;
          updateMore();
        }}
        onScroll={(e) => {
          scrollBox.current.y = e.nativeEvent.contentOffset.y;
          scrollBox.current.view = e.nativeEvent.layoutMeasurement.height;
          scrollBox.current.content = e.nativeEvent.contentSize.height;
          updateMore();
        }}
      >
        <View testID="studio-rest-heading" style={styles.headingPaper}>
          <MaskingTape color={design["rest.heading.backgroundColor"]} />
          <Text
            variant="title3Hand"
            style={[
              styles.heading,
              {
                color: design["rest.heading.color"],
                fontSize: design["rest.heading.fontSize"],
                lineHeight: design["rest.heading.fontSize"] + 6,
              },
            ]}
          >
            쉼터
          </Text>
        </View>

        <RestCardPressable
          accessibilityLabel="바람카드 보기"
          onPress={onOpenCards}
          style={styles.wishPressable}
        >
          <View
            testID="studio-rest-wish-paper"
            style={[
              styles.wishPaper,
              { backgroundColor: design["rest.wishPaper.backgroundColor"] },
            ]}
          >
            <View
              testID="studio-rest-wish-copy"
              style={[styles.wishCopy, { paddingLeft: design["rest.wishPaper.paddingLeft"] }]}
            >
              <Text style={styles.wishTitle} color={colors.ink}>
                바람카드
              </Text>
              <Text
                testID="studio-rest-wish-summary"
                style={{
                  color: design["rest.wishSummary.color"],
                  fontSize: design["rest.wishSummary.fontSize"],
                  lineHeight: design["rest.wishSummary.fontSize"] + 6,
                  fontFamily: design["rest.wishSummary.fontFamily"],
                  textAlign: design["rest.wishSummary.textAlign"] as "left" | "center" | "right",
                  letterSpacing: design["rest.wishSummary.letterSpacing"],
                }}
              >
                {keepWords(summary)}
              </Text>
              <View style={styles.wishLink}>
                <Text style={styles.wishLinkText} color={colors.ink}>
                  모아보기 ›
                </Text>
                <View
                  pointerEvents="none"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={styles.wishLinkLine}
                >
                  <Svg width="100%" height="100%" viewBox="0 0 100 6" preserveAspectRatio="none">
                    <Path
                      d="M1 3.5 C20 1.5 45 5 70 2.5 C82 1.5 92 3.5 99 2.5"
                      fill="none"
                      stroke={restThemeCard.wish.underline}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </Svg>
                </View>
              </View>
            </View>
            <RestWishPreview />
          </View>
        </RestCardPressable>

        <View testID="studio-rest-content-section" style={styles.section}>
          <Text variant="headline1" style={styles.sectionTitle}>
            {REST_CONTENTS_PROMPT}
          </Text>
          <RestThemeGrid items={contents} onOpen={onOpenContent} />
        </View>
      </ScrollView>
      {hasMore ? <RestMoreFade /> : null}
    </View>
  );
}

/** 아래에 더 있다는 표시 — 카드가 탭바 쪽으로 흐려진다. 끝까지 내리면 사라진다 */
function RestMoreFade() {
  return (
    <View
      testID="rest-more-fade"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.moreFade}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="rest-more-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.paper} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.paper} stopOpacity={restThemeCard.moreFadeOpacity} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#rest-more-fade)" />
      </Svg>
    </View>
  );
}

const colors = homeV2.color;
const font = homeV2.font;

const styles = StyleSheet.create({
  root: { flex: 1, marginHorizontal: -layout.screenPadding },
  scroll: { flex: 1 },
  moreFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: restThemeCard.moreFade,
  },
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: 30 },
  headingPaper: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 3,
    transform: [{ rotate: "-3deg" }],
  },
  heading: { fontFamily: font.bold, fontSize: 34, lineHeight: 40, color: colors.ink },
  wishPressable: { marginTop: 20 },
  wishPaper: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.emptyBorder,
  },
  wishCopy: {
    flex: 1,
    alignItems: "flex-start",
    gap: restThemeCard.wish.copyGap,
    paddingVertical: restThemeCard.wish.copyPaddingY,
  },
  wishTitle: { fontFamily: font.bold, ...homeV2.type.sectionTitle },
  wishLink: {
    marginTop: 2,
    paddingBottom: 4,
    transform: [{ rotate: restThemeCard.wish.linkTilt }],
  },
  wishLinkText: { fontFamily: font.bold, ...homeV2.type.add },
  wishLinkLine: { position: "absolute", left: 0, right: 0, bottom: 0, height: 6 },

  section: { paddingTop: 18, gap: 14 },
  sectionTitle: { fontFamily: font.bold, color: colors.ink, alignSelf: "flex-start" },
});
