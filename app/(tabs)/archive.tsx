import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { CalendarMonth } from "@/components/archive/CalendarMonth";
import { DiaryPreviewCard } from "@/components/archive/DiaryPreviewCard";
import { EmotionFilter } from "@/components/archive/EmotionFilter";
import { Hill } from "@/components/common/Hill";
import { SegBar } from "@/components/common/SegBar";
import { TabScreen } from "@/components/common/TabScreen";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
import { byLatest, dayOf, diariesInMonth, monthOf } from "@/features/archive/model/archive";
import { useDiary } from "@/features/diary/model/diary";
import type { EmotionId } from "@/features/emotion/model/emotion";
import { clock } from "@/lib/clock";

/**
 * `A1` 보관함 · 달력 + `A2` 보관함 · 목록 + 감정 필터
 *
 * ## 새 디자인 (`PLAN.md` Phase 3-2 · `docs/design/prototype/보관함.dc.html`)
 *
 * 스카이 그라디언트 위에 **월 카드**를 얹고, **곡선 언덕**으로 잘라 그 아래
 * 초록 면에 「그날의 기록」을 둔다. 목록 면도 같은 구조다 — 검색·칩·월 라벨이
 * 하늘 위, 항목 카드가 언덕 아래.
 *
 * **탭 이름은 「달력」이다**(`A1.md`) — 외부 캘린더 앱과 구분하려고 "캘린더"라고
 * 쓰지 않는다. 시안의 세그먼트는 「캘린더 / 리스트」지만 **문안의 정본은
 * `docs/spec/` 이다**(`PLAN.md` §0 — "문안은 예외"). **달력으로 언제, 목록으로
 * 어떤 마음이었는지** 찾는다.
 *
 * 옛 구조에서 **뺀 것**(시안에 없다 — `PLAN.md` D9 의 홈과 같은 결정이 필요하다):
 * - **요약 3칸**(「12편 / 이번 달 기록」·「가장 많이 기록」·「지난달과 비교」) —
 *   달력 칸이 54 로 커지면서 자리가 없어졌다. 세던 값은
 *   `features/archive/model/archive.ts` 에 그대로 있다
 *
 * 지키는 규칙:
 * - **연속 일수를 세지 않는다** — 세는 것은 **장수**다
 * - 목록은 **최신순 고정**이고 정렬 옵션을 두지 않는다
 * - 필터는 **한 번에 하나만**. 미리보기는 **두 줄 말줄임**
 * - **색만으로 판단하게 하지 않는다** — 달력의 얼굴이 아니라 기록 카드의
 *   감정 칩이 이름을 글자로 말한다
 * - 빈 날·빈 결과는 **전용 레이아웃이 아니라 같은 자리의 한 장**이다(`A1.md`)
 */
const FACES: readonly [string, string] = ["달력", "목록"];

/**
 * 되돌리기 줄이 머무는 시간. **"잠시"**(`A4.md`)를 숫자로 옮긴 것이고, 이 뒤에는
 * 되돌릴 수 없다. 짧으면 놓치고 길면 지웠다는 사실이 안 믿긴다.
 */
const UNDO_MS = 6000;

/** `2026-07` → `2026년 7월` */
const monthLabel = (month: string) =>
  `${Number(month.slice(0, 4))}년 ${Number(month.slice(5, 7))}월`;

/** `2026-07` 에서 `step` 달만큼 옮긴 달 */
function shift(month: string, step: number) {
  const moved = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + step, 1);
  return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, "0")}`;
}

export default function Archive() {
  const diaries = useDiary((s) => s.diaries);
  const recentlyDeleted = useDiary((s) => s.recentlyDeleted);
  const undoRemove = useDiary((s) => s.undoRemove);
  const clearRecentlyDeleted = useDiary((s) => s.clearRecentlyDeleted);

  const todayDate = clock.today();

  const [face, setFace] = useState<0 | 1>(0);
  // 보관함이 여는 달은 오늘이 속한 달이다 — `‹ ›` 로 옮기면 두 면이 함께 따라간다
  const [month, setMonth] = useState(monthOf(todayDate));
  const [selectedDay, setSelectedDay] = useState<number>(dayOf(todayDate));
  const [filter, setFilter] = useState<EmotionId | null>(null);
  const [query, setQuery] = useState("");

  const monthly = diariesInMonth(diaries, month);
  const today = month === monthOf(todayDate) ? dayOf(todayDate) : null;

  const selectedDiary = monthly.find((d) => dayOf(d.date) === selectedDay) ?? null;

  const keyword = query.trim();
  const listed = byLatest(
    monthly.filter(
      (d) =>
        (filter == null || d.emotions.includes(filter)) &&
        (keyword.length === 0 || d.body.includes(keyword)),
    ),
  );

  const open = (id: string) => router.push(`/diary/${id}`);

  // 달을 옮기면 고른 날도 그달의 첫날로 간다 — 31일이 없는 달로 넘어가지 않게
  const goMonth = (step: number) => {
    setMonth((m) => shift(m, step));
    setSelectedDay(1);
  };

  // 잠시 뒤 스스로 사라진다 — 남겨두면 지운 것이 지워지지 않은 것처럼 보인다
  useEffect(() => {
    if (recentlyDeleted == null) return;
    const t = setTimeout(clearRecentlyDeleted, UNDO_MS);
    return () => clearTimeout(t);
  }, [recentlyDeleted, clearRecentlyDeleted]);

  return (
    <TabScreen active="보관함" background="paperSky">
      <View style={styles.header}>
        <AppText weight="700" style={styles.title}>
          보관함
        </AppText>
        {/* 시안의 세그먼트는 제목 옆의 작은 알약이다 — 폭을 잡아 오른쪽에 붙인다 */}
        <View style={styles.seg}>
          <SegBar items={FACES} activeIndex={face} onChange={setFace} variant="paper" />
        </View>
      </View>

      {face === 0 ? (
        <>
          <Card variant="paperSoft" style={styles.calendarCard}>
            <View style={styles.monthRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 달"
                hitSlop={12}
                onPress={() => goMonth(-1)}
              >
                <ChevronLeftIcon color={paperColors.text.green} />
              </Pressable>
              <AppText weight="700" style={styles.monthLabel}>
                {monthLabel(month)}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="다음 달"
                hitSlop={12}
                onPress={() => goMonth(1)}
              >
                <ChevronRightIcon color={paperColors.text.green} />
              </Pressable>
            </View>

            <CalendarMonth
              diaries={diaries}
              month={month}
              today={today}
              selected={selectedDay}
              onSelect={setSelectedDay}
            />
          </Card>

          {/* 곡선 언덕이 하늘과 기록을 가른다 */}
          <Hill color={paperColors.bg.hill} style={styles.hill} />
          <View style={styles.hillBody}>
            <ScrollView
              contentContainerStyle={styles.hillContent}
              showsVerticalScrollIndicator={false}
            >
              <AppText weight="700" style={styles.recordTitle}>
                {`${Number(month.slice(5, 7))}월 ${selectedDay}일의 기록`}
              </AppText>

              {/* 색만으로 판단하게 하지 않는다 — 고른 날의 감정을 이름으로 보여준다 */}
              {selectedDiary != null ? (
                <DiaryPreviewCard diary={selectedDiary} onOpen={open} showOpenLink />
              ) : (
                <Note>{"이 날은 기록이 없어요.\n비어 있어도 괜찮은 날이에요."}</Note>
              )}
            </ScrollView>
          </View>
        </>
      ) : (
        <>
          <View style={styles.listTop}>
            <View style={styles.search}>
              <SearchIcon color={paperColors.text.faint} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="일기 내용 검색"
                placeholderTextColor={paperColors.text.faint}
                accessibilityLabel="일기 내용 검색"
                returnKeyType="search"
              />
            </View>

            <EmotionFilter selected={filter} onSelect={setFilter} />

            <AppText style={styles.listMonth}>{monthLabel(month)}</AppText>
          </View>

          <Hill color={paperColors.bg.hill} style={styles.hill} />
          <View style={styles.hillBody}>
            <ScrollView
              contentContainerStyle={styles.hillContent}
              showsVerticalScrollIndicator={false}
            >
              {listed.length === 0 ? (
                <Note>조건에 맞는 일기가 없어요.</Note>
              ) : (
                listed.map((d) => <DiaryPreviewCard key={d.id} diary={d} onOpen={open} />)
              )}
            </ScrollView>
          </View>
        </>
      )}

      {/*
        지운 직후에만 잠시 뜬다(`A4.md`). 확인 모달을 두지 않는 대신 되돌릴 길을
        남기는 쪽이다 — 되돌릴 수 있게 만든다는 규칙(`RULES.md`)이 여기까지 온다.
        언덕 면 위에 떠 있어서 아래 목록의 자리를 밀지 않는다.
      */}
      {recentlyDeleted != null ? (
        <View style={styles.undo}>
          <AppText style={styles.undoLabel}>삭제했어요</AppText>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={undoRemove}>
            <AppText weight="700" style={styles.undoAction}>
              되돌리기
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </TabScreen>
  );
}

/**
 * 빈 날·빈 결과의 한 장. **빈 상태 전용 레이아웃을 만들지 않는다**(`A1.md`) —
 * 기록 카드가 있던 자리에 같은 모양의 카드가 그대로 앉는다.
 */
function Note({ children }: { children: string }) {
  return (
    <Card variant="paperSoft" style={styles.note}>
      <AppText style={styles.noteText}>{children}</AppText>
    </Card>
  );
}

const { styles: type } = paperTypography;
const FULL_BLEED = -theme.layout.screenMargin;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 6,
    paddingBottom: 10,
  },
  // 시안 23 — 토큰의 화면 제목(24)에서 한 단 내린다
  title: {
    fontSize: type.screenTitle.fontSize - 1,
    lineHeight: type.screenTitle.lineHeight,
    letterSpacing: -0.44,
    color: paperColors.text.primary,
  },
  seg: { width: 160 },

  calendarCard: { padding: 14, gap: 7, borderRadius: paperRadius.card },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  // 시안 17 — 토큰 대역에 17 이 없어 카드 제목(16)을 쓴다
  monthLabel: {
    fontSize: type.cardTitle.fontSize,
    lineHeight: type.cardTitle.lineHeight,
    color: paperColors.text.primary,
  },

  listTop: { gap: 11 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: theme.touch.minTarget,
    paddingHorizontal: 14,
    borderRadius: paperRadius.sheet,
    backgroundColor: paperColors.bg.cardSoft,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    fontFamily: paperTypography.fontFamily.regular,
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },
  listMonth: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },

  // 언덕과 그 아래 초록 면은 화면 끝까지 간다
  hill: { marginHorizontal: FULL_BLEED, marginTop: 12 },
  hillBody: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: FULL_BLEED,
    backgroundColor: paperColors.bg.hill,
  },
  hillContent: {
    gap: 9,
    paddingHorizontal: theme.layout.screenMargin,
    paddingBottom: 12,
  },
  // 시안 18 — 토큰 대역에 18 이 없어 시트 제목(19)을 쓴다. 언덕 위 잉크 글자다
  recordTitle: {
    fontSize: type.sheetTitle.fontSize,
    lineHeight: type.sheetTitle.lineHeight,
    color: paperColors.text.primary,
  },

  note: { padding: 22, borderRadius: paperRadius.card },
  noteText: {
    textAlign: "center",
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight + 2,
    // 시안 `#8F9A83` 은 카드 위 2.9 미달 — 초록 계열의 글자용 토큰으로 (PLAN §4)
    color: paperColors.text.green,
  },

  // 목록 위에 떠 있는 한 줄 — 탭바를 가리지 않게 그 위에 둔다
  undo: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: paperRadius.toast,
    backgroundColor: paperColors.overlay.toastBg,
  },
  undoLabel: {
    flex: 1,
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.onDark,
  },
  undoAction: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.onDark,
  },
});
