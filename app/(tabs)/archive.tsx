import { track } from "@/features/analytics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, useWindowDimensions } from "react-native";

import {
  BottomSheet,
  EmotionSticker,
  Icon,
  ListCell,
  TabScreen,
  type CalendarMark,
} from "@/components/ds";
import { label as labelColor, scheduleDot, withAlpha } from "@/design/ds";
import { byLatest, diariesInMonth, monthOf } from "@/features/archive/model/archive";
import { useMonthSchedules } from "@/features/archive/model/monthSchedules";
import { useDiary } from "@/features/diary/model/diary";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";
import { ArchiveView, type ArchiveMode } from "@/features/archive/ui/ArchiveView";
import { useTodayContext, visibleSchedules } from "@/features/home/model/day";
import { formatKoreanMonth } from "@/lib/day";

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
 * - **색만으로 판단하게 하지 않는다** — 달력의 스티커는 감정마다 눈·입 모양이
 *   달라 색이 안 보여도 갈리고, 이름은 기록 카드와 칸의 낭독기 이름이 말한다
 * - 빈 날·빈 결과는 **전용 레이아웃이 아니라 같은 자리의 한 장**이다(`A1.md`)
 */
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

  const [view, setView] = useState<ArchiveMode>("calendar");
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
   * 달력 칸의 표시 규칙 — **두 채널**이다(`dateSticker` 스티커 모드):
   * - **감정 스티커** = 일기. 그날 **주 감정**의 얼굴 하나를 날짜 아래 놓는다.
   *   한 칸에 셋을 놓으면 40px 남짓한 칸에서 구분되지 않는다(`A1.md`).
   * - **날짜와 얼굴 사이의 작은 연두 점** = 그날 일정이 있다(`scheduleDot`) —
   *   브랜드 초록보다 노랗고 밝아 감정색과 섞이지 않는다. 그림과 점이라 **채널이 갈려서** 둘 다
   *   있는 날도 섞이지 않는다. ⚠ 날짜 글자 색으로 말하지 않는다(2026-09-07 · 사용자
   *   요청) — 고른 날은 흰 글자라 그 채널이 사라지고, 감정 얼굴 위에서도 덜 읽혔다.
   *
   * ⚠ **일기가 있다고 날짜를 진하게 하지 않는다**(2026-09-07 · 사용자 결정) —
   * 얼굴이 있다는 것이 이미 「그날 썼다」다. 글자 굵기까지 함께 바꾸면 같은 말을
   * 두 번 하면서 「일정 있음」의 초록과 뒤섞인다.
   *
   * 그림도 색도 낭독기에는 없다. 그래서 **감정 이름과 「일정 있음」을 `label` 로
   * 함께 준다** — 칸이 「27일, 불안, 일정 있음」으로 읽힌다(`ds/Calendar.tsx` ·
   * `RULES.md` 「보관함」).
   */
  const markOf = (date: string): CalendarMark => {
    const diary = monthly.find((d) => d.date === date);
    const scheduled = scheduledDates.has(date);
    if (diary == null && !scheduled) return {};

    const mark: CalendarMark = {};
    const said: string[] = [];
    if (diary != null) {
      // 얼굴은 그날의 **주 감정**이다 — emotions[0] 이 주 감정이다(서버·낙관적 일기 모두
      // 대표 감정을 맨 앞에 싣는다). 감정이 없으면(감정 없이 끝난 일기) 얼굴을 지어내지
      // 않고 중립 원으로 「썼다」만 말한다(`EmotionSticker`)
      const main = diary.emotions[0] ?? null;
      mark.sticker = <EmotionSticker id={main} />;
      said.push(main == null ? "기록 있음" : emotionName(main));
    }
    // 그날 일정 — 날짜와 얼굴 사이에 **연두** 점을 찍는다. 브랜드 초록(sage)은 얼굴
    // 위에서 무겁고 감정색과 섞여 보였다(2026-09-07 · 사용자 요청) — `scheduleDot` 은
    // 그 자리를 위해 이름 붙인 색이다(`ds/color.ts`)
    if (scheduled) {
      // 80% — 카드 면에 살짝 잠기게 한다(2026-09-07 · 사용자 요청). 얼굴 위에 놓이는
      // 점이 아니라 **날짜 옆의 표시**라 카드 배경에만 섞인다
      mark.dotColor = withAlpha(scheduleDot, 0.8);
      said.push("일정 있음");
    }
    if (said.length > 0) mark.label = said.join(", ");
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
      <ArchiveView
        month={month}
        selectedDate={selectedDate}
        selectedDiary={selectedDiary}
        daySchedules={daySchedules}
        monthly={monthly}
        listed={listed}
        markOf={markOf}
        view={view}
        filters={filters}
        query={query}
        listMonthLabel={listMonthLabel}
        onViewChange={(next) => {
          if (next !== view) track("archive_view_changed", { view: next });
          setView(next);
        }}
        onSelectDate={(date) => {
          track("archive_date_selected", {
            days_from_today: Math.round((Date.parse(date) - Date.parse(todayDate)) / 86400000),
            has_diary: diaries.some((diary) => diary.date === date),
          });
          setSelectedDate(date);
        }}
        onMonthStep={goMonth}
        onToggleFilter={toggleFilter}
        onQueryChange={setQuery}
        onOpenPeriod={() => setMonthPickerOpen(true)}
        onOpenDiary={open}
      />
    </TabScreen>
  );
}

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
