import { Image } from "expo-image";
import { ScrollView, StyleSheet, View } from "react-native";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { Text } from "@/components/ds";
import { RestCardPressable } from "@/components/rest/RestCardPressable";
import { RestContentGrid } from "@/components/rest/RestContentGrid";
import { homeV2, layout } from "@/design/ds";
import { approvedDesign, type StudioDesign } from "@/design/studioDesign";
import { studioAssetSource } from "@/design/studioAssets";
import { REST_CONTENTS_PROMPT, type RestContent } from "@/features/rest/model/contents";

type Props = {
  design?: StudioDesign;
  summary: string;
  contents: readonly RestContent[];
  onOpenCards: () => void;
  onOpenContent: (content: RestContent) => void;
};

/** Production and Expo Lab share this display-only view. Navigation and recommendation stay in adapters. */
export function RestHubView({
  summary,
  contents,
  onOpenCards,
  onOpenContent,
  design = approvedDesign,
}: Props) {
  const longSummary = summary.length > 60;
  return (
    <ScrollView
      testID="studio-rest-root"
      style={styles.root}
      contentContainerStyle={styles.content}
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
            longSummary && styles.wishPaperLong,
            {
              backgroundColor: design["rest.wishPaper.backgroundColor"],
              paddingLeft: design["rest.wishPaper.paddingLeft"],
            },
          ]}
        >
          <View testID="studio-rest-wish-copy" style={styles.wishCopy}>
            <Text variant="caption1" style={styles.wishEyebrow}>
              바람카드
            </Text>
            <Text
              testID="studio-rest-wish-summary"
              variant={longSummary ? "body1" : "heading1"}
              style={[
                styles.wishSummary,
                {
                  color: design["rest.wishSummary.color"],
                  fontSize: design["rest.wishSummary.fontSize"],
                  lineHeight: design["rest.wishSummary.fontSize"] + 4,
                  fontFamily: design["rest.wishSummary.fontFamily"],
                  textAlign: design["rest.wishSummary.textAlign"] as "left" | "center" | "right",
                  letterSpacing: design["rest.wishSummary.letterSpacing"],
                },
              ]}
            >
              {summary}
            </Text>
            <Text variant="caption1" style={styles.wishLink}>
              바람카드 모아보기 ›
            </Text>
          </View>
          <View
            testID="studio-rest-wish-photo"
            style={[
              styles.wishPhoto,
              {
                width: design["rest.wishPhoto.width"],
                transform: [{ rotate: `${design["rest.wishPhoto.rotation"]}deg` }],
              },
            ]}
          >
            <View style={styles.wishPhotoImage}>
              <Image
                testID="studio-rest-baba-image"
                source={studioAssetSource(design["rest.babaImage.assetId"])}
                style={[styles.wishBaba, { opacity: design["rest.babaImage.opacity"] }]}
                contentFit="contain"
              />
            </View>
            <Text variant="caption2" style={styles.wishPhotoCaption}>
              쉬는 중
            </Text>
          </View>
        </View>
      </RestCardPressable>

      <View testID="studio-rest-content-section" style={styles.section}>
        <Text variant="headline1" style={styles.sectionTitle}>
          {REST_CONTENTS_PROMPT}
        </Text>
        <RestContentGrid items={contents} onOpen={onOpenContent} />
      </View>
    </ScrollView>
  );
}

const colors = homeV2.color;
const font = homeV2.font;

const styles = StyleSheet.create({
  root: { flex: 1, marginHorizontal: -layout.screenPadding },
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: 30 },
  headingPaper: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 3,
    transform: [{ rotate: "-3deg" }],
  },
  heading: { fontFamily: font.bold, fontSize: 34, lineHeight: 40, color: colors.ink },
  wishPressable: { marginTop: 20, marginRight: 4 },
  wishPaper: {
    minHeight: 110,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.emptyBorder,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 126,
  },
  wishPaperLong: { paddingTop: 116, paddingRight: 16 },

  wishCopy: { gap: 2 },
  wishEyebrow: { fontFamily: font.regular, fontSize: 15, lineHeight: 18, color: colors.muted },
  wishSummary: { fontFamily: font.bold, fontSize: 20, lineHeight: 24, color: colors.ink },
  wishLink: { fontFamily: font.bold, fontSize: 14, lineHeight: 18, color: colors.green },
  wishPhoto: {
    position: "absolute",
    right: 10,
    top: -14,
    width: 108,
    height: 126,
    backgroundColor: colors.white,
    padding: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  wishPhotoImage: { flex: 1, backgroundColor: colors.greenSoft },
  wishBaba: { width: "100%", height: "100%" },
  wishPhotoCaption: { fontFamily: font.regular, color: colors.muted, textAlign: "center" },

  section: { paddingTop: 18, gap: 14 },
  sectionTitle: { fontFamily: font.bold, color: colors.ink, alignSelf: "flex-start" },
});
