import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, Text } from "@/components/ds";
import { SCENE_BACK_SIZE, SceneBackButton, SceneCard } from "@/components/rest/scene/SceneChrome";
import { fetchRestRecords, type RestRecord } from "@/features/rest/data/restRecordApi";
import {
  REST_RECORD_INCOMPLETE,
  REST_RECORD_TITLES,
  REST_RECORDS_EMPTY,
  type RestRecordContent,
  groupRecordsByDay,
  isRestRecordContent,
  restMoodLabel,
} from "@/features/rest/model/restRecord";
import { label as labelColor, layout, restScene, space, withAlpha } from "@/design/ds";
import { formatKoreanDateShort, koreanWeekday } from "@/lib/day";
import { toHHMM } from "@/lib/time";

/**
 * 쉼터 이용 기록 — 한 쉼터를 언제 했고 마칠 때 기분이 어땠는지를 하루씩 묶어 최신 날부터
 * 보여 준다(2026-10-08). 각 쉼터 오른쪽 위 원이 연다(`?content=worry_box`).
 *
 * **세지 않는다** — 횟수 · 연속 · 「나아진 비율」을 붙이지 않고 남은 그대로 보여 줄 뿐이다.
 * 그 쉼터의 그림을 옅게 깔아 같은 공간으로 읽히게 한다(「지난 보물」과 같은 결).
 * 못 받아 오면 비어 있다는 말만 한다(`RULES.md` 4).
 */
const BACKGROUNDS: Record<RestRecordContent, number> = {
  sense_pond: require("../../assets/sensory-pond/pond-background.png"),
  worry_box: require("../../assets/worry-box/forest.webp"),
  treasure_box: require("../../assets/treasure-box/meadow.webp"),
  body_release: require("../../assets/body-release/sky.webp"),
};

export default function RestRecordsScreen() {
  const insets = useSafeAreaInsets();
  const param = useLocalSearchParams<{ content?: string }>().content;
  const content: RestRecordContent = isRestRecordContent(param) ? param : "sense_pond";
  const [all, setAll] = useState<RestRecord[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchRestRecords(content).then((r) => {
      if (alive) setAll(r.ok ? r.data : []);
    });
    return () => {
      alive = false;
    };
  }, [content]);

  const days = useMemo(() => groupRecordsByDay(all ?? []), [all]);

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <Image
        source={BACKGROUNDS[content]}
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
          {REST_RECORD_TITLES[content]}
        </Text>
        {all != null && days.length === 0 ? (
          <Text variant="body1" color={labelColor.normal} style={styles.title}>
            {REST_RECORDS_EMPTY}
          </Text>
        ) : null}
        {days.map((day) => (
          <SceneCard key={day.date}>
            <Text variant="label1" color={labelColor.alternative}>
              {`${formatKoreanDateShort(day.date)} ${koreanWeekday(day.date)}요일`}
            </Text>
            {day.records.map((r) => (
              <View key={r.id} style={styles.row}>
                <Text variant="body1" color={labelColor.strong} style={styles.mood}>
                  {r.mood == null ? REST_RECORD_INCOMPLETE : restMoodLabel(r.mood)}
                </Text>
                <Text variant="caption1" color={labelColor.alternative}>
                  {toHHMM(new Date(r.createdAt))}
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
  // 그림은 옅게 — 글이 주인공이다
  veil: { backgroundColor: withAlpha(restScene.surface, 0.55) },
  content: { paddingHorizontal: space.xl, gap: space.md },
  title: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  mood: { flex: 1 },
});
