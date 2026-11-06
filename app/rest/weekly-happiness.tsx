import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, Text } from "@/components/ds";
import { TabPaperBackground } from "@/components/ds/TabPaperBackground";
import { useReducedMotion } from "@/components/rest/pond/useReducedMotion";
import { GuideCard } from "@/components/rest/scene/GuideCard";
import { MoodExit } from "@/components/rest/scene/MoodExit";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  SceneCornerButton,
  SceneGuideButton,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { WeeklyHappinessRow } from "@/components/rest/weekly/WeeklyHappinessRow";
import { homeV2, space, weeklyHappiness } from "@/design/ds";
import { weekStartOf } from "@/features/home/model/day";
import { REST_RECORDS_LINK } from "@/features/rest/model/restRecord";
import { useRestGuide } from "@/features/rest/model/useRestGuide";
import { useRestRecord } from "@/features/rest/model/useRestRecord";
import {
  WEEKLY_HAPPINESS_CATEGORIES,
  WEEKLY_HAPPINESS_DONE_CTA,
  WEEKLY_HAPPINESS_LEAVE,
  WEEKLY_HAPPINESS_TITLE,
  WEEKLY_HAPPINESS_WEEKS_BACK,
  shiftWeek,
  hasWritten,
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
 *
 * 끝맺음은 다른 쉼터와 같다(2026-11-06) — 맨 아래 「다 적었어요」 → 기분 쪽지(`MoodExit`) → 쉼터.
 * 이용 기록은 오른쪽 위 시계 원에서 본다. 남는 것은 「했다 + 기분」뿐이다(`useRestRecord`).
 */
export default function WeeklyHappinessScreen() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const guide = useRestGuide("weekly_happiness");
  const [thisWeek] = useState(() => weekStartOf(clock.today()));
  const [week, setWeek] = useState(thisWeek);
  const [entries, setEntries] = useState<Record<string, WeeklyHappinessEntries>>({});
  const [page] = useState(() => new Animated.Value(1));
  const [direction, setDirection] = useState<1 | -1>(1);
  // 「다 적었어요」를 눌렀다 — 기록장 위에 기분 쪽지가 뜨고, 고른 뒤에야 실제로 나간다
  const [asking, setAsking] = useState(false);
  const written = hasWritten(entries);
  // 이용 기록 — 한 칸이라도 적은 판부터 남긴다(들어왔다 바로 나간 판은 소음이다)
  const record = useRestRecord("weekly_happiness", written);

  /**
   * 누른 칸을 화면 위쪽으로 올린다 — **바로 윗줄이 보이는 자리**까지(첫 칸이면 주 막대가 보이게).
   * 아래 칸을 누를 때마다 손으로 끌어 올려야 했다(2026-11-06 · 사용자 피드백). 키보드가 다 오른 뒤
   * (`keyboardDidShow`) 줄어든 화면 기준으로 올리고, 키보드가 이미 떠 있으면 누르는 즉시 올린다.
   * 끝 칸은 더 올릴 수 없는 만큼만 간다 — 스크롤 끝을 넘겨 빈 종이를 보이지 않는다.
   *
   * 키보드가 떠 있는 동안 스크롤 창 높이가 바뀌면 한 번 더 맞춘다 — 안드로이드는 `keyboardDidShow` 가
   * 창이 줄기(`KeyboardAvoidingView` 여백) **전에** 와서, 그때 재면 올릴 여유가 아직 없다(2026-11-06 · Lab Pixel).
   */
  const scroll = useRef<ScrollView>(null);
  const spots = useRef({ weekBar: 0, list: 0, rows: [] as number[], viewport: 0, content: 0 });
  const focusedRow = useRef<number | null>(null);
  const reveal = useCallback(
    (index: number) => {
      const s = spots.current;
      const above = index === 0 ? s.weekBar : s.list + (s.rows[index - 1] ?? 0);
      const end = Math.max(0, s.content - s.viewport);
      const y = Math.min(end, Math.max(0, above - insets.top - space.sm));
      scroll.current?.scrollTo({ y, animated: !reduced });
    },
    [insets.top, reduced],
  );
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => {
      requestAnimationFrame(() => {
        if (focusedRow.current != null) reveal(focusedRow.current);
      });
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      focusedRow.current = null;
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [reveal]);
  const focusRow = (index: number) => {
    focusedRow.current = index;
    if (Keyboard.isVisible()) reveal(index);
  };

  const firstWeek = shiftWeek(thisWeek, -WEEKLY_HAPPINESS_WEEKS_BACK);
  const canGoBack = week > firstWeek;
  const canGoForward = week < thisWeek;
  const { from, to } = weekRangeLabel(week);
  const weekEntries = entries[week] ?? {};

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
      {/* **안드로이드도 피한다** — edge-to-edge 에서는 창이 줄지 않아 키보드가 아래 칸을 덮고, 스크롤할
          여유도 생기지 않아 누른 칸을 올릴 수 없었다(2026-11-06 · Lab 에서 Pixel 로 확인 · 걱정상자와 같은 판단) */}
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView
          ref={scroll}
          testID="weekly-happiness-scroll"
          onLayout={(e) => {
            spots.current.viewport = e.nativeEvent.layout.height;
            if (focusedRow.current != null && Keyboard.isVisible()) reveal(focusedRow.current);
          }}
          onContentSizeChange={(_, height) => {
            spots.current.content = height;
          }}
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
          <SceneGuideButton top={insets.top + space.sm} onPress={guide.show} />
          {/* 이 쉼터를 한 기록 — 다른 쉼터와 같은 시계 원 */}
          <SceneCornerButton
            top={insets.top + space.sm}
            label={REST_RECORDS_LINK}
            icon="clock"
            onPress={() => router.push("/rest/records?content=weekly_happiness")}
          />
          <Text color={color.text} style={styles.title} accessibilityRole="header">
            {WEEKLY_HAPPINESS_TITLE}
          </Text>
          <View
            style={styles.weekBar}
            onLayout={(e) => {
              spots.current.weekBar = e.nativeEvent.layout.y;
            }}
          >
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
          <Animated.View
            style={paged}
            onLayout={(e) => {
              spots.current.list = e.nativeEvent.layout.y;
            }}
          >
            {WEEKLY_HAPPINESS_CATEGORIES.map((category, index) => (
              <WeeklyHappinessRow
                key={`${week}-${category.key}`}
                label={category.label}
                placeholder={category.placeholder}
                value={weekEntries[category.key] ?? ""}
                onChangeText={(text) => write(category.key, text)}
                onFocus={() => focusRow(index)}
                onLayout={(e) => {
                  spots.current.rows[index] = e.nativeEvent.layout.y;
                }}
              />
            ))}
          </Animated.View>
          {/* 한 칸이라도 적어야 눌린다 — 일곱 칸을 다 채우라는 말이 아니다(설명 카드 2장) */}
          <View style={styles.done}>
            <ScenePillButton
              tone="accent"
              label={WEEKLY_HAPPINESS_DONE_CTA}
              disabled={!written}
              onPress={() => {
                Keyboard.dismiss();
                setAsking(true);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {asking ? (
        <MoodExit
          leaveLabel={WEEKLY_HAPPINESS_LEAVE}
          onPick={record.pick}
          onLeave={() => router.replace("/(tabs)/rest")}
        />
      ) : null}
      {guide.open ? (
        <GuideCard content="weekly_happiness" first={guide.first} onClose={guide.close} />
      ) : null}
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
  done: { paddingTop: size.doneTop },
});
