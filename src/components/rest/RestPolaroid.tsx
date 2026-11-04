import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { homeV2, meditation, restRecommendSize } from "@/design/ds";
import type { RestContent, RestContentId } from "@/features/rest/model/contents";

const PHOTOS: Record<RestContentId, number> = {
  wish: require("../../../assets/rest/wish.webp"),
  sensePond: require("../../../assets/rest/rest-records.webp"),
  worryBox: require("../../../assets/rest/worries.webp"),
  treasureBox: require("../../../assets/rest/treasures.webp"),
  // TODO(design): replace the temporary sleeping Baba reference with the approved
  // body-release illustration; the HTML draft used a treasure-box image here.
  bodyRelease: require("../../../assets/rest/baba-sleep.webp"),
  meditation: require("../../../assets/meditation/wave.webp"),
};

const PHOTO_BACKGROUNDS: Record<RestContentId, string> = {
  wish: homeV2.color.greenSoft,
  sensePond: homeV2.color.greenSoft,
  worryBox: homeV2.color.date,
  treasureBox: homeV2.color.today,
  bodyRelease: homeV2.color.greenSoft,
  meditation: meditation.scene.wave,
};

/**
 * 쉼터의 **폴라로이드 칸 하나** — 사진 · 이름 · 시간 · 설명. 온보딩 소개 그림의 격자(`RestContentGrid`)와
 * 쉼 추천 시트(`RestRecommendSheet`)가 함께 쓴다. 쉼터 탭은 2026-11-04 부터 테마 카드(`RestThemeCard`)다.
 *
 * `size="sheet"` 는 칸이 혼자 서는 시트의 크기다. 사진을 조금 키우고, 3초 안에 읽혀야 하는 설명
 * 글자를 한 단 올린다(2026-11-02).
 */
export function RestPolaroid({
  item,
  size = "grid",
}: {
  item: RestContent;
  size?: "grid" | "sheet";
}) {
  const largeText = useEffectiveFontScale() > 1.2;
  const inSheet = size === "sheet";

  return (
    <View style={styles.polaroid}>
      <View
        style={[
          styles.photo,
          inSheet && styles.photoSheet,
          { backgroundColor: PHOTO_BACKGROUNDS[item.id] },
        ]}
      >
        <Image
          source={PHOTOS[item.id]}
          style={styles.photoImage}
          contentFit={item.id === "bodyRelease" ? "contain" : "cover"}
        />
      </View>
      <View style={styles.caption}>
        <View style={[styles.heading, largeText && styles.headingLarge]}>
          <Text
            variant="headline1"
            numberOfLines={2}
            style={[styles.title, largeText && styles.titleLarge]}
          >
            {item.title}
          </Text>
          <Text variant="caption2" style={[styles.duration, largeText && styles.durationLarge]}>
            {item.duration.replace(/^약 /, "")}
          </Text>
        </View>
        <Text variant={inSheet ? "label2" : "caption1"} style={styles.description}>
          {item.description}
        </Text>
        {item.note != null ? (
          <Text variant="caption2" style={styles.note}>
            {item.note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const colors = homeV2.color;
const font = homeV2.font;

const styles = StyleSheet.create({
  polaroid: {
    flexGrow: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.emptyBorder,
    padding: 7,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  photo: { height: 106, overflow: "hidden" },
  photoSheet: { height: restRecommendSize.photo },
  photoImage: { width: "100%", height: "100%" },
  caption: { paddingHorizontal: 3, paddingTop: 7, paddingBottom: 3, gap: 3 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  headingLarge: { flexDirection: "column", alignItems: "stretch" },
  title: { flex: 1, fontFamily: font.bold, color: colors.ink },
  titleLarge: { flex: 0 },
  duration: { flexShrink: 0, fontFamily: font.bold, color: colors.green },
  durationLarge: { alignSelf: "flex-end" },
  description: { fontFamily: font.regular, color: colors.muted },
  note: { fontFamily: font.regular, color: colors.green },
});
