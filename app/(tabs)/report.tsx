import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, IconButton, TabScreen, Text } from "@/components/ds";
import { ActionInsightCard } from "@/components/report/ActionInsightCard";
import { WeeklySummaryCard } from "@/components/report/WeeklySummaryCard";
import { WeekStatList, type WeekStat } from "@/components/report/WeekStatList";
import { label as labelColor, space } from "@/design/ds";
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
 * ## 새 디자인 (`PLAN.md` A Phase 4 · `docs/DESIGN.md` 「리포트」)
 *
 * ⚠ **감정 도넛이 사라졌다.** `design.md` 「리포트」가 「도넛·비율·범례 **없이**
 * 7일 감정 흐름 + 요약 2줄, 지표는 `9개 완료` 형태」라고 못박고 「완료율·%·분석
 * 같은 표현을 쓰지 않는다」를 덧붙인다. 그래서 `EmotionDonut`(범례·비율 계산
 * 포함)과 초록 통계 패널(`WeekStatsPanel`)을 지웠고, 화면은 세 덩이가 됐다:
 * **주차 이동 → 한 주 요약(7일 흐름 + 요약 2줄) → 한 주 한눈에 → 이어갈 한 가지.**
 *
 * **세는 것은 그대로다** — `features/report/model/report.ts` 의 집계 함수는 한 줄도
 * 바뀌지 않았다. 바뀐 것은 그리는 방법뿐이고, 사라진 것은 **비율**이다(도넛이
 * 계산하던 %는 어디에도 남지 않는다 — 그것이 이 변경의 요지다).
 *
 * 이 파일은 **조합만** 한다 — 각 조각의 규칙은 `src/components/report/` 에 있고,
 * 여기는 주차 이동과 수치 계산을 잇는다.
 *
 * - **일기 7편부터 열린다.** 그 전에는 **잠긴 화면이 아니라 한 줄**로 예고한다 —
 *   잠긴 문을 보여주면 못 연 것이 사용자 탓이 된다
 * - **문구를 기간에 매지 않는다** — 시안의 「이번 주의 마음」·「이번 주 한눈에」가
 *   아니라 「한 주 요약 · 한 주 한눈에 · 이어갈 한 가지」다(문안은 `docs/spec` 우선)
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

  if (!unlocked) {
    return (
      <TabScreen active="리포트">
        {/* 잠긴 화면을 만들지 않는다 — 같은 자리의 한 줄로 예고한다 */}
        <Card padding="loose" style={styles.locked}>
          <Text variant="headline1" color={labelColor.strong}>
            {`일기 ${REPORT_UNLOCK_COUNT}편이 모이면 한 주를 정리해 드릴게요`}
          </Text>
          <Text variant="body2Reading" color={labelColor.alternative}>
            {`지금까지 ${diaries.length}편 · 천천히 모아도 괜찮아요`}
          </Text>
        </Card>
      </TabScreen>
    );
  }

  /**
   * 요약 3칸(`W1.md`). **분모를 붙이지 않는다** — 「5회 / 7일 중」이 되는 순간
   * 비율이 읽히고, 비율은 관찰이 아니라 평가다(`design.md` 「리포트」).
   */
  const stats: readonly WeekStat[] = [
    {
      icon: "clock",
      label: "한 주의 흐름",
      value: analysis?.trendLabel ?? "—",
      note: analysis?.trendDelta ?? "",
    },
    {
      icon: "document",
      label: "회고 횟수",
      value: `${weekly.length}회`,
      // 비교는 기준을 밝혀 쓴다 — 앞 주가 범위에 없으면 비교하지 않는다
      note: prevCount == null ? "" : `이전 주 ${prevCount}회`,
    },
    {
      icon: "heart",
      label: "가장 많이 기록한 감정",
      value: top == null ? "—" : shortEmotionName(top.emotion),
      note: top == null ? "" : `${top.count}번 기록`,
    },
  ];

  return (
    <TabScreen active="리포트">
      {/*
        주차 이동. 범위의 끝은 화면이 따로 없으므로(`report.pendingStates`)
        **화살표를 눌리지 않게 하는 것**으로 끝을 말한다.
      */}
      <View style={styles.weekNav}>
        <IconButton
          name="chevron-left"
          size={20}
          accessibilityLabel="이전 주"
          disabled={!hasPrev}
          onPress={() => go(-1)}
          style={styles.navButton}
        />
        <Text variant="headline1" color={labelColor.strong} numberOfLines={1}>
          {`${formatKoreanDateShort(start)} ~ ${formatKoreanDateShort(end)}`}
        </Text>
        <IconButton
          name="chevron-right"
          size={20}
          accessibilityLabel="다음 주"
          disabled={!hasNext}
          onPress={() => go(1)}
          style={styles.navButton}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WeeklySummaryCard
          summary={analysis?.summary ?? ""}
          flow={analysis?.emotionFlow ?? ""}
          days={days}
          retroCount={weekly.length}
          emotionCount={weekEmotionCount(days)}
        />

        <View style={styles.section}>
          <Text variant="label1" color={labelColor.neutral} style={styles.sectionLabel}>
            한 주 한눈에
          </Text>
          <WeekStatList stats={stats} />
        </View>

        <ActionInsightCard
          actionText={analysis?.actionText ?? ""}
          made={actions.made}
          done={actions.done}
        />

        {/* 보조 행동이라 Outlined 다 — 이 화면에 Solid Primary 는 없다(`design.md` §6).
            탭은 쌓이는 화면이 아니라 **옮겨간다**(`TabScreen` 과 같은 이유) */}
        <Button
          label="이 주의 기록 보러가기"
          variant="outlined"
          fill
          onPress={() => router.replace("/archive")}
        />
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  // 히트 44 는 유지하되 화면 좌우 패딩(20) 안쪽에서 시작하도록 당긴다
  navButton: { marginHorizontal: -space.md },

  // 남은 높이를 다 쓰고 그 안에서만 스크롤한다 — 안 잡으면 내용 높이만큼 자라 넘친다
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: space.lg, paddingBottom: space.xl },
  section: { gap: space.md },
  // 시안이 섹션 라벨만 4px 안쪽에서 시작한다
  sectionLabel: { paddingLeft: space.xs },

  locked: { marginTop: space.lg, gap: space.sm },
});
