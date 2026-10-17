import { track } from "@/features/analytics";
import { AnalyticsResource } from "@/features/analytics/AnalyticsResource";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { TabScreen } from "@/components/ds";
import { WeekPickerSheet } from "@/components/report/WeekPickerSheet";
import { useDiary } from "@/features/diary/model/diary";
import { weekEnd } from "@/features/report/model/report";
import { isThisWeek, useWeeklyReport, weekOptions } from "@/features/report/model/weeklyReport";
import { ReportView } from "@/features/report/ui/ReportView";
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
 * ## 화면은 네 덩이다
 *
 * **주차 이동 → 한 주를 한 문장으로 → 감정 더미 일곱 → 바람카드 → 이번 주 기록 →
 * 기록 보러가기.** 각 조각의 규칙은 `src/components/report/` 에 있고 표시 영역의 조립과
 * 상태 분기는 `ReportView` 가 맡는다. 이 라우트는 조회·주 선택·이동·계측을 맡는다.
 *
 * **한 문장과 하루하루가 갈라졌다**(2026-09-12 · 사용자 시안) — 그 주를 한 문장으로
 * 말하는 자리와 하루하루를 쌓아 보여주는 카드는 읽는 눈이 다르다(`WeekMoodSummary` 머리말).
 *
 * ⚠ **카드 제목은 꼭 필요한 곳에만 둔다**(2026-09-12 · 사용자 결정). 시안이 붙였던 제목
 * 셋(「이번 주 한눈에 · 이번 주 감정들 · 바람카드」)을 걷고, 첫 문장은 **카드에서도 꺼내**
 * 날짜 줄 바로 아래 놓았다. 그다음 **감정 카드만 제목을 되살렸다** — 그 카드는 조약돌과
 * 요일뿐이라 무엇을 보는 판인지 말해 줄 글자가 없었다. 나머지는 첫 줄이 곧 제 이름을
 * 말한다(「이번 주에 찾은 바람들」 · 셈 카드의 섹션 라벨 「이번 주 기록」).
 *
 * - **처음부터 열려 있다.** 예전에는 일기 7편이 모이기 전까지 예고 한 줄만 보여줬는데
 *   (`RULES.md` 「리포트」), 사용자 결정(2026-08-24)으로 문턱을 없앴다 — 기록이 없는 주도
 *   **비어 있는 한 주**로 성실히 보여주고, 하루하루 쌓이면 그 자리가 저절로 채워진다.
 *   빈 화면이 곧 「아직 없다」는 말이라 잠금이 따로 할 일이 없다
 * - **「이번 주」는 이번 주에만 쓴다** — 지난 주를 넘겨보는 동안에는 「이 주 한눈에 ·
 *   이 주 감정들 · 이 주 기록 · 이 주의 기록 보기」다. 서버 멘트만은 그대로 둔다(BE 문장이라 여기서
 *   고치지 않는다 — `WeekMoodSummary` 주석)
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

  /**
   * 들어올 때마다 **이번 주부터 다시 연다**.
   *
   * ⚠ **`useEffect` 가 아니라 `useFocusEffect` 다**(2026-09-05). 지금은 탭이
   * `replace` 라(`TabScreen`) 나갈 때 화면이 죽고 돌아올 때 새로 마운트돼 둘이 같게
   * 동작하지만, 그건 **탭을 어떻게 옮기느냐에 딸린 사정**이다. 화면을 살려 두는
   * 방식으로 한 번만 바뀌면 리포트는 조용히 옛 주 수치를 든 채로 남는다 —
   * 「돌아오면 다시 받는다」를 화면이 직접 말하게 둔다. 부르는 횟수는 그대로다
   * (마운트와 포커스가 함께 오는 자리라 한 번이다).
   */
  useFocusEffect(
    useCallback(() => {
      void useWeeklyReport.getState().open();
    }, []),
  );

  /**
   * 머리의 날짜는 **보고 있는 주**에서 만든다 — 받아 온 값(`report.startDate`)을 쓰면
   * 주를 넘기는 동안 날짜만 옛 주에 머문다. 서버가 일요일로 맞추는 규칙과 같은 계산이라
   * 두 값은 어긋나지 않는다.
   */
  const start = weekStart;
  const end = weekEnd(weekStart);
  const thisWeek = isThisWeek(weekStart);
  const range = `${formatKoreanDateShort(start)} ~ ${formatKoreanDateShort(end)}`;

  // 일기가 있는 날 — 서버 칸은 「안 쓴 날」과 「썼는데 감정이 없는 날」을 똑같이 비워 주므로,
  // 빈 조약돌을 놓을 날은 로컬 일기가 가른다(`WeekEmotionStack`)
  const writtenDates = useMemo(() => new Set(diaries.map((d) => d.date)), [diaries]);

  const pick = (week: string) => {
    if (week !== weekStart) track("report_week_selected", { week_start: week });
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
      <AnalyticsResource
        kind="report"
        id={status === "ready" && report?.startDate === weekStart ? report.startDate : null}
        isReady={() => {
          const current = useWeeklyReport.getState();
          return current.status === "ready" && current.report?.startDate === weekStart;
        }}
      />
      <ReportView
        range={range}
        report={report}
        status={status}
        thisWeek={thisWeek}
        writtenDates={writtenDates}
        onOpenWeekPicker={() => setPicking(true)}
        onOpenArchive={() => router.replace({ pathname: "/archive", params: { date: weekStart } })}
      />
    </TabScreen>
  );
}
