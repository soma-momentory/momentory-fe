import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { homeV2, radius, restThemeCard } from "@/design/ds";
import type { RestContent } from "@/features/rest/model/contents";
import { keepWords } from "@/features/letter/model/letter";

import { REST_THEMES } from "./restThemes";

/**
 * 쉼터 테마 카드 하나 — 위는 그 콘텐츠의 세계가 보이는 창, 아래는 이름 · 시간을 가운데 맞춘 종이.
 * 설명은 카드에 적지 않는다(반 폭에서 글자가 작아진다) — 처음 들어가면 콘텐츠의 설명 카드가 말해 준다.
 * 글자는 그림이 아니라 종이 위에 있어 대비가 그림에 따라 흔들리지 않는다.
 */
export function RestThemeCard({ item }: { item: RestContent }) {
  const theme = REST_THEMES[item.id];
  return (
    <View
      testID={`rest-theme-card-${item.id}`}
      style={[styles.card, { backgroundColor: restThemeCard.paper[item.id] }]}
    >
      <View style={styles.window}>
        {theme.Art != null ? <theme.Art /> : null}
        {theme.scene != null ? (
          <Image
            source={theme.scene}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={theme.position == null ? "center" : { top: theme.position }}
          />
        ) : null}
        {theme.ground != null ? (
          <Image source={theme.ground} style={styles.ground} contentFit="cover" />
        ) : null}
        {theme.subject != null ? (
          <View style={[styles.subjectSeat, { bottom: theme.subject.bottom }]}>
            <Image
              source={theme.subject.source}
              style={{ width: theme.subject.width, height: theme.subject.height }}
              contentFit="contain"
            />
          </View>
        ) : null}
      </View>
      <View style={styles.caption}>
        {/* 이름이 길어지면 어절로 줄을 바꾼다 — 한글이 글자 가운데서 접히거나 잘리지 않게 */}
        <Text variant="headline1" style={styles.title}>
          {keepWords(item.title)}
        </Text>
        {/* 이 쉼이 필요한 순간의 속말 — 고르는 데 필요한 말이라 이름 바로 아래에 둔다 */}
        <Text variant="body2" style={styles.whenGood}>
          {`「${item.whenGood}」`}
        </Text>
        {/* 시간은 덧붙이는 정보라 한 단 작고 옅게 — 세 줄이 같은 무게로 붙어 읽기 어려웠다(2026-11-08) */}
        <Text variant="caption1" style={styles.duration}>
          {item.duration.replace(/^약 /, "")}
        </Text>
        {item.note != null ? (
          <Text variant="body1" style={styles.note}>
            {item.note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const colors = homeV2.color;
const font = homeV2.font;
const size = restThemeCard.size;

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.emptyBorder,
    overflow: "hidden",
  },
  window: { height: size.window, overflow: "hidden" },
  ground: { position: "absolute", left: 0, right: 0, bottom: 0, height: "46%" },
  subjectSeat: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  caption: { paddingHorizontal: size.captionPaddingX, paddingVertical: size.captionPaddingY },
  title: { fontFamily: font.bold, color: colors.ink, textAlign: "center" },
  whenGood: {
    marginTop: size.whenGoodMarginTop,
    fontFamily: font.regular,
    color: colors.ink,
    textAlign: "center",
  },
  duration: {
    marginTop: size.durationMarginTop,
    fontFamily: font.regular,
    color: colors.muted,
    textAlign: "center",
  },
  note: {
    alignSelf: "center",
    marginTop: size.noteMarginTop,
    paddingHorizontal: size.notePaddingX,
    fontFamily: font.bold,
    color: colors.ink,
    backgroundColor: colors.today,
  },
});
