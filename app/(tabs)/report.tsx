import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { TabScreen } from "@/components/common/TabScreen";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ActionInsightCard } from "@/components/report/ActionInsightCard";
import { WeeklyEmotionGrid } from "@/components/report/WeeklyEmotionGrid";
import { WeeklySummaryCard } from "@/components/report/WeeklySummaryCard";
import theme from "@/design/theme";
import { archive as archiveTokens, report as tokens } from "@/design/tokens.mvp";
import { shortEmotionName } from "@/features/archive/model/archive";
import { useDiary } from "@/features/diary/model/diary";
import { initialWeekStart, weekAnalyses } from "@/features/report/data/sampleRepository";
import {
  REPORT_UNLOCK_COUNT,
  adjacentWeek,
  availableWeekStarts,
  isReportUnlocked,
  diariesInWeek,
  weekActions,
  weekDays,
  weekEmotionCount,
  weekEnd,
  weekRange,
  weekTopEmotion,
} from "@/features/report/model/report";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `W1` · 주간 리포트
 *
 * **리포트는 평가가 아니라 관찰이다**(`W1.md`) — 점수·등급·연속 일수·실행률·
 * 최고 기록을 쓰지 않는다.
 *
 * 이 파일은 **조합만** 한다 — 요약·감정 변화·이어갈 한 가지의 규칙은 각 조각
 * (`src/components/report/`)에 있고, 여기는 주차 이동과 수치 계산을 잇는다.
 *
 * - **일기 7편부터 열린다.** 그 전에는 **잠긴 화면이 아니라 한 줄**로 예고한다 —
 *   잠긴 문을 보여주면 못 연 것이 사용자 탓이 된다
 * - **문구를 기간에 매지 않는다** — "이번 주 …"가 아니라 「한 주 요약 · 한 주의
 *   흐름 · 이어갈 한 가지」. 비교는 **기준을 밝혀** 쓴다("이전 주보다 완만했어요")
 * - **흐름 라벨은 상태를 단정하지 않는다** — 「회복」은 진단형이라 뺐다
 *
 * ⚠ 한 주 요약 문장·흐름 라벨·이어갈 한 가지는 **서버가 그 주 대화를 읽고
 * 만드는 값**이라 아직 데모 문장이다(`report/data/sampleRepository.ts`) —
 * **주마다 다른 문장**이라 표로 들고 있고, 그 표의 키가 곧 넘겨볼 수 있는 주다.
 * 수치(회고 수 · 감정 수 · 이전 주 N회 · 행동 만든/해본 수)는 전부 계산이다.
 */
export default function Report() {
  const diaries = useDiary((s) => s.diaries);
  const actionCards = useDiary((s) => s.actionCards);

  // 볼 수 있는 주 = 해석이 준비된 주. 없는 주로는 넘어가지 않는다
  const analyses = weekAnalyses();
  const starts = availableWeekStarts(analyses);
  const [start, setStart] = useState<string>(initialWeekStart());
  const end = weekEnd(start);
  const { hasPrev, hasNext } = weekRange(starts, start);

  const unlocked = isReportUnlocked(diaries);
  const weekly = diariesInWeek(diaries, start, end);
  const days = weekDays(diaries, start, end);
  const top = weekTopEmotion(diaries, start, end);
  const actions = weekActions(actionCards, start, end);
  // 해석은 주차마다 다르다 — 같은 문장을 두 주에 보여주지 않는다
  const analysis = analyses[start];

  // 「이전 주 N회」도 계산한다 — 앞 주가 범위에 없으면 비교할 것이 없다
  const prevStart = adjacentWeek(starts, start, -1);
  const prevCount =
    prevStart == null ? null : diariesInWeek(diaries, prevStart, weekEnd(prevStart)).length;

  const go = (dir: -1 | 1) => {
    const next = adjacentWeek(starts, start, dir);
    if (next != null) setStart(next);
  };

  return (
    <TabScreen active="리포트">
      <AppText tone="strong" weight="700" style={styles.title}>
        리포트
      </AppText>

      {!unlocked ? (
        // 잠긴 화면을 만들지 않는다 — 같은 자리의 한 줄로 예고한다
        <Card style={styles.lockedCard}>
          <AppText tone="strong" weight="600" style={styles.lockedTitle}>
            {`일기 ${REPORT_UNLOCK_COUNT}편이 모이면 한 주를 정리해 드릴게요`}
          </AppText>
          <AppText variant="caption" tone="caption">
            {`지금까지 ${diaries.length}편 · 천천히 모아도 괜찮아요`}
          </AppText>
        </Card>
      ) : (
        <>
          {/*
            주차 이동. 범위의 끝은 화면이 따로 없으므로(`report.pendingStates`)
            **화살표를 흐리게 두고 누르지 못하게 하는 것**으로 끝을 말한다.
          */}
          <View style={styles.weekNav}>
            <WeekArrow glyph="‹" label="이전 주" enabled={hasPrev} onPress={() => go(-1)} />
            <AppText tone="body" weight="600" style={styles.weekRangeLabel}>
              {`${formatKoreanDateShort(start)} – ${formatKoreanDateShort(end)}`}
            </AppText>
            <WeekArrow glyph="›" label="다음 주" enabled={hasNext} onPress={() => go(1)} />
          </View>

          <ScrollView
            style={styles.stack}
            contentContainerStyle={styles.stackContent}
            showsVerticalScrollIndicator={false}
          >
            <WeeklySummaryCard
              summary={analysis?.summary ?? ""}
              retroCount={weekly.length}
              emotionCount={weekEmotionCount(days)}
            />

            <View style={styles.metrics}>
              <Metric
                value={analysis?.trendLabel ?? "—"}
                valueSize={15}
                delta={analysis?.trendDelta ?? ""}
                label="한 주의 흐름"
              />
              <Metric
                value={`${weekly.length}회`}
                // 비교는 기준을 밝혀 쓴다 — 앞 주가 범위에 없으면 비교하지 않는다
                delta={prevCount == null ? "" : `이전 주 ${prevCount}회`}
                label="회고 횟수"
              />
              <Metric
                value={top == null ? "—" : shortEmotionName(top.emotion)}
                valueSize={17}
                delta={top == null ? "" : `${top.count}번 기록`}
                label="가장 많이 기록한 감정"
              />
            </View>

            <WeeklyEmotionGrid flow={analysis?.emotionFlow ?? ""} days={days} />

            <ActionInsightCard
              actionText={analysis?.actionText ?? ""}
              made={actions.made}
              done={actions.done}
            />
          </ScrollView>
        </>
      )}
    </TabScreen>
  );
}

/**
 * 주차 화살표. 갈 곳이 없으면 **흐려지고 눌리지 않는다** — 누를 곳이 없는 표식을
 * 살려두지 않는다는 규칙(`M3.md`)과 같은 이유다.
 */
function WeekArrow({
  glyph,
  label,
  enabled,
  onPress,
}: {
  glyph: string;
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      hitSlop={14}
      onPress={onPress}
    >
      <AppText tone="body" style={[styles.navArrow, enabled ? null : styles.navArrowOff]}>
        {glyph}
      </AppText>
    </Pressable>
  );
}

/** `.metric` — 값 · 비교 · 라벨 세 줄. 비교는 기준을 밝혀 쓴다 */
function Metric({
  value,
  valueSize,
  delta,
  label,
}: {
  value: string;
  valueSize?: number;
  delta: string;
  label: string;
}) {
  return (
    <Card style={styles.metric}>
      <AppText
        tone="strong"
        weight="700"
        numberOfLines={1}
        style={[styles.metricValue, valueSize != null ? { fontSize: valueSize } : null]}
      >
        {value}
      </AppText>
      {delta.length > 0 ? (
        <AppText weight="600" numberOfLines={2} style={styles.metricDelta}>
          {delta}
        </AppText>
      ) : null}
      <AppText tone="caption" numberOfLines={2} style={styles.metricLabel}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: archiveTokens.titleSize,
    lineHeight: archiveTokens.titleSize * 1.3,
    letterSpacing: -0.44,
    paddingTop: 6,
    paddingBottom: theme.layout.gap.element,
  },

  weekNav: { flexDirection: "row", alignItems: "center", paddingBottom: theme.layout.gap.element },
  navArrow: { fontSize: 19, lineHeight: 21, width: 16, textAlign: "center" },
  navArrowOff: { opacity: 0.35 },
  weekRangeLabel: { flex: 1, fontSize: 13, lineHeight: 16, textAlign: "center" },

  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  stackContent: {
    gap: 10,
    paddingHorizontal: theme.layout.screenMargin,
    paddingBottom: theme.layout.gap.element,
  },

  lockedCard: { gap: 9 },
  lockedTitle: { fontSize: 15, lineHeight: 22.5 },

  metrics: { flexDirection: "row", gap: 7 },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: tokens.metric.gap,
    borderRadius: tokens.metric.radius,
    paddingVertical: tokens.metric.paddingVertical,
    paddingHorizontal: tokens.metric.paddingHorizontal,
  },
  metricValue: { fontSize: tokens.metric.valueSize, lineHeight: tokens.metric.valueSize * 1.2 },
  metricDelta: {
    fontSize: tokens.metric.deltaSize,
    lineHeight: tokens.metric.deltaSize * 1.25,
    textAlign: "center",
    color: tokens.deltaColor,
  },
  metricLabel: {
    fontSize: tokens.metric.labelSize,
    lineHeight: tokens.metric.labelSize * 1.3,
    textAlign: "center",
  },
});
