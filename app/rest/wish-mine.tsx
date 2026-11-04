import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Modal, Screen, Text } from "@/components/ds";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  SceneCornerButton,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { label as labelColor, layout, radius, restScene, space, wishScene } from "@/design/ds";
import { track } from "@/features/analytics";
import {
  type MyWishes,
  type WishOutcome,
  answerWish,
  deleteWish,
  fetchMyWishes,
} from "@/features/rest/data/wishApi";
import {
  WISH_MINE,
  WISH_OUTCOMES,
  WISH_PILL,
  wishDaysLeft,
  wishIntent,
} from "@/features/rest/model/wish";

const IVORY = require("../../assets/backgrounds/warm-ivory.png");
const BABA = require("../../assets/home/v2/baba-composite.png");

/**
 * 내 소원 — 떠 있는 소원과 지나간 소원(2026-11-04). 같이 빈 사람이 있었는지만 말하고 세지 않는다.
 * 못 받아 오면 비어 있다는 말만 한다(`RULES.md` 4).
 */
export default function WishMineScreen() {
  const insets = useSafeAreaInsets();
  const [mine, setMine] = useState<MyWishes | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchMyWishes().then((r) => {
      if (alive) setMine(r.ok ? r.data : { floating: [], past: [] });
    });
    return () => {
      alive = false;
    };
  }, []);

  const confirmDelete = () => {
    if (deleting == null) return;
    track("wish_deleted", {});
    void deleteWish(deleting);
    const id = deleting;
    setMine((m) =>
      m == null
        ? m
        : {
            floating: m.floating.filter((w) => w.id !== id),
            past: m.past.filter((w) => w.id !== id),
          },
    );
    setDeleting(null);
  };

  const answer = (id: number, outcome: WishOutcome) => {
    track("wish_followup_answered", { outcome });
    void answerWish(id, outcome);
    setMine((m) =>
      m == null ? m : { ...m, past: m.past.map((w) => (w.id === id ? { ...w, outcome } : w)) },
    );
  };

  const empty = mine != null && mine.floating.length === 0 && mine.past.length === 0;
  const top = insets.top + space.sm;

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <Image source={IVORY} contentFit="cover" transition={0} style={StyleSheet.absoluteFill} />
      {empty ? (
        <View style={styles.empty}>
          <View style={styles.bubble}>
            <Text variant="title3Hand" color={restScene.ink}>
              {WISH_MINE.empty}
            </Text>
          </View>
          <Image source={BABA} contentFit="contain" transition={0} style={styles.baba} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: top + SCENE_BACK_SIZE + space.md,
              paddingBottom: insets.bottom + layout.scrollClearance,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="title1Hand" color={restScene.ink} style={styles.title}>
            {WISH_MINE.title}
          </Text>
          {mine != null && mine.floating.length > 0 ? (
            <Text variant="label1" color={labelColor.alternative}>
              {WISH_MINE.floating}
            </Text>
          ) : null}
          {mine?.floating.map((w) => (
            <View key={w.id} style={styles.card}>
              <View style={styles.row}>
                <Text variant="body1" color={labelColor.strong} style={styles.text}>
                  {w.content}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="소원 지우기"
                  onPress={() => setDeleting(w.id)}
                  hitSlop={10}
                >
                  <Icon name="more-vertical" size={20} color={labelColor.alternative} />
                </Pressable>
              </View>
              <Text variant="label2" color={labelColor.alternative}>
                {`${w.joinedByOthers ? WISH_MINE.joinedByOthers : WISH_MINE.joinedByBaba} · ${wishDaysLeft(w.daysLeft)}`}
              </Text>
            </View>
          ))}
          {mine != null && mine.past.length > 0 ? (
            <Text variant="label1" color={labelColor.alternative}>
              {WISH_MINE.past}
            </Text>
          ) : null}
          {mine?.past.map((w) => (
            <View key={w.id} style={[styles.card, styles.pastCard]}>
              <Text variant="body1" color={labelColor.strong}>
                {w.content}
              </Text>
              {w.endReason === "reported" ? (
                <Text variant="label2" color={labelColor.alternative}>
                  {WISH_MINE.reported}
                </Text>
              ) : w.outcome != null ? (
                <Text variant="label2" color={labelColor.alternative}>
                  {WISH_OUTCOMES.find((o) => o.id === w.outcome)?.label}
                </Text>
              ) : (
                <>
                  <Text variant="label2" color={labelColor.alternative}>
                    {WISH_MINE.followUp}
                  </Text>
                  <View style={styles.answers}>
                    {WISH_OUTCOMES.map((o) => (
                      <Pressable
                        key={o.id}
                        accessibilityRole="button"
                        onPress={() => answer(w.id, o.id)}
                        style={styles.answer}
                      >
                        <Text variant="label1" color={labelColor.strong}>
                          {o.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>
          ))}
        </ScrollView>
      )}
      <SceneBackButton top={top} onPress={() => router.back()} />
      <SceneCornerButton
        top={top}
        icon="clock"
        label="지난 기록"
        onPress={() => router.push("/rest/records?content=wish")}
      />
      {empty ? (
        <View style={[styles.pill, { bottom: Math.max(insets.bottom, space.md) + space.md }]}>
          <ScenePillButton
            tone="accent"
            label={WISH_PILL.write}
            onPress={() => {
              wishIntent.write = true;
              router.back();
            }}
          />
        </View>
      ) : null}
      {deleting != null ? (
        <Modal
          title={WISH_MINE.deleteTitle}
          description={WISH_MINE.deleteBody}
          cancelLabel={WISH_MINE.keep}
          confirmLabel={WISH_MINE.delete}
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.md },
  title: { textAlign: "center" },
  card: {
    backgroundColor: wishScene.memo.paper,
    borderRadius: wishScene.memo.radius,
    padding: space.lg,
    gap: space.sm,
    shadowColor: wishScene.memo.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 4 },
    elevation: 2,
  },
  pastCard: { backgroundColor: wishScene.past, shadowOpacity: 0, elevation: 0 },
  row: { flexDirection: "row", gap: space.sm },
  text: { flex: 1 },
  answers: { flexDirection: "row", gap: space.sm },
  answer: {
    minHeight: 44,
    paddingHorizontal: space.md,
    justifyContent: "center",
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: wishScene.line,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
  bubble: {
    backgroundColor: wishScene.bubble.color,
    borderRadius: wishScene.bubble.radius,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
  },
  baba: { width: 118, height: 150 },
  pill: { position: "absolute", left: space.xl, right: space.xl },
});
