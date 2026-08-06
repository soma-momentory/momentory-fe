import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { TabScreen } from "@/components/common/TabScreen";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import theme from "@/design/theme";
import { archive as archiveTokens, home, report as tokens } from "@/design/tokens.mvp";
import { shortEmotionName } from "@/features/archive/model/archive";
import { useDiary } from "@/features/diary/model/diary";
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
import { SAMPLE_REPORT_ANALYSIS, SAMPLE_REPORT_WEEK } from "@/mocks/sample";

/**
 * `W1` · 주간 리포트
 *
 * **리포트는 평가가 아니라 관찰이다**(`W1.md`) — 점수·등급·연속 일수·실행률·
 * 최고 기록을 쓰지 않는다.
 *
 * - **일기 7편부터 열린다.** 그 전에는 **잠긴 화면이 아니라 한 줄**로 예고한다 —
 *   잠긴 문을 보여주면 못 연 것이 사용자 탓이 된다
 * - **문구를 기간에 매지 않는다** — "이번 주 …"가 아니라 「한 주 요약 · 한 주의
 *   흐름 · 이어갈 한 가지」. 지난 주차를 넘겨볼 때도 같은 말이 맞아야 한다.
 *   비교는 **기준을 밝혀** 쓴다("이전 주보다 완만했어요")
 * - **흐름 라벨은 상태를 단정하지 않는다** — 「회복」은 진단형이라 뺐다
 * - **감정은 막대가 아니라 요일별 점**이다. 강도를 입력받지 않으므로 높이로
 *   말할 것이 없다. 하루 최대 3개, **이름을 함께** 적고 기록 없는 날은 흐린 칸
 * - **`[이어갈 한 가지]` 한 장**으로 행동을 한 번만 짚는다. 만든 수와 해본
 *   수만 적는다 — 별도 `[행동 인사이트]` 탭을 만들지 않는다
 *
 * ⚠ 한 주 요약 문장·흐름 라벨·이어갈 한 가지는 **서버가 그 주 대화를 읽고
 * 만드는 값**이라 아직 데모 문장이다(`SAMPLE_REPORT_ANALYSIS`) — **주마다 다른
 * 문장**이라 표로 들고 있고, 그 표의 키가 곧 넘겨볼 수 있는 주다.
 * 수치(회고 수 · 감정 수 · 이전 주 N회 · 행동 만든/해본 수)는 전부 계산이다.
 */
export default function Report() {
  const diaries = useDiary((s) => s.diaries);
  const actionCards = useDiary((s) => s.actionCards);

  // 볼 수 있는 주 = 해석이 준비된 주. 없는 주로는 넘어가지 않는다
  const starts = availableWeekStarts(SAMPLE_REPORT_ANALYSIS);
  // `SAMPLE_REPORT_WEEK` 가 `as const` 라 명시하지 않으면 리터럴로 좁혀져 못 옮긴다
  const [start, setStart] = useState<string>(SAMPLE_REPORT_WEEK.start);
  const end = weekEnd(start);
  const { hasPrev, hasNext } = weekRange(starts, start);

  const unlocked = isReportUnlocked(diaries);
  const weekly = diariesInWeek(diaries, start, end);
  const days = weekDays(diaries, start, end);
  const top = weekTopEmotion(diaries, start, end);
  const actions = weekActions(actionCards, start, end);
  // 해석은 주차마다 다르다 — 같은 문장을 두 주에 보여주지 않는다
  const analysis = SAMPLE_REPORT_ANALYSIS[start];

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
        <Card style={styles.card}>
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
            <Card style={styles.summaryCard}>
              <AppText tone="accent" weight="600" style={styles.section}>
                한 주 요약
              </AppText>
              <AppText tone="strong" weight="700" style={styles.summary}>
                {analysis?.summary ?? ""}
              </AppText>
              <AppText variant="caption" tone="caption">
                {`회고 ${weekly.length}회 · 감정 기록 ${weekEmotionCount(days)}개를 바탕으로 바바가 정리했어요`}
              </AppText>
            </Card>

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

            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <AppText tone="accent" weight="600" style={styles.section}>
                  감정 변화
                </AppText>
                <AppText variant="caption" tone="caption">
                  주 초반 → 주 후반
                </AppText>
              </View>
              <AppText variant="caption" tone="caption">
                그날 기록한 감정이에요 · 하루 최대 3개까지 보여줘요
              </AppText>
              <AppText tone="strong" weight="500" style={styles.flow}>
                {analysis?.emotionFlow ?? ""}
              </AppText>

              {/* 막대가 아니라 점이다 — 높이로 말할 것이 없다 */}
              <View style={styles.weekRow}>
                {days.map((d) => {
                  const off = d.emotions.length === 0;
                  return (
                    <View
                      key={d.date}
                      accessibilityLabel={`${d.label}요일`}
                      style={[styles.weekCol, off ? styles.weekColOff : null]}
                    >
                      <AppText tone="caption" weight="600" style={styles.weekLabel}>
                        {d.label}
                      </AppText>
                      <View style={styles.weekDots}>
                        {d.emotions.map((e, i) => (
                          <View
                            key={`${e}-${i}`}
                            style={[
                              styles.weekDot,
                              { backgroundColor: theme.emotions[e - 1]?.base },
                            ]}
                          />
                        ))}
                      </View>
                      {/* 색만으로 판단하게 하지 않는다 — 이름을 함께 적는다 */}
                      {off ? (
                        <AppText tone="caption" style={styles.weekName}>
                          기록 없음
                        </AppText>
                      ) : (
                        d.emotions.map((e, i) => (
                          <AppText key={`${e}-n-${i}`} tone="body" weight="500" style={styles.weekName}>
                            {theme.emotions[e - 1]?.name}
                          </AppText>
                        ))
                      )}
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* 행동을 한 번만 짚는다 — 만든 수와 해본 수만. 실행률·연속은 세지 않는다 */}
            <Card style={styles.card}>
              <AppText tone="accent" weight="600" style={styles.section}>
                이어갈 한 가지
              </AppText>
              <AppText tone="strong" weight="500" style={styles.actionText}>
                {analysis?.actionText ?? ""}
              </AppText>
              {/* 만든 수와 해본 수만 — 그 주 행동 카드에서 센다. 실행률이 아니다 */}
              <AppText variant="caption" tone="caption">
                {`${actions.made}번 만들었고 · ${actions.done}번 해봤어요`}
              </AppText>
            </Card>
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

const { semantic } = theme.colors;

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

  card: { gap: 9 },
  summaryCard: { gap: 9, backgroundColor: semantic.surfaceTone, borderColor: "transparent" },
  section: {
    fontSize: home.sectionLabel.fontSize,
    lineHeight: home.sectionLabel.fontSize,
    letterSpacing: home.sectionLabel.letterSpacing,
  },
  summary: { fontSize: 18, lineHeight: 28.8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flow: { fontSize: 13.5, lineHeight: 21.6 },
  actionText: { fontSize: 14, lineHeight: 22 },
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

  weekRow: { flexDirection: "row", gap: tokens.weekday.gap, alignItems: "flex-start" },
  weekCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 6,
    paddingVertical: tokens.weekday.paddingVertical,
    paddingHorizontal: tokens.weekday.paddingHorizontal,
    borderRadius: tokens.weekday.radius,
    backgroundColor: `${semantic.surface}B3`,
  },
  // 기록 없는 날은 면이 없다 — 빈 칸을 강조하지 않는다
  weekColOff: { backgroundColor: "transparent" },
  weekLabel: { fontSize: tokens.weekday.labelSize, lineHeight: tokens.weekday.labelSize },
  weekDots: { flexDirection: "row", gap: 4, minHeight: tokens.weekday.dot },
  weekDot: {
    width: tokens.weekday.dot,
    height: tokens.weekday.dot,
    borderRadius: tokens.weekday.dot / 2,
  },
  // 상류 9.5px → 접근성 하한 11px (RULES 「접근성」)
  weekName: {
    fontSize: tokens.weekday.nameSize,
    lineHeight: tokens.weekday.nameSize * 1.25,
    textAlign: "center",
  },
});
