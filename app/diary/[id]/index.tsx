import { AnalyticsResource } from "@/features/analytics/AnalyticsResource";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { DayScheduleList } from "@/components/archive/DayScheduleList";
import { WeatherCredit } from "@/components/diary/WeatherCredit";
import { IconButton, Modal, Screen, Text, TopNavigation } from "@/components/ds";
import { ActionCardSection } from "@/components/diary/ActionCardSection";
import { DiaryNotebookHeader, NotebookBackground } from "@/components/diary/DiaryNotebook";
import { iosVariant, label as labelColor, space } from "@/design/ds";
import { useDiaryWeather } from "@/features/diary/model/useDiaryWeather";
import { actionCardOf, useDiary } from "@/features/diary/model/diary";
import { useDay, useTodayContext, visibleSchedules } from "@/features/home/model/day";
import { fetchLetter } from "@/features/letter/data/letterApi";
import { forgetLetterOf, useLetters } from "@/features/letter/model/letter";
import { LetterPreviewCard } from "@/features/letter/ui/LetterPreviewCard";
import { formatKoreanDateShort } from "@/lib/day";

/** 모눈종이 위에 남긴 일기. 바람 카드와 일정은 읽기 전용으로 이어진다. */
export default function DiaryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const diary = useDiary((s) => s.diaries.find((d) => d.id === id));
  const card = useDiary((s) => actionCardOf(s.actionCards, id ?? ""));
  const remove = useDiary((s) => s.remove);
  const { date: today } = useTodayContext();
  /**
   * 그날 일정 — **그 날짜의 줄만** 골라 온다(`app-flow.md` §2.3). 지금 일정
   * store 는 서버에서 **오늘 하루치**만 받아 두므로, 지난 일기를 열면 고를 줄이
   * 없어 블록이 통째로 숨는다 — 그것이 「일정이 없는 날」과 같은 처리다.
   * 날짜별 조회가 붙으면 이 selector 안쪽만 바뀐다.
   */
  const schedules = useDay((s) => s.schedules);

  const { weather, status: weatherStatus } = useDiaryWeather(
    diary?.id,
    diary?.date,
    diary?.weather,
  );

  const [confirmDelete, setConfirmDelete] = useState(false);

  // 그 날짜의 편지 — 있으면 테이프로 붙인 「바바의 편지」 쪽지를 둔다(PRD 3 예외 흐름 · 지난 편지는 여기서 연다)
  const letter = useLetters((s) => s.summaries?.find((l) => l.date === diary?.date) ?? null);
  const letterBody = useLetters((s) => (diary == null ? undefined : s.letters[diary.date]));
  useEffect(() => {
    if (useLetters.getState().summaries == null) void useLetters.getState().refresh();
  }, []);
  // 미리보기 글 — 남겨 둔 편지가 없을 때만 부른다. 못 받으면 날짜와 서명만 남는다
  const letterDate = letter?.date;
  useEffect(() => {
    if (letterDate == null || useLetters.getState().letters[letterDate] != null) return;
    void fetchLetter(letterDate).then((result) => {
      if (result.ok) useLetters.getState().keep(result.data);
    });
  }, [letterDate]);

  // 지워진 일기를 열고 있었다면 보관함으로 — 오류 화면을 만들지 않는다
  if (diary == null) return <Redirect href="/archive" />;

  const daySchedules = visibleSchedules(schedules).filter((s) => s.date === diary.date);

  return (
    <Screen grid={false} backdrop={<NotebookBackground />}>
      <AnalyticsResource kind="diary" id={diary.id} />
      <TopNavigation
        leading="arrow-left"
        onLeadingPress={() => router.back()}
        trailing={
          <View style={styles.topActions}>
            {weather ? <WeatherCredit style={styles.weatherInfoButton} /> : null}
            {/* ⋮ 메뉴(삭제 한 줄)를 없앴다 — 상세에서 할 일이 삭제뿐이라 쓰레기통 아이콘
                하나로 줄이고, 누르면 곧바로 삭제 확인 모달을 연다. */}
            <IconButton
              name="trash"
              size={20}
              accessibilityLabel="일기 삭제"
              onPress={() => setConfirmDelete(true)}
              style={styles.deleteButton}
            />
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DiaryNotebookHeader
          date={formatKoreanDateShort(diary.date)}
          weather={weather}
          weatherStatus={weatherStatus}
          emotions={diary.emotions}
        />

        <View style={styles.diaryBody}>
          <Text
            variant={iosVariant("body1ReadingHand", "body1ReadingHandLg")}
            color={labelColor.normal}
          >
            {diary.body}
          </Text>
        </View>

        {letter != null ? (
          <LetterPreviewCard
            summary={letter}
            letter={letterBody ?? null}
            onPress={() => router.push(`/letter/${letter.date}?source=diary_detail`)}
          />
        ) : null}

        {card != null ? (
          // 일기 상세는 **읽는 곳**이라 행동 카드를 읽기 전용으로 둔다 — 해봤어요·되돌리기·
          // 느낀 점 편집은 쉼터에서 한다(`docs/PRODUCT.md` 「상류와 차이」).
          <ActionCardSection
            card={card}
            diaryDate={diary.date}
            madeToday={diary.date === today}
            readOnly
          />
        ) : null}

        {/* 그날 일정 — 「이 일기의 행동 카드」와 **같은 제목 스타일**(label1/neutral, 왼쪽 살짝
            들여). 단 목록은 **카드 안에 넣지 않는다**(요청 2026-08-25) — 제목 아래 그대로 줄만 선다.
            일정이 없는 날은 블록 자체를 숨긴다(`app-flow.md` §2.3).
            완료 점을 앞에 둔다 — 채운 점 = 완료 · 빈 점 = 미완료. */}
        {daySchedules.length > 0 ? (
          <View style={styles.section}>
            <Text variant="label1" color={labelColor.neutral} style={styles.sectionLabel}>
              그날 일정
            </Text>
            {/* 목록만 제목보다 조금 오른쪽으로 들여 종속으로 보이게(요청 2026-08-25) */}
            <DayScheduleList schedules={daySchedules} showStatusDot inset={space.md} />
          </View>
        ) : null}
      </ScrollView>

      {/*
        삭제는 **무엇이 사라지는지 먼저 말한다**(`A4.md`). 일기를 지우면 그 일기의 행동 카드도
        함께 사라지므로, 카드가 있는 날은 그 사실을 문안으로 먼저 알린다(카드가 없으면 말하지 않는다).
        상세에서 바바 면을 뺐으므로 문안도 「바바의 문장」을 말하지 않는다.
      */}
      {confirmDelete ? (
        <Modal
          title="이 일기를 삭제할까요?"
          description={
            card != null
              ? "이 일기가 삭제돼요. 함께 만든 행동 카드도 같이 삭제돼요."
              : "이 일기가 삭제돼요."
          }
          cancelLabel="그대로 두기"
          confirmLabel="일기 삭제"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            remove(diary.id);
            // 서버가 편지 · 고른 작은 일을 함께 지운다 — 기기에 남은 작은 일 알림도 지운다
            forgetLetterOf(diary.date);
            // 확인을 지났으므로 그 자리에서 지운다 — 되돌리기 줄은 없앴다(2026-08-21)
            router.replace("/archive");
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: "row", alignItems: "center" },
  weatherInfoButton: { width: 44, height: 44 },
  deleteButton: { marginLeft: -8 },
  // 남은 높이를 다 쓰고 그 안에서만 스크롤한다 — 안 잡으면 내용 높이만큼 자라 넘친다
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: space.lg, paddingBottom: space.xl2 },

  diaryBody: {
    minHeight: 300,
    paddingHorizontal: space.sm,
    paddingTop: space.lg,
    paddingBottom: space.xl2,
  },
  // 「그날 일정」 섹션 — `ActionCardSection` 과 같은 값(제목 gap · 왼쪽 들여쓰기)
  section: { gap: space.md },
  sectionLabel: { paddingLeft: space.xs },
});
