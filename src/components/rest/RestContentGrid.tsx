import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { homeV2 } from "@/design/ds";
import type { RestContent, RestContentId } from "@/features/rest/model/contents";

import { RestCardPressable } from "./RestCardPressable";

type Props = {
  items: readonly RestContent[];
  onOpen?: (item: RestContent) => void;
};

const PHOTOS: Record<RestContentId, number> = {
  sensePond: require("../../../assets/rest/rest-records.webp"),
  worryBox: require("../../../assets/rest/worries.webp"),
  treasureBox: require("../../../assets/rest/treasures.webp"),
  // TODO(design): replace the temporary sleeping Baba reference with the approved
  // body-release illustration; the HTML draft used a treasure-box image here.
  bodyRelease: require("../../../assets/rest/baba-sleep.webp"),
};

const PHOTO_BACKGROUNDS: Record<RestContentId, string> = {
  sensePond: homeV2.color.greenSoft,
  worryBox: homeV2.color.date,
  treasureBox: homeV2.color.today,
  bodyRelease: homeV2.color.greenSoft,
};

export function RestContentGrid({ items, onOpen }: Props) {
  const largeText = useEffectiveFontScale() > 1.2;
  const rows: RestContent[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((item) => {
            const card = (
              <View style={styles.polaroid}>
                <View style={[styles.photo, { backgroundColor: PHOTO_BACKGROUNDS[item.id] }]}>
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
                    <Text
                      variant="caption2"
                      style={[styles.duration, largeText && styles.durationLarge]}
                    >
                      {item.duration.replace(/^약 /, "")}
                    </Text>
                  </View>
                  <Text variant="caption1" style={styles.description}>
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
            return item.route != null ? (
              <RestCardPressable
                key={item.id}
                accessibilityLabel={`${item.title} 열기`}
                onPress={() => onOpen?.(item)}
                style={styles.cell}
              >
                {card}
              </RestCardPressable>
            ) : (
              <View key={item.id} style={styles.cell}>
                {card}
              </View>
            );
          })}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const colors = homeV2.color;
const font = homeV2.font;

const styles = StyleSheet.create({
  grid: { gap: 22 },
  row: { flexDirection: "row", gap: 22 },
  cell: { flex: 1 },
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
