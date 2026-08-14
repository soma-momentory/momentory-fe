import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Hill } from "@/components/common/Hill";
import { TabScreen } from "@/components/common/TabScreen";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ActionInsightCard } from "@/components/report/ActionInsightCard";
import { EmotionDonut, EmotionLegend, topWeekEmotions } from "@/components/report/EmotionDonut";
import { WeeklyEmotionGrid } from "@/components/report/WeeklyEmotionGrid";
import { WeeklySummaryCard } from "@/components/report/WeeklySummaryCard";
import { WeekStatsPanel } from "@/components/report/WeekStatsPanel";
import { paperColors, paperReport, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
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
 * ## 새 디자인 (2026-08-14 · `PLAN.md` Phase 3-3)
 *
 * `docs/design/prototype/리포트.dc.html` 의 세 층을 그대로 옮겼다:
 * **주 이동 → 감정 도넛 + 범례 → 언덕 → 코멘트 → 언덕 → 초록 통계 패널.**
 * 값(비율·해석 문장)은 그대로고 **보는 순서**만 바뀌었다 — 그 주가 어떤
 * 감정으로 채워졌는지를 먼저 보고, 근거 수치는 아래에서 확인한다.
 *
 * 이 파일은 **조합만** 한다 — 각 조각의 규칙은 `src/components/report/` 에 있고,
 * 여기는 주차 이동과 수치 계산을 잇는다.
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
  /** 도넛 가운데에 이름이 적히는 조각 — 범례를 누르면 바뀐다 */
  const [focus, setFocus] = useState(0);
  const end = weekEnd(start);
  const { hasPrev, hasNext } = weekRange(starts, start);

  const unlocked = isReportUnlocked(diaries);
  const weekly = diariesInWeek(diaries, start, end);
  const days = weekDays(diaries, start, end);
  const top = weekTopEmotion(diaries, start, end);
  const actions = weekActions(actionCards, start, end);
  const slices = topWeekEmotions(days);
  // 해석은 주차마다 다르다 — 같은 문장을 두 주에 보여주지 않는다
  const analysis = analyses[start];

  // 「이전 주 N회」도 계산한다 — 앞 주가 범위에 없으면 비교할 것이 없다
  const prevStart = adjacentWeek(starts, start, -1);
  const prevCount =
    prevStart == null ? null : diariesInWeek(diaries, prevStart, weekEnd(prevStart)).length;

  const go = (dir: -1 | 1) => {
    const next = adjacentWeek(starts, start, dir);
    // 주가 바뀌면 도넛의 초점도 그 주의 최다 감정으로 돌아간다
    if (next != null) {
      setStart(next);
      setFocus(0);
    }
  };

  if (!unlocked) {
    return (
      <TabScreen active="리포트" background="paperFlat">
        {/* 잠긴 화면을 만들지 않는다 — 같은 자리의 한 줄로 예고한다 */}
        <Card variant="paperSoft" style={styles.lockedCard}>
          <AppText weight="700" style={styles.lockedTitle}>
            {`일기 ${REPORT_UNLOCK_COUNT}편이 모이면 한 주를 정리해 드릴게요`}
          </AppText>
          <AppText style={styles.lockedCaption}>
            {`지금까지 ${diaries.length}편 · 천천히 모아도 괜찮아요`}
          </AppText>
        </Card>
      </TabScreen>
    );
  }

  return (
    <TabScreen active="리포트" background="paperFlat">
      {/*
        주차 이동. 범위의 끝은 화면이 따로 없으므로(`report.pendingStates`)
        **화살표를 흐리게 두고 누르지 못하게 하는 것**으로 끝을 말한다.
      */}
      <View style={styles.weekNav}>
        <WeekArrow glyph="‹" label="이전 주" enabled={hasPrev} onPress={() => go(-1)} />
        <AppText weight="700" numberOfLines={1} style={styles.weekRangeLabel}>
          {`${formatKoreanDateShort(start)} ~ ${formatKoreanDateShort(end)}`}
        </AppText>
        <WeekArrow glyph="›" label="다음 주" enabled={hasNext} onPress={() => go(1)} />
      </View>

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.donutSlot}>
          <EmotionDonut slices={slices} focus={focus} />
        </View>
        <EmotionLegend slices={slices} focus={focus} onFocus={setFocus} />

        {/* 언덕이 층을 나눈다 — 위는 그 주의 그림, 아래는 그 주를 읽은 말 */}
        <Hill height={36} style={styles.hillCap} />
        <View style={styles.hillSection}>
          <WeeklySummaryCard
            summary={analysis?.summary ?? ""}
            retroCount={weekly.length}
            emotionCount={weekEmotionCount(days)}
          />
          <WeeklyEmotionGrid flow={analysis?.emotionFlow ?? ""} days={days} />
          <ActionInsightCard
            actionText={analysis?.actionText ?? ""}
            made={actions.made}
            done={actions.done}
          />
        </View>

        <Hill color={paperReport.panel} height="md" style={styles.panelCap} />
        <WeekStatsPanel
          rows={[
            {
              label: "한 주의 흐름",
              value: analysis?.trendLabel ?? "—",
              note: analysis?.trendDelta ?? "",
            },
            {
              label: "회고 횟수",
              value: `${weekly.length}회`,
              // 비교는 기준을 밝혀 쓴다 — 앞 주가 범위에 없으면 비교하지 않는다
              note: prevCount == null ? "" : `이전 주 ${prevCount}회`,
            },
            {
              label: "가장 많이 기록한 감정",
              value: top == null ? "—" : shortEmotionName(top.emotion),
              note: top == null ? "" : `${top.count}번 기록`,
            },
          ]}
          linkLabel="이 주의 기록 보러가기"
          // 탭은 쌓이는 화면이 아니다 — 보관함으로 **옮겨간다**(TabScreen 과 같은 이유)
          onLinkPress={() => router.replace("/archive")}
        />
      </ScrollView>
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
      <AppText style={[styles.navArrow, enabled ? null : styles.navArrowOff]}>{glyph}</AppText>
    </Pressable>
  );
}

const { styles: type } = paperTypography;
const FULL_BLEED = -theme.layout.screenMargin;

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  navArrow: {
    fontSize: type.sheetTitle.fontSize,
    lineHeight: type.sheetTitle.lineHeight,
    width: 20,
    textAlign: "center",
    color: paperColors.text.green,
  },
  navArrowOff: { opacity: 0.35 },
  // 시안의 주 라벨은 20px/700 — 타이포 표에 없는 한 칸이라 여기서만 쓴다
  weekRangeLabel: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    textAlign: "center",
    color: paperColors.text.primary,
  },

  // 층(도넛 → 언덕 → 코멘트 → 언덕 → 패널)이 화면 끝까지 이어진다
  stack: { flex: 1, marginHorizontal: FULL_BLEED },
  stackContent: { flexGrow: 1 },

  donutSlot: { paddingTop: 12, paddingBottom: 8 },
  // 곡선 캡의 옆·위는 그 앞 층의 색이다 — 캡만 그리고 면은 아래 View 가 잇는다
  hillCap: { marginTop: 4 },
  hillSection: {
    backgroundColor: paperColors.bg.hill,
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 10,
  },
  panelCap: { backgroundColor: paperColors.bg.hill },

  lockedCard: { marginTop: 16, gap: 9 },
  lockedTitle: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.primary,
  },
  lockedCaption: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.green,
  },
});
