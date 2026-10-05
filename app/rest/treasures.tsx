import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, Text } from "@/components/ds";
import { SCENE_BACK_SIZE, SceneBackButton, SceneCard } from "@/components/rest/scene/SceneChrome";
import { TreasureRow } from "@/components/rest/treasure/TreasureRow";
import { fetchTreasures, type Treasure } from "@/features/rest/data/treasureApi";
import {
  TREASURE_ALL_EMPTY,
  TREASURE_ALL_TITLE,
  groupByDay,
  markAt,
} from "@/features/rest/model/treasureBox";
import { label as labelColor, layout, restScene, space, withAlpha } from "@/design/ds";
import { formatKoreanDateShort, koreanWeekday } from "@/lib/day";

/**
 * 지난 보물 — 오늘의 보물함에 담은 보물을 하루씩 묶어 최신 날부터 보여 준다(2026-10-05).
 *
 * **세지 않는다** — 개수 · 연속 · 달성을 붙이지 않고 쓴 그대로를 다시 보여 줄 뿐이다
 * (`DESIGN.md` 「오늘의 보물함」). 보물함 장면의 그림을 옅게 깔아 같은 공간으로 읽히게 한다.
 * 못 받아 오면 비어 있다는 말만 한다 — 오류 안내를 따로 두지 않는다(`RULES.md` 4).
 */
const BACKGROUND = require("../../assets/worry-box/forest.webp");

export default function TreasuresScreen() {
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Treasure[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchTreasures().then((r) => {
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
          {TREASURE_ALL_TITLE}
        </Text>
        {all != null && days.length === 0 ? (
          <Text variant="body1" color={labelColor.normal} style={styles.title}>
            {TREASURE_ALL_EMPTY}
          </Text>
        ) : null}
        {days.map((day) => (
          <SceneCard key={day.date}>
            <Text variant="label1" color={labelColor.alternative}>
              {`${formatKoreanDateShort(day.date)} ${koreanWeekday(day.date)}요일`}
            </Text>
            {day.treasures.map((t, i) => (
              <TreasureRow key={t.id} treasure={t} mark={markAt(i)} />
            ))}
          </SceneCard>
        ))}
      </ScrollView>
      <SceneBackButton top={insets.top + space.sm} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 그림은 옅게 — 글이 주인공이다
  veil: { backgroundColor: withAlpha(restScene.surface, 0.55) },
  content: { paddingHorizontal: space.xl, gap: space.md },
  title: { textAlign: "center" },
});
