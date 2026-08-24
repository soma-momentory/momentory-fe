import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Icon, Spinner, TabScreen, Text } from "@/components/ds";
import { WeekCountList } from "@/components/report/WeekCountList";
import { WeekMoodCard } from "@/components/report/WeekMoodCard";
import { WeekPickerSheet } from "@/components/report/WeekPickerSheet";
import { label as labelColor, layout, space } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { weekEnd } from "@/features/report/model/report";
import { isThisWeek, useWeeklyReport, weekOptions } from "@/features/report/model/weeklyReport";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `W1` · 주간 리포트
 *
 * **리포트는 평가가 아니라 관찰이다**(`W1.md`) — 점수·등급·연속 일수·실행률·
 * 최고 기록을 쓰지 않는다. 감정 도넛·비율·범례도 없다(`DESIGN.md` 「리포트」).
 *
 * ## 서버가 붙었다 (2026-08-24)
 *
 * 예전에는 화면이 **일기·행동 카드 store 를 직접 세고** 한 주 해석 문장만 서버를
 * 기다렸는데, 계약에 그 엔드포인트가 없어 문장 자리가 **비어 있었다**
 * (`data/reportRepository.ts` — 이 브랜치에서 지웠다). 이제 `GET /reports/weekly`
 * 하나가 마음 일곱 칸 · 요약 멘트 · 일정 · 행동 카드 · 일기 셈을 한 벌로 준다.
 *
 * 그래서 이 화면은 **아무것도 세지 않는다** — `features/report/model/report.ts` 의
 * 집계 함수를 부르던 자리가 전부 사라졌다(그 파일은 홈의 이번 주 감정 줄이 아직 쓴다).
 * 일정 셈을 서버가 하는 것이 특히 중요하다: 숨김·삭제 규칙을 화면이 다시 구현하면
 * 홈 목록과 리포트가 서로 다른 수를 말하게 된다.
 *
 * ## 화면은 세 덩이다
 *
 * **주차 이동 → 이번 주의 마음 → 이번 주 한눈에 → 기록 보러가기.**
 * 각 조각의 규칙은 `src/components/report/` 에 있고 여기는 조립과 상태 분기만 한다.
 *
 * - **처음부터 열려 있다.** 예전에는 일기 7편이 모이기 전까지 예고 한 줄만 보여줬는데
 *   (`RULES.md` 「리포트」), 사용자 결정(2026-08-24)으로 문턱을 없앴다 — 기록이 없는 주도
 *   **비어 있는 한 주**로 성실히 보여주고, 하루하루 쌓이면 그 자리가 저절로 채워진다.
 *   빈 화면이 곧 「아직 없다」는 말이라 잠금이 따로 할 일이 없다
 * - **「이번 주」는 이번 주에만 쓴다** — 지난 주를 넘겨보는 동안에는 「이 주의 마음 ·
 *   이 주 한눈에 · 이 주의 기록 보기」다. 서버 멘트만은 그대로 둔다(BE 문장이라 여기서
 *   고치지 않는다 — `WeekMoodCard` 주석)
 * - **주는 날짜를 눌러 목록에서 고른다**(`WeekPickerSheet`) — **일기가 남은 주만**
 *   선다. 예전에는 머리의 `‹ ›` 로 한 주씩 옮겼고 그다음엔 달력이었는데, 둘 다
 *   기록이 없는 주를 함께 보여줬다(사용자 요청 2026-08-24)
 * - 그래서 **아직 오지 않은 주는 목록에 아예 없다** — 셀 것이 없는 주다.
 *   서버는 아무 주나 「빈 주」로 성실히 답하지만 그 주를 넘겨볼 길을 두지 않는다
 * - **실패는 한 줄로 흡수한다** — 모달도 재시도 버튼도 두지 않는다(`RULES.md` 4).
 *   탭을 다시 열면 그때 다시 받는다
 */
export default function Report() {
  // 고를 수 있는 주는 **일기가 남은 주**다 — 그 목록의 재료가 일기 store 다
  const diaries = useDiary((s) => s.diaries);

  const weekStart = useWeeklyReport((s) => s.weekStart);
  const report = useWeeklyReport((s) => s.report);
  const status = useWeeklyReport((s) => s.status);

  const [picking, setPicking] = useState(false);

  // 탭은 `replace` 라 들어올 때마다 새로 마운트된다 — 그때마다 **이번 주부터** 다시 연다
  useEffect(() => {
    void useWeeklyReport.getState().open();
  }, []);

  /**
   * 머리의 날짜는 **보고 있는 주**에서 만든다 — 받아 온 값(`report.startDate`)을 쓰면
   * 주를 넘기는 동안 날짜만 옛 주에 머문다. 서버가 일요일로 맞추는 규칙과 같은 계산이라
   * 두 값은 어긋나지 않는다.
   */
  const start = weekStart;
  const end = weekEnd(weekStart);
  const thisWeek = isThisWeek(weekStart);
  const range = `${formatKoreanDateShort(start)} ~ ${formatKoreanDateShort(end)}`;

  const pick = (week: string) => {
    setPicking(false);
    void useWeeklyReport.getState().selectWeek(week);
  };

  return (
    <TabScreen
      active="리포트"
      overlay={
        picking ? (
          <WeekPickerSheet
            weeks={weekOptions(diaries, weekStart)}
            weekStart={weekStart}
            onSelect={pick}
            onDismiss={() => setPicking(false)}
          />
        ) : null
      }
    >
      {/*
        날짜 줄 **전체**가 주를 고르는 문이다 — 날짜를 눌러도 아이콘을 눌러도 같은 시트가
        열린다. 아이콘은 **줄 오른쪽 끝**에 선다(2026-08-24 · 사용자 요청): 날짜 옆에
        붙여 두면 글자의 장식으로 읽혀 「고를 수 있다」가 티가 나지 않았다. 오른쪽 끝은
        보관함의 기간 줄(`기간 · ›`)과 같은 자리라, 「누르면 바뀌는 값」의 문법을 공유한다.
        아이콘 세트에 아래 꺾쇠가 없어 달력으로 쓴다(`DESIGN.md` §10 「없는 글리프를
        만들지 않는다」).
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${range} · 주 고르기`}
        onPress={() => setPicking(true)}
        style={styles.weekNav}
      >
        {/* 날짜는 **손글씨(교보 2025)** 로 쓴다(2026-08-24) — 제목이 따로 없는 화면에서
            이 줄이 손글씨 제목 노릇을 한다(보관함·쉼터·마이의 `title3Hand` 와 같은 자리).
            `headline1`(18) 자리를 `title3Hand`(24)로 올린다 — 손글씨는 같은 크기 고딕보다
            작아 보인다(`my.tsx` 의 같은 판단). 길어지면 줄이 아니라 말줄임으로 접는다 */}
        <Text variant="title3Hand" color={labelColor.strong} numberOfLines={1} style={styles.range}>
          {range}
        </Text>
        {/* `interaction.inactive` 가 아니다 — 그 토큰은 「지금 활성이 아닌 것」이고
            이 아이콘은 **눌리는 것**이다. 값(날짜)보다는 약하게 둔다 */}
        <Icon name="calendar" size={20} color={labelColor.neutral} />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {report == null ? (
          <Card padding="loose" style={styles.notice}>
            {status === "failed" ? (
              // 한 줄로 흡수한다 — 무엇을 잘못했는지 묻지 않고, 다시 열면 다시 받는다
              <Text variant="body2Reading" color={labelColor.alternative}>
                리포트를 불러오지 못했어요 · 잠시 뒤에 다시 열어 주세요
              </Text>
            ) : (
              <View style={styles.loading}>
                <Spinner />
                <Text variant="body2Reading" color={labelColor.alternative}>
                  한 주를 모으고 있어요
                </Text>
              </View>
            )}
          </Card>
        ) : (
          <>
            <WeekMoodCard report={report} thisWeek={thisWeek} />

            <View style={styles.section}>
              <Text variant="label1" color={labelColor.neutral} style={styles.sectionLabel}>
                {thisWeek ? "이번 주 한눈에" : "이 주 한눈에"}
              </Text>
              <WeekCountList report={report} />
            </View>

            {/* 보조 행동이라 Outlined 다 — 이 화면에 Solid Primary 는 없다(`DESIGN.md` §6).
                탭은 쌓이는 화면이 아니라 **옮겨간다**(`TabScreen` 과 같은 이유).
                **보고 있는 주의 첫날(일요일)을 들려 보낸다** — 보관함이 그 달을 열고 그
                칸을 고른 채로 선다. 날짜를 안 주면 오늘이 든 달로 열려서, 지난 주를 보다
                누른 사람은 「내가 보던 주」를 다시 찾아가야 한다 */}
            <Button
              label={thisWeek ? "이번 주 기록 보기" : "이 주의 기록 보기"}
              variant="outlined"
              fill
              onPress={() => router.replace({ pathname: "/archive", params: { date: weekStart } })}
            />
          </>
        )}
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  // 줄 전체가 눌린다 — 히트 44 를 지키고(`RULES.md` 터치 최소 44) 날짜는 왼쪽,
  // 아이콘은 오른쪽 끝이다(다른 탭의 손글씨 제목도 왼쪽에서 시작한다)
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    minHeight: layout.minTouch,
    marginTop: space.sm,
    marginBottom: space.md,
  },

  // 글꼴 배율이 커져도 달력 아이콘을 밀어내지 않는다 — 글자 쪽이 줄어든다
  range: { flexShrink: 1 },

  // 남은 높이를 다 쓰고 그 안에서만 스크롤한다 — 안 잡으면 내용 높이만큼 자라 넘친다
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: space.lg, paddingBottom: space.xl },
  section: { gap: space.md },
  // 시안이 섹션 라벨만 4px 안쪽에서 시작한다
  sectionLabel: { paddingLeft: space.xs },

  notice: { gap: space.sm },
  loading: { alignItems: "center", gap: space.md, paddingVertical: space.sm },
});
