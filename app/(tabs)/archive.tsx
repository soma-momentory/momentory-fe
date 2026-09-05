import { track } from "@/features/analytics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { DayScheduleList } from "@/components/archive/DayScheduleList";
import { DiaryPreviewCard } from "@/components/archive/DiaryPreviewCard";
import { EmotionFilter } from "@/components/archive/EmotionFilter";
import {
  BottomSheet,
  Calendar,
  Card,
  Icon,
  InfoBlock,
  ListCell,
  SearchField,
  TabScreen,
  Text,
  ViewSwitcher,
  type CalendarMark,
  type ViewOption,
} from "@/components/ds";
import {
  emotion as emotionColor,
  label as labelColor,
  primary,
  space,
  withAlpha,
} from "@/design/ds";
import { byLatest, diariesInMonth, monthOf } from "@/features/archive/model/archive";
import { useMonthSchedules } from "@/features/archive/model/monthSchedules";
import { useDiary } from "@/features/diary/model/diary";
import type { EmotionId } from "@/features/emotion/model/emotion";
import { useTodayContext, visibleSchedules } from "@/features/home/model/day";
import { formatKoreanDateShort, formatKoreanMonth } from "@/lib/day";

/**
 * `A1` 보관함 · 달력 + `A2` 보관함 · 목록 + 감정 필터
 *
 * ## 새 디자인 (`PLAN.md` A Phase 4 · `docs/DESIGN.md` 「보관함」)
 *
 * 격자 위에 카드가 뜨는 3세대 DS 다. 2세대의 **스카이 그라디언트·곡선 언덕·감정
 * 얼굴 PNG 가 전부 사라졌고**, 달력/목록 전환이 **세그먼트 바 → 제목 우측 아이콘
 * 스위처**로 바뀌었다(`DESIGN.md` 「보관함」).
 *
 * **탭 이름은 「달력」·「목록」이다**(`A1.md`) — 외부 캘린더 앱과 구분하려고
 * "캘린더"라고 쓰지 않는다. 시안의 「캘린더/리스트」를 따르지 않는 것은 **문안의
 * 정본이 `docs/spec/` 이기 때문**이다(`PLAN.md` A §0). 아이콘 스위처라 그 말은
 * 이제 낭독기 이름에서 산다 — 「달력으로 보기」·「목록으로 보기」.
 *
 * `A1` 은 **선택한 날의 일기 + 일정**이다(`DESIGN.md` 「보관함」) — 그래서 일기가
 * 없는 날도 고를 수 있다(시안 주석은 「기록 없는 날은 비활성」이지만 `DESIGN.md`
 * 가 이긴다 · `Calendar` 주석).
 *
 * 지키는 규칙:
 * - **연속 일수를 세지 않는다** — 세는 것은 **장수**다
 * - 목록은 **최신순 고정**이고 정렬 옵션을 두지 않는다
 * - 필터는 **여러 감정을 함께**(교집합 · 고른 감정을 **모두** 가진 일기 ·
 *   2026-08-24 「한 번에 하나만」에서 바꿈). 미리보기는 **두 줄 말줄임**
 * - **색만으로 판단하게 하지 않는다** — 달력의 점이 아니라 기록 카드의 감정
 *   이름이 무엇이었는지를 말한다
 * - 빈 날·빈 결과는 **전용 레이아웃이 아니라 같은 자리의 한 장**이다(`A1.md`)
 */
const VIEWS: readonly ViewOption<"calendar" | "list">[] = [
  { name: "calendar", icon: "calendar", accessibilityLabel: "달력으로 보기" },
  { name: "list", icon: "list", accessibilityLabel: "목록으로 보기" },
];

/**
 * 라우트 파라미터로 건너온 날짜 — 모양이 어긋나면 **없는 것으로 친다**(`null`).
 *
 * expo-router 는 값을 `string | string[]` 로 준다(같은 이름이 두 번 오면 배열이다).
 * 화면이 그 두 모양을 다 알 이유가 없으므로 여기서 하나로 좁힌다 — 날짜가 아니면
 * 오늘로 열리지, 깨진 달을 그리지 않는다.
 */
function askedDate(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** `2026-07` 에서 `step` 달만큼 옮긴 달 */
function shiftMonth(month: string, step: number) {
  const moved = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + step, 1);
  return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, "0")}`;
}

export default function Archive() {
  const diaries = useDiary((s) => s.diaries);
  // 일정은 **한 달치**를 서버에서 받는다(`GET /schedules/period`) — 홈(`useDay`)이
  // 든 「오늘 하루」와 달리 보관함은 어느 날이든 고를 수 있어서다
  const monthSchedules = useMonthSchedules((s) => s.schedules);
  const loadMonth = useMonthSchedules((s) => s.loadMonth);

  // 04:00 을 넘기면 따라간다 — `clock.today()` 를 직접 읽으면 밤새 켜 둔 앱이
  // 어제를 「오늘」로 표시한다(`useTodayContext`)
  const { date: todayDate } = useTodayContext();
  // 기간 시트 목록은 **화면 절반**까지만 자라고 그 안에서 스크롤한다 — 달이 많아도
  // 시트가 화면을 가득 채우지 않게(고정 px 대신 기기 높이에 비례)
  const { height: windowHeight } = useWindowDimensions();

  /**
   * 리포트에서 「이 주의 기록 보기」로 건너오면 **그 주의 일요일**을 들고 온다
   * (`app/(tabs)/report.tsx`) — 그 날이 든 달을 열고 그 칸을 고른 채로 시작한다.
   * 보관함 탭을 곧바로 누르면 이 값이 없고, 그때는 여느 때처럼 오늘이다.
   *
   * **첫 상태를 만들 때만 본다.** 이후 달을 옮기거나 다른 날을 고르는 것은 화면의
   * 몫이라, 파라미터가 그대로 남아 있어도 그 선택을 되돌리지 않는다.
   */
  const openedAt = askedDate(useLocalSearchParams().date) ?? todayDate;

  const [view, setView] = useState<"calendar" | "list">("calendar");
  // 보관함이 여는 달은 건너온 날(없으면 오늘)이 속한 달이다 — `‹ ›` 로 옮기면 두 면이 함께 따라간다
  const [month, setMonth] = useState(monthOf(openedAt));
  const [selectedDate, setSelectedDate] = useState(openedAt);
  // 감정 필터는 **여러 개 함께** 고른다(합집합) — 빈 배열이면 필터 없음.
  // 고른 감정 중 **하나라도** 붙은 일기가 남는다(아래 `listed`)
  const [filters, setFilters] = useState<EmotionId[]>([]);
  const toggleFilter = (e: EmotionId) =>
    setFilters((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));
  const [query, setQuery] = useState("");
  // 목록은 달력과 따로 논다 — 특정 달, 또는 전체(`null`)를 본다
  const [listMonth, setListMonth] = useState<string | null>(monthOf(openedAt));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  // 탭에 들어오거나 달을 옮기면 그달 일정을 서버에서 다시 받는다. 탭은 매번 새로
  // 마운트되므로 **홈에서 바꾼 완료가 이때 반영된다**(연계 · `model/monthSchedules.ts`)
  useEffect(() => {
    void loadMonth(month);
  }, [month, loadMonth]);

  const monthly = diariesInMonth(diaries, month);
  const selectedDiary = monthly.find((d) => d.date === selectedDate) ?? null;
  const monthVisible = visibleSchedules(monthSchedules);
  const daySchedules = monthVisible.filter((s) => s.date === selectedDate);
  // 캘린더에 「일정 있는 날」을 밑줄로 표시하려고 그달 일정 날짜를 모은다
  const scheduledDates = new Set(monthVisible.map((s) => s.date));

  // 목록이 보는 일기 — **선택한 기간**이 먼저다: 전체면 전부, 아니면 그달만
  // (달력의 `monthly` 와 별개다). 감정·검색은 이 기간 안에서만 좁힌다.
  const listSource = listMonth == null ? diaries : diariesInMonth(diaries, listMonth);
  const keyword = query.trim();
  const listed = byLatest(
    listSource.filter(
      (d) =>
        // 고른 감정 중 **하나라도** 붙은 일기(합집합) — 아무것도 안 골랐으면 통과.
        // ⚠ `some` 은 빈 배열에서 `false` 라 「고른 게 없다」를 먼저 걸러야 한다 —
        // 안 그러면 필터를 다 풀었을 때 목록이 통째로 비어 버린다
        (filters.length === 0 || filters.some((f) => d.emotions.includes(f))) &&
        (keyword.length === 0 || d.body.includes(keyword)),
    ),
  );

  // 고를 수 있는 달 — 기록이 있는 달에 이번 달을 더해(비어 있어도 돌아올 자리가 있다) 최신순
  const monthOptions = [
    ...new Set([monthOf(todayDate), ...diaries.map((d) => monthOf(d.date))]),
  ].sort((a, b) => b.localeCompare(a));
  const listMonthLabel = listMonth == null ? "전체 보기" : formatKoreanMonth(listMonth);

  const open = (id: string) => {
    track("diary_open_clicked", { diary_id: id, source: view });
    router.push(`/diary/${id}`);
  };

  /**
   * 달력 칸의 표시 규칙 — **두 채널**이다(`dateFill` 채움 모드):
   * - **감정 색 박스(+진한 날짜)** = 일기. 대표 감정 하나로 칸을 채운다(태그 없으면
   *   중립색). 한 칸에 셋을 칠하면 38px 안에서 구분되지 않는다(`A1.md`).
   * - **날짜 밑 동그란 점** = 그날 일정이 있다. 색은 홈의 「지금 하루 돌아보기」
   *   버튼 색(`primary.heavy`)을 **연하게**(60%) 낮춘 것 — 감정 채움 위에서 튀지
   *   않게 한다. 채움과 다른 채널이라 둘 다 있는 날도 갈린다.
   */
  const markOf = (date: string): CalendarMark => {
    const diary = monthly.find((d) => d.date === date);
    const scheduled = scheduledDates.has(date);
    if (diary == null && !scheduled) return {};

    const mark: CalendarMark = {};
    if (diary != null) {
      // 달력 색은 그날의 **주 감정**으로 채운다 — emotions[0] 이 주 감정이다(서버·낙관적 일기 모두
      // 대표 감정을 맨 앞에 싣는다). 감정이 없으면(감정 없이 끝난 일기) 옅은 회색.
      const primary = diary.emotions[0] ?? null;
      mark.emphasized = true;
      mark.dotColor = primary == null ? labelColor.assistive : emotionColor[primary];
    }
    // 그날 일정 — 홈 CTA(「지금 하루 돌아보기」) 색을 연하게 낮춘 점으로 찍는다
    if (scheduled) mark.underlineColor = withAlpha(primary.heavy, 0.6);
    return mark;
  };

  // 달을 옮기면 고른 날도 그달의 첫날로 간다 — 31일이 없는 달로 넘어가지 않게
  const goMonth = (step: -1 | 1) => {
    track("archive_month_changed", { direction: step < 0 ? "previous" : "next" });
    const next = shiftMonth(month, step);
    setMonth(next);
    setSelectedDate(`${next}-01`);
  };

  return (
    <TabScreen
      active="보관함"
      overlay={
        monthPickerOpen ? (
          <BottomSheet onDismiss={() => setMonthPickerOpen(false)}>
            {/* 시트는 하나의 결정만 담는다 — 여기선 「어느 기간을 볼지」 하나다(§11).
                제목 줄은 두지 않는다(2026-08-24 · 사용자 요청) — 「전체 보기 · 2026년 7월 …」
                이 그 자체로 무엇을 고르는 자리인지 말한다. 여는 버튼의 낭독기 이름
                (「기간 선택, 지금 …」)이 그 몫을 대신 진다 */}
            <ScrollView
              style={{ maxHeight: Math.round(windowHeight * 0.35) }}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <MonthOption
                label="전체 보기"
                selected={listMonth == null}
                onPress={() => {
                  track("archive_period_changed", { period: "all" });
                  setListMonth(null);
                  setMonthPickerOpen(false);
                }}
              />
              {monthOptions.map((m) => (
                <MonthOption
                  key={m}
                  label={formatKoreanMonth(m)}
                  selected={listMonth === m}
                  onPress={() => {
                    track("archive_period_changed", { period: "month" });
                    setListMonth(m);
                    setMonthPickerOpen(false);
                  }}
                />
              ))}
            </ScrollView>
          </BottomSheet>
        ) : null
      }
    >
      {/* 탭 루트라 상단 내비 제목을 두지 않는다 — 본문의 Title 3(손글씨)가 제목이다(`DESIGN.md` §10) */}
      <View style={styles.header}>
        <Text variant="title3Hand" color={labelColor.strong}>
          보관함
        </Text>
        <ViewSwitcher
          options={VIEWS}
          active={view}
          onChange={(next) => {
            if (next !== view) track("archive_view_changed", { view: next });
            setView(next);
          }}
        />
      </View>

      {view === "calendar" ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card>
            <Calendar
              month={month}
              selectedDate={selectedDate}
              onSelect={(date) => {
                track("archive_date_selected", {
                  days_from_today: Math.round(
                    (Date.parse(date) - Date.parse(todayDate)) / 86400000,
                  ),
                  has_diary: diaries.some((d) => d.date === date),
                });
                setSelectedDate(date);
              }}
              onMonthStep={goMonth}
              markOf={markOf}
              dateFill
            />
          </Card>

          <View style={styles.section}>
            {/* 「○월 ○일의 기록」 머리글은 뺐다(2026-08-24) — 일기 카드가 이미 그
                날짜를 말하고, 아래 일정은 자기 머리글(「○월 ○일의 일정」)을 갖는다 */}
            {selectedDiary != null ? (
              <DiaryPreviewCard diary={selectedDiary} onOpen={open} showOpenLink />
            ) : (
              <Note>{"이 날은 기록이 없어요.\n비어 있어도 괜찮은 날이에요."}</Note>
            )}

            {/* 일기 아래 그날 일정 — 작은 갈색 머리글로 일기와 나누고, 오른쪽으로
                조금 들여 종속으로 보인다. 완료는 점으로(채운 초록 = 완료 · 빈 점 =
                미완료 · 홈의 완료와 이어진다) */}
            <DayScheduleList
              schedules={daySchedules}
              title={`${formatKoreanDateShort(selectedDate)}의 일정`}
              titleVariant="label1"
              titleColor={labelColor.neutral}
              inset={space.md}
              showStatusDot
            />
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.listTop}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="일기 내용 검색"
              accessibilityLabel="일기 내용 검색"
            />

            {/* 칩 줄은 **화면 끝까지 흐른다** — 좌우 20 을 되돌리고 그만큼을
                스크롤 내용의 여백으로 옮긴다. 감싸는 View 에 패딩을 주면 칩이
                20px 지점에서 잘린다 */}
            <View style={styles.bleed}>
              <EmotionFilter selected={filters} onToggle={toggleFilter} edgePadding={space.xl} />
            </View>

            <View style={styles.countRow}>
              <Text variant="body2" color={labelColor.neutral}>
                {`기록 ${listed.length}건`}
              </Text>
              {/* 달을 고르거나 전체를 보는 자리 — 누르면 기간 시트가 열린다 */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`기간 선택, 지금 ${listMonthLabel}`}
                onPress={() => setMonthPickerOpen(true)}
                hitSlop={space.sm}
                style={styles.scopeTrigger}
              >
                <Text variant="body2" color={labelColor.normal}>
                  {listMonthLabel}
                </Text>
                <Icon name="chevron-right" size={16} color={labelColor.assistive} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {listed.length === 0 ? (
              <Note>조건에 맞는 일기가 없어요.</Note>
            ) : (
              listed.map((d) => <DiaryPreviewCard key={d.id} diary={d} onOpen={open} />)
            )}
          </ScrollView>
        </>
      )}

      {/*
        ⚠ **되돌리기 줄이 없다**(2026-08-21). 삭제 앞에 확인 모달이 있으므로 같은
        것을 두 번 묻는 셈이었다 — `DESIGN.md` 「삭제는 확인 모달 1회」. 결과는
        토스트 한 줄로만 말한다(`lib/toast.ts`). 차이 기록: `docs/PRODUCT.md`.
      */}
    </TabScreen>
  );
}

/**
 * 빈 날·빈 결과의 한 장. **빈 상태 전용 레이아웃을 만들지 않는다**(`A1.md`) —
 * 기록 카드가 있던 자리에 같은 폭의 안내가 그대로 앉는다.
 *
 * 카드가 아니라 `InfoBlock` 이다 — **안내문은 카드가 아니다**(`DESIGN.md` §8).
 * 카드와 같은 테두리를 주면 「기록이 있는 것」과 같은 위계로 읽힌다.
 */
function Note({ children }: { children: string }) {
  return (
    <InfoBlock style={styles.note}>
      <Text variant="body2Reading" color={labelColor.neutral} style={styles.noteText}>
        {children}
      </Text>
    </InfoBlock>
  );
}

/**
 * 기간 시트의 한 줄. 고른 것에는 **체크**를 둔다 — 선택을 색만으로 표시하지
 * 않는다(`CLAUDE.md` 요약 3). 달력의 `‹ ›` 는 이웃 달로 한 칸씩 옮기는 것이고,
 * 여기선 지난 달로 **바로 건너뛰거나** 전체를 편다.
 */
function MonthOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <ListCell
      title={label}
      onPress={onPress}
      trailing={
        selected ? <Icon name="circle-check" size={20} color={labelColor.strong} /> : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },

  // 남은 높이를 다 쓰고 그 안에서만 스크롤한다 — 안 잡으면 내용 높이만큼 자라 넘친다
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: space.lg, paddingBottom: space.xl },
  section: { gap: space.md },

  listTop: { gap: space.md, paddingBottom: space.md },
  // 화면 좌우 20 을 되돌려 칩 줄이 끝까지 흐르게 한다
  bleed: { marginHorizontal: -space.xl },
  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scopeTrigger: { flexDirection: "row", alignItems: "center", gap: space.xs },

  note: { padding: space.xl },
  noteText: { textAlign: "center" },
});
