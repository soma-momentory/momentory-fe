import { Image } from "expo-image";
import { ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { RestCardPressable } from "@/components/rest/RestCardPressable";
import { RestContentGrid } from "@/components/rest/RestContentGrid";
import { homeV2, layout } from "@/design/ds";
import { REST_CONTENTS_PROMPT, type RestContent } from "@/features/rest/model/contents";

type Props = {
  summary: string;
  contents: readonly RestContent[];
  onOpenCards: () => void;
  onOpenContent: (content: RestContent) => void;
};

/** Production and Expo Lab share this display-only view. Navigation and recommendation stay in adapters. */
export function RestHubView({ summary, contents, onOpenCards, onOpenContent }: Props) {
  const longSummary = summary.length > 60;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headingPaper}>
        <Text variant="title3Hand" style={styles.heading}>
          쉼터
        </Text>
      </View>

      <RestCardPressable
        accessibilityLabel="바람카드 보기"
        onPress={onOpenCards}
        style={styles.wishPressable}
      >
        <View style={[styles.wishPaper, longSummary && styles.wishPaperLong]}>
          <View style={styles.wishTape} />
          <View style={styles.wishCopy}>
            <Text variant="caption1" style={styles.wishEyebrow}>
              내 바람카드
            </Text>
            <Text variant={longSummary ? "body1" : "heading1"} style={styles.wishSummary}>
              {summary}
            </Text>
            <Text variant="caption1" style={styles.wishLink}>
              바람카드 모아보기 ›
            </Text>
          </View>
          <View style={styles.wishPhoto}>
            <View style={styles.wishPhotoImage}>
              <Image
                source={require("../../../../assets/rest/baba-sleep.webp")}
                style={styles.wishBaba}
                contentFit="contain"
              />
            </View>
            <Text variant="caption2" style={styles.wishPhotoCaption}>
              쉬는 중
            </Text>
            <View style={styles.photoTape} />
          </View>
        </View>
      </RestCardPressable>

      <View style={styles.section}>
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
  content: { paddingHorizontal: layout.screenPadding, paddingTop: 8, paddingBottom: 30 },
  headingPaper: {
    alignSelf: "flex-start",
    backgroundColor: colors.date,
    paddingHorizontal: 16,
    paddingVertical: 3,
    transform: [{ rotate: "-3deg" }],
  },
  heading: { fontFamily: font.bold, color: colors.ink },
  wishPressable: { marginTop: 24, marginRight: 4 },
  wishPaper: {
    minHeight: 136,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.emptyBorder,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 126,
  },
  wishPaperLong: { paddingTop: 116, paddingRight: 16 },
  wishTape: {
    position: "absolute",
    left: -8,
    top: -9,
    width: 56,
    height: 18,
    backgroundColor: colors.today,
    opacity: 0.85,
    transform: [{ rotate: "-14deg" }],
  },
  wishCopy: { gap: 4 },
  wishEyebrow: { fontFamily: font.regular, color: colors.muted },
  wishSummary: { fontFamily: font.bold, color: colors.ink },
  wishLink: { fontFamily: font.bold, color: colors.green, marginTop: 4 },
  wishPhoto: {
    position: "absolute",
    right: 10,
    top: -14,
    width: 108,
    height: 126,
    backgroundColor: colors.white,
    padding: 6,
    transform: [{ rotate: "3deg" }],
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  wishPhotoImage: { flex: 1, backgroundColor: colors.greenSoft },
  wishBaba: { width: "100%", height: "100%" },
  wishPhotoCaption: { fontFamily: font.regular, color: colors.muted, textAlign: "center" },
  photoTape: {
    position: "absolute",
    left: 30,
    top: -8,
    width: 50,
    height: 16,
    backgroundColor: colors.tapeStripe,
    transform: [{ rotate: "-6deg" }],
  },
  section: { paddingTop: 32, gap: 22 },
  sectionTitle: { fontFamily: font.bold, color: colors.ink, alignSelf: "flex-start" },
});
