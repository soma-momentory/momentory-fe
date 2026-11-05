import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import { TabScreen } from "@/components/ds";
import { track } from "@/features/analytics";
import { AnalyticsResource } from "@/features/analytics/AnalyticsResource";
import { useDiary } from "@/features/diary/model/diary";
import { weekEnd } from "@/features/report/model/report";
import { clock } from "@/lib/clock";
import { notebookOptions, useWeeklyBook, type BookPage } from "@/features/report/model/weeklyBook";
import { NotebookPickerSheet } from "@/features/report/ui/book/NotebookPickerSheet";
import { WeeklyBookView } from "@/features/report/ui/book/WeeklyBookView";

/**
 * `W1` · 주간 리포트 — 끝난 한 주를 공책 한 권으로 본다.
 *
 * **리포트는 평가가 아니라 관찰이다**(`W1.md`) — 점수 · 등급 · 연속 일수 · 실행률 · 최고 기록을 쓰지 않는다. 감정
 * 도넛은 횟수로만 쓴다(`DESIGN.md` 「리포트」 2026-11-04). 이 화면은 아무것도 세지 않는다 — 서버가 한 벌로 준다.
 *
 * 들어올 때마다 서버가 고른 가장 최근 공책을 연다(일기가 남은 가장 최근의 끝난 주). 주는 일요일 04:00 에 바뀐다.
 * 실패는 한 줄로 흡수한다 — 모달도 재시도 버튼도 두지 않는다(`RULES.md` 4). 탭을 다시 열면 그때 다시 받는다.
 */
export default function Report() {
  const allDiaries = useDiary((s) => s.diaries);
  const book = useWeeklyBook((s) => s.book);
  const status = useWeeklyBook((s) => s.status);
  const showHint = useWeeklyBook((s) => s.showHint);
  const [picking, setPicking] = useState(false);
  // 공책에서 일기를 보고 돌아오면 보던 공책에 그대로 있는다 — 최신 공책으로 튀지 않게
  const backFromDiary = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (backFromDiary.current) {
        backFromDiary.current = false;
        return;
      }
      void useWeeklyBook.getState().open();
    }, []),
  );

  const diaries = useMemo(() => {
    if (book == null) return [];
    const end = weekEnd(book.startDate);
    return allDiaries.filter((d) => d.date >= book.startDate && d.date <= end);
  }, [allDiaries, book]);

  const todayDiary = allDiaries.find((d) => d.date === clock.today());
  const week = book?.startDate;
  const onTurn = useCallback(
    (page: BookPage | "cover") => {
      if (week != null) track("report_page_viewed", { week_start: week, page });
    },
    [week],
  );

  return (
    <TabScreen
      active="리포트"
      overlay={
        <>
          <AnalyticsResource
            kind="report"
            id={status === "ready" && book != null ? book.startDate : null}
            isReady={() => useWeeklyBook.getState().status === "ready"}
          />
          {/* 다른 공책을 고르면 덮인 표지부터 다시 시작한다 */}
          <WeeklyBookView
            key={week ?? "loading"}
            book={book}
            status={status}
            showHint={showHint}
            diaries={diaries}
            onOpenPast={() => setPicking(true)}
            onOpenDiary={(id) => {
              backFromDiary.current = true;
              router.push(`/diary/${id}`);
            }}
            writeLabel={todayDiary == null ? "오늘 일기 쓰기" : "오늘 일기 보기"}
            onWriteDiary={() =>
              router.push(todayDiary == null ? "/retro/confirm" : `/diary/${todayDiary.id}`)
            }
            onTurn={onTurn}
          />
          {picking ? (
            <NotebookPickerSheet
              options={notebookOptions(allDiaries)}
              current={week ?? null}
              onSelect={(weekStart) => {
                setPicking(false);
                track("report_week_selected", { week_start: weekStart });
                void useWeeklyBook.getState().selectWeek(weekStart);
              }}
              onDismiss={() => setPicking(false)}
            />
          ) : null}
        </>
      }
    >
      <View />
    </TabScreen>
  );
}
