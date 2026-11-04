import { router } from "expo-router";
import { useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, Text } from "@/components/ds";
import { TabPaperBackground } from "@/components/ds/TabPaperBackground";
import { useReducedMotion } from "@/components/rest/pond/useReducedMotion";
import { SCENE_BACK_SIZE, SceneBackButton } from "@/components/rest/scene/SceneChrome";
import { WeeklyHappinessRow } from "@/components/rest/weekly/WeeklyHappinessRow";
import { homeV2, space, weeklyHappiness } from "@/design/ds";
import { weekStartOf } from "@/features/home/model/day";
import {
  WEEKLY_HAPPINESS_CATEGORIES,
  WEEKLY_HAPPINESS_TITLE,
  WEEKLY_HAPPINESS_WEEKS_BACK,
  shiftWeek,
  weekRangeLabel,
  type WeeklyHappinessEntries,
  type WeeklyHappinessKey,
} from "@/features/rest/model/weeklyHappiness";
import { clock } from "@/lib/clock";

const { color, motion, size } = weeklyHappiness;

/**
 * 주간 행복 (2026-11-04 · 디자인만) — 주를 넘기며 일곱 칸에 좋았던 일을 적는다.
 *
 * ⚠ **적은 글은 저장되지 않는다** — 서버 계약이 없어 이 화면이 떠 있는 동안 메모리에만 있다.
 * 쉼터 칸이 개발 빌드에만 보이는 까닭이다(`features/rest/model/weeklyHappiness.ts`).
 */
export default function WeeklyHappinessScreen() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [thisWeek] = useState(() => weekStartOf(clock.today()));
  const [week, setWeek] = useState(thisWeek);
  const [entries, setEntries] = useState<Record<string, WeeklyHappinessEntries>>({});
  const [page] = useState(() => new Animated.Value(1));
  const [direction, setDirection] = useState<1 | -1>(1);

  const firstWeek = shiftWeek(thisWeek, -WEEKLY_HAPPINESS_WEEKS_BACK);
  const canGoBack = week > firstWeek;
  const canGoForward = week < thisWeek;
  const { from, to } = weekRangeLabel(week);
  const written = entries[week] ?? {};

  const go = (weeks: 1 | -1) => {
    setDirection(weeks);
    setWeek((w) => shiftWeek(w, weeks));
    if (reduced) return;
    page.setValue(0);
    Animated.timing(page, {
      toValue: 1,
      duration: motion.pageMs,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    }).start();
  };

  const write = (key: WeeklyHappinessKey, text: string) =>
    setEntries((all) => ({ ...all, [week]: { ...all[week], [key]: text } }));

  const paged = {
    opacity: page,
    transform: [
      {
        translateX: page.interpolate({
          inputRange: [0, 1],
          outputRange: [size.slide * direction, 0],
        }),
      },
    ],
  };

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <TabPaperBackground tab="쉼터" />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          testID="weekly-happiness-scroll"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + space.sm + SCENE_BACK_SIZE,
              paddingBottom: insets.bottom + size.bottom,
            },
          ]}
        >
          {/* 글과 함께 스크롤된다 — 키보드로 밀려 올라간 글자를 가리지 않게 */}
          <SceneBackButton top={insets.top + space.sm} onPress={() => router.back()} />
          <Text color={color.text} style={styles.title} accessibilityRole="header">
            {WEEKLY_HAPPINESS_TITLE}
          </Text>
          <View style={styles.weekBar}>
            <WeekArrow glyph="〈" label="이전 주" disabled={!canGoBack} onPress={() => go(-1)} />
            <Animated.View
              accessible
              accessibilityLabel={`${from}부터 ${to}까지`}
              style={[styles.weekRange, paged]}
            >
              <Text color={color.entry} style={styles.weekDate}>
                {from}
              </Text>
              <Text color={color.entry} style={styles.weekDate}>
                ~
              </Text>
              <Text color={color.entry} style={styles.weekDate}>
                {to}
              </Text>
            </Animated.View>
            <WeekArrow glyph="〉" label="다음 주" disabled={!canGoForward} onPress={() => go(1)} />
          </View>
          <Animated.View style={paged}>
            {WEEKLY_HAPPINESS_CATEGORIES.map((category) => (
              <WeeklyHappinessRow
                key={`${week}-${category.key}`}
                label={category.label}
                placeholder={category.placeholder}
                value={written[category.key] ?? ""}
                onChangeText={(text) => write(category.key, text)}
              />
            ))}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** 넘길 수 없는 쪽은 옅어지고 눌리지 않는다 — 낭독기에도 꺼졌다고 알린다 */
function WeekArrow({
  glyph,
  label,
  disabled,
  onPress,
}: {
  glyph: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.arrow, disabled && styles.arrowDisabled]}
    >
      <Text variant="headline1" color={color.text}>
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: size.paddingX },
  title: {
    fontFamily: homeV2.font.bold,
    ...size.title,
    paddingHorizontal: size.titlePaddingX,
    paddingTop: size.titlePaddingTop,
    paddingBottom: size.titlePaddingBottom,
  },
  weekBar: {
    flexDirection: "row",
    alignItems: "center",
    height: size.weekBarHeight,
    borderTopWidth: size.weekBarTopLine,
    borderBottomWidth: size.line,
    borderColor: color.line,
  },
  weekRange: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  weekDate: { fontFamily: homeV2.font.bold, ...size.weekFrom },
  arrow: {
    width: size.arrowTouch,
    height: size.arrowTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: { opacity: size.arrowDisabledOpacity },
});
