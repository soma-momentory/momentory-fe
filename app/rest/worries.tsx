import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, Text } from "@/components/ds";
import { SCENE_BACK_SIZE, SceneBackButton, SceneCard } from "@/components/rest/scene/SceneChrome";
import { fetchWorries, type Worry } from "@/features/rest/data/worryApi";
import { groupByDay } from "@/features/rest/model/treasureBox";
import { WORRY_KEPT_EMPTY, WORRY_KEPT_TITLE } from "@/features/rest/model/worryBox";
import { label as labelColor, layout, restScene, space, withAlpha } from "@/design/ds";
import { formatKoreanDateShort, koreanWeekday } from "@/lib/day";
import { toHHMM } from "@/lib/time";

/**
 * 맡겨둔 걱정 — 걱정상자에서 「잠시 맡겨둘게요」를 고른 걱정을 하루씩 묶어 최신 날부터
 * 보여 준다(2026-10-13). 「지난 보물」(`treasures.tsx`)과 같은 모양이다.
 *
 * **세지 않고 평가하지 않는다** — 맡긴 그대로를 다시 보여 줄 뿐이다. 걱정상자의 숲 그림을
 * 옅게 깔아 같은 공간으로 읽히게 한다. 못 받아 오면 비어 있다는 말만 한다(`RULES.md` 4).
 */
const BACKGROUND = require("../../assets/worry-box/forest.webp");

export default function WorriesScreen() {
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Worry[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchWorries().then((r) => {
      if (alive) setAll(r.ok ? r.data : []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const days = useMemo(() => groupByDay(all ?? []), [all]);

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <Image
        source={BACKGROUND}
        contentFit="cover"
        transition={0}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.veil]} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.sm + SCENE_BACK_SIZE + space.md,
            paddingBottom: insets.bottom + layout.scrollClearance,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title1Hand" color={restScene.ink} style={styles.title}>
          {WORRY_KEPT_TITLE}
        </Text>
        {all != null && days.length === 0 ? (
          <Text variant="body1" color={labelColor.normal} style={styles.title}>
            {WORRY_KEPT_EMPTY}
          </Text>
        ) : null}
        {days.map((day) => (
          <SceneCard key={day.date}>
            <Text variant="label1" color={labelColor.alternative}>
              {`${formatKoreanDateShort(day.date)} ${koreanWeekday(day.date)}요일`}
            </Text>
            {day.items.map((w) => (
              <View key={w.id} style={styles.row}>
                <Text variant="body1" color={labelColor.strong} style={styles.text}>
                  {w.content}
                </Text>
                <Text variant="caption1" color={labelColor.alternative}>
                  {toHHMM(new Date(w.createdAt))}
                </Text>
              </View>
            ))}
          </SceneCard>
        ))}
      </ScrollView>
      <SceneBackButton top={insets.top + space.sm} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 숲 그림은 저녁빛이라 보물함보다 조금 더 덮어야 글이 읽힌다
  veil: { backgroundColor: withAlpha(restScene.surface, 0.65) },
  content: { paddingHorizontal: space.xl, gap: space.md },
  title: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  text: { flex: 1 },
});
