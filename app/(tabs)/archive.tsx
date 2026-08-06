import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { CalendarMonth } from "@/components/archive/CalendarMonth";
import { DiaryPreviewCard } from "@/components/archive/DiaryPreviewCard";
import { EmotionFilter } from "@/components/archive/EmotionFilter";
import { SegBar } from "@/components/common/SegBar";
import { TabScreen } from "@/components/common/TabScreen";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import theme, { type EmotionId } from "@/design/theme";
import { archive as tokens } from "@/design/tokens.mvp";
import {
  byLatest,
  dayOf,
  diariesInMonth,
  emotionStem,
  monthChange,
  shortEmotionName,
  topEmotion,
  totalEmotionRecords,
} from "@/features/archive/model/archive";
import { useDiary } from "@/features/diary/model/diary";
import { SAMPLE_DIARY_MONTH, SAMPLE_TODAY } from "@/mocks/sample";

/**
 * `A1` 보관함 · 달력 + `A2` 보관함 · 목록 + 감정 필터
 *
 * **탭 이름은 「달력」이다**(`A1.md`) — 외부 캘린더 앱과 구분하려고 "캘린더"라고
 * 쓰지 않는다. **달력으로 언제, 목록으로 어떤 마음이었는지** 찾는다.
 *
 * 두 면이 한 파일인 이유는 `C6`/`C6-b` 와 같다 — 세그먼트가 **면을 바꾸는 것**
 * 이고, 요약 3칸은 두 면이 함께 쓴다.
 *
 * - **요약 3칸은 AI 의 판단이 아니라 기록 수치만** 쓴다. 「지난달과 비교」도
 *   화살표가 아니라 **"불안 2회 감소"** 처럼 얼마나 줄었는지를 말한다
 * - 비교할 데이터가 부족하면 **"변화를 모으는 중"** 을 쓴다
 * - **연속 일수를 세지 않는다** — 세는 것은 **장수**다
 * - 목록은 **최신순 고정**이고 정렬 옵션을 두지 않는다
 * - 필터는 **한 번에 하나만**. 미리보기는 **두 줄 말줄임**
 *
 * ⚠ 일기가 하나도 없는 보관함 · 그달에 일기가 없는 달력 · 필터 결과 없음은
 * **아직 화면이 없다**(`archive.pendingStates`). **빈 상태 전용 레이아웃을
 * 만들지 않는다**는 규칙이 있으니, 화면이 생길 때도 같은 템플릿의 한 줄이다.
 */
const FACES: readonly [string, string] = ["달력", "목록"];

/**
 * 되돌리기 줄이 머무는 시간. **"잠시"**(`A4.md`)를 숫자로 옮긴 것이고, 이 뒤에는
 * 되돌릴 수 없다. 짧으면 놓치고 길면 지웠다는 사실이 안 믿긴다.
 */
const UNDO_MS = 6000;

export default function Archive() {
  const diaries = useDiary((s) => s.diaries);
  const recentlyDeleted = useDiary((s) => s.recentlyDeleted);
  const undoRemove = useDiary((s) => s.undoRemove);
  const clearRecentlyDeleted = useDiary((s) => s.clearRecentlyDeleted);

  const [face, setFace] = useState<0 | 1>(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filter, setFilter] = useState<EmotionId | null>(null);

  const month = SAMPLE_DIARY_MONTH;
  const monthly = diariesInMonth(diaries, month);
  const today = SAMPLE_TODAY.startsWith(month) ? dayOf(SAMPLE_TODAY) : null;

  const top = topEmotion(monthly);
  const change = monthChange(monthly);

  const selectedDiary =
    selectedDay == null ? null : monthly.find((d) => dayOf(d.date) === selectedDay) ?? null;

  const listed = byLatest(
    filter == null ? monthly : monthly.filter((d) => d.emotions.includes(filter)),
  );

  const open = (id: string) => router.push(`/diary/${id}`);

  // 잠시 뒤 스스로 사라진다 — 남겨두면 지운 것이 지워지지 않은 것처럼 보인다
  useEffect(() => {
    if (recentlyDeleted == null) return;
    const t = setTimeout(clearRecentlyDeleted, UNDO_MS);
    return () => clearTimeout(t);
  }, [recentlyDeleted, clearRecentlyDeleted]);

  return (
    <TabScreen active="보관함">
      <AppText tone="strong" weight="700" style={styles.title}>
        보관함
      </AppText>

      <SegBar items={FACES} activeIndex={face} onChange={setFace} />

      {/* 요약 3칸 — 두 면이 함께 쓴다. 기록 수치만이고 해석이 없다 */}
      <View style={styles.stats}>
        <Stat value={`${monthly.length}편`} label="이번 달 기록" />
        <Stat
          value={top == null ? "—" : shortEmotionName(top)}
          label="가장 많이 기록"
          dot={top == null ? undefined : theme.emotions[top - 1]?.base}
        />
        <Stat
          value={
            change == null
              ? "변화를 모으는 중"
              : `${emotionStem(change.emotion)} ${change.decrease}회 감소`
          }
          label={change == null ? "기록이 쌓이면 알려드릴게요" : "지난달과 비교"}
          small={change == null}
        />
      </View>

      {face === 0 ? (
        <ScrollView
          style={styles.stack}
          contentContainerStyle={styles.stackContent}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.calendarCard}>
            <AppText tone="strong" weight="600" style={styles.monthLabel}>
              {`${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`}
            </AppText>
            <CalendarMonth
              diaries={diaries}
              month={month}
              today={today}
              selected={selectedDay}
              onSelect={setSelectedDay}
            />
          </Card>

          {/* 색만으로 판단하게 하지 않는다 — 고른 날의 감정을 이름으로 보여준다 */}
          {selectedDiary != null ? (
            <DiaryPreviewCard diary={selectedDiary} onOpen={open} showOpenLink />
          ) : null}
        </ScrollView>
      ) : (
        <>
          <EmotionFilter
            totalCount={totalEmotionRecords(monthly)}
            selected={filter}
            onSelect={setFilter}
          />
          <ScrollView
            style={styles.stack}
            contentContainerStyle={styles.stackContent}
            showsVerticalScrollIndicator={false}
          >
            {listed.map((d) => (
              <DiaryPreviewCard key={d.id} diary={d} onOpen={open} />
            ))}
          </ScrollView>
        </>
      )}

      {/*
        지운 직후에만 잠시 뜬다(`A4.md`). 확인 모달을 두지 않는 대신 되돌릴 길을
        남기는 쪽이다 — 되돌릴 수 있게 만든다는 규칙(`RULES.md`)이 여기까지 온다.
      */}
      {recentlyDeleted != null ? (
        <View style={styles.undo}>
          <AppText tone="onDark" weight="500" style={styles.undoLabel}>
            삭제했어요
          </AppText>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={undoRemove}>
            <AppText tone="onDark" weight="700" style={styles.undoAction}>
              되돌리기
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </TabScreen>
  );
}

/** `.cdCell` — 요약 한 칸. 값 하나와 라벨 하나뿐이다 */
function Stat({
  value,
  label,
  dot,
  small,
}: {
  value: string;
  label: string;
  dot?: string;
  small?: boolean;
}) {
  return (
    <Card style={styles.stat}>
      <View style={styles.statValueRow}>
        {dot != null ? <View style={[styles.statDot, { backgroundColor: dot }]} /> : null}
        <AppText
          tone="strong"
          weight="700"
          numberOfLines={1}
          style={[styles.statValue, small ? styles.statValueSmall : null]}
        >
          {value}
        </AppText>
      </View>
      <AppText tone="caption" numberOfLines={2} style={styles.statLabel}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: tokens.titleSize,
    lineHeight: tokens.titleSize * 1.3,
    letterSpacing: -0.44,
    paddingTop: 6,
    paddingBottom: theme.layout.gap.element,
  },

  stats: { flexDirection: "row", gap: tokens.stat.gap, paddingVertical: theme.layout.gap.element },
  stat: {
    flex: 1,
    minWidth: 0,
    minHeight: tokens.stat.height,
    borderRadius: tokens.stat.radius,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statDot: {
    width: tokens.stat.dot,
    height: tokens.stat.dot,
    borderRadius: tokens.stat.dot / 2,
  },
  statValue: { fontSize: tokens.stat.valueSize, lineHeight: tokens.stat.valueSize * 1.1 },
  // 「변화를 모으는 중」은 값이 길어 한 칸에 들어가야 한다
  statValueSmall: { fontSize: 11.5, lineHeight: 14 },
  statLabel: { fontSize: tokens.stat.labelSize, lineHeight: 14, textAlign: "center" },

  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  stackContent: {
    gap: 10,
    paddingHorizontal: theme.layout.screenMargin,
    paddingVertical: theme.layout.gap.element,
  },

  calendarCard: { gap: 11, borderRadius: tokens.calendar.radius, padding: tokens.calendar.padding },
  monthLabel: { fontSize: 14.5, lineHeight: 20, textAlign: "center" },

  // 목록 위에 떠 있는 한 줄 — 탭바를 가리지 않게 그 위에 둔다
  undo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    marginBottom: theme.layout.gap.element,
    borderRadius: theme.radius.control,
    // 면이 잉크색이라 글자는 onDark 하나뿐이다
    backgroundColor: theme.colors.semantic.textPrimary,
  },
  undoLabel: { flex: 1, fontSize: 13, lineHeight: 18 },
  undoAction: { fontSize: 13, lineHeight: 18 },
});
