import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { TabScreen } from "@/components/common/TabScreen";
import { BellIcon, MoonIcon, PencilIcon, SunIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { fill, home } from "@/design/tokens.mvp";
import { doneCountLabel, useDay, visibleSchedules } from "@/features/home/model/day";
import { ScheduleRow } from "@/features/home/ui/ScheduleRow";
import { formatKoreanDate } from "@/lib/day";
import { formatKoreanTime } from "@/lib/time";
import { SAMPLE_TODAY, SAMPLE_USER, SAMPLE_WEATHER } from "@/mocks/sample";

/**
 * `12` · 홈 · 일정을 가져온 상태 + `12-b` · 일정이 없는 경우
 *
 * **세 칸의 순서가 하루의 순서다** — 있는 것(오늘 일정) → 담는 것(오늘의 순간)
 * → 돌아보는 것. **어떤 상태에서도 칸이 늘거나 순서가 바뀌지 않는다**(`RULES.md`).
 *
 * **`12-b` 는 별도 레이아웃이 아니다**(`12-b.md`) — 구조·위치·버튼 크기가 모두
 * 같고 **목록 슬롯의 줄만 초대 문구로 바뀐다**. 빈 화면을 따로 그리면 처음 쓰는
 * 사람만 다른 앱을 보게 된다. 그래서 이 파일 하나가 두 상태를 다 그린다.
 *
 * - **채운 버튼은 화면에 하나뿐**(`.addr`)이고, 일정이 있든 없든 **같은 크기·
 *   모양·색**이다. 빈 상태에서만 크게 만들면 그 버튼이 화면의 주인이 된다
 * - **일러스트·안내 그림을 두지 않는다** — 비어 있는 것은 문제가 아니라 시작이다
 * - **진행률·연속 배지·점수를 두지 않는다.** "2/4 마침"은 사실이지 성취가 아니다
 * - 돌아보기 줄은 **일정이 없어도 그대로** 있다 — 일정 없이도 회고는 열린다
 */
export default function Home() {
  const schedules = useDay((s) => s.schedules);
  const toggleDone = useDay((s) => s.toggleDone);

  const shown = visibleSchedules(schedules);
  const empty = shown.length === 0;

  return (
    <TabScreen active="홈">
      {/* .top — 날짜 · 날씨 · 알림. 이모지가 아니라 선 아이콘이다 */}
      <View style={styles.top}>
        <AppText tone="caption" weight="600" style={styles.date}>
          {formatKoreanDate(SAMPLE_TODAY)}
        </AppText>
        <View style={styles.weather}>
          <SunIcon />
          <AppText tone="caption" weight="500" style={styles.weatherText}>
            {`${SAMPLE_WEATHER.celsius}°`}
          </AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="알림" hitSlop={12}>
          <BellIcon />
        </Pressable>
      </View>

      {/* .hero — 바바 64 + 인사 */}
      <View style={styles.hero}>
        <View style={styles.babaFace} />
        <AppText tone="strong" weight="700" style={styles.greeting}>
          낮에는 담아두고,{"\n"}밤에는 같이 돌아봐요.
        </AppText>
      </View>

      {/* .stack — 세 칸. 넘치면 이 안만 스크롤된다 */}
      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ① 오늘 일정 — 구 「오늘의 하루」. 「오늘의 순간」과 짝이 되는 이름이다 */}
        <View style={styles.dayCard}>
          {empty ? (
            <View style={styles.emptyBlock}>
              <SectionLabel center>오늘 일정</SectionLabel>
              <AppText tone="strong" weight="600" style={styles.invite}>
                오늘 하루를 차곡차곡 담아볼까요?
              </AppText>
            </View>
          ) : (
            <>
              <View style={styles.dayHead}>
                <SectionLabel>오늘 일정</SectionLabel>
                <AppText tone="caption" weight="500" style={styles.count}>
                  {doneCountLabel(schedules)}
                </AppText>
              </View>

              <View style={styles.list}>
                {shown.slice(0, home.maxVisibleSchedules).map((s) => (
                  <ScheduleRow
                    key={s.id}
                    schedule={s}
                    onToggleDone={toggleDone}
                    onOpen={(id) => router.push(`/home/schedule/${id}`)}
                  />
                ))}
                {shown.length > home.maxVisibleSchedules ? (
                  // 5개까지 펼치고 나머지는 접는다 (12.md)
                  <Pressable accessibilityRole="button">
                    <AppText tone="caption" weight="500" style={styles.more}>
                      {`${shown.length - home.maxVisibleSchedules}개 더 보기`}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </>
          )}

          {/* 화면에 하나뿐인 채운 버튼. 빈 상태에서도 크기가 같다 */}
          <Pressable
            accessibilityRole="button"
            style={styles.addButton}
            onPress={() => router.push("/home/schedule/new")}
          >
            <AppText tone="onDark" weight="700" style={styles.addLabel}>
              ＋ 일정 추가하기
            </AppText>
          </Pressable>

          <AppText variant="caption" tone="caption" style={empty ? styles.hintCenter : undefined}>
            {empty
              ? "일정을 추가하면 하루를 돌아볼 때 더 풍부한 대화를 나눌 수 있어요."
              : "캘린더에서 가져왔어요 · 체크하면 마침으로 표시돼요 · 일정을 누르면 감정을 남길 수 있어요"}
          </AppText>
        </View>

        {/* ② 오늘의 순간 — 카드 배경은 투명하고 테두리만 있다(위계를 카드 수로 늘리지 않는다) */}
        <View style={styles.momentCard}>
          <SectionLabel>오늘의 순간</SectionLabel>
          <Pressable
            accessibilityRole="button"
            style={styles.momentButton}
            onPress={() => router.push("/home/moment/new")}
          >
            <PencilIcon size={14} />
            <AppText tone="caption" weight="500" style={styles.momentLabel}>
              지금 떠오른 걸 한 줄로 적어요
            </AppText>
          </Pressable>
        </View>

        {/* ③ 돌아보기 — 일정이 없어도 그대로 있다 */}
        <Pressable
          accessibilityRole="button"
          style={styles.retroRow}
          // TODO C1 회고 인트로 (M4)
          onPress={() => {}}
        >
          <MoonIcon />
          <View style={styles.retroCopy}>
            <AppText tone="strong" weight="600" style={styles.retroTitle}>
              지금 하루 돌아보기
            </AppText>
            <AppText variant="caption" tone="caption">
              {/* 알림을 켜지 않은 사람에게 정하지 않은 시각을 말하지 않는다 (12.md) */}
              {SAMPLE_USER.notifyRetro
                ? `${formatKoreanTime(SAMPLE_USER.retroTime)}엔 제가 먼저 말 걸어요`
                : "편할 때 언제든 돌아볼 수 있어요"}
            </AppText>
          </View>
          <AppText tone="caption" style={styles.chevron}>
            ›
          </AppText>
        </Pressable>
      </ScrollView>
    </TabScreen>
  );
}

/** `.sec` — 카드 안 섹션 라벨. accent 색 · 자간 .04em */
function SectionLabel({ children, center }: { children: string; center?: boolean }) {
  return (
    <AppText tone="accent" weight="600" style={[styles.section, center ? styles.centerText : null]}>
      {children}
    </AppText>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: home.top.gap, paddingTop: 4 },
  // 날짜가 남은 폭을 밀어 날씨·종을 오른쪽으로 보낸다
  date: { flex: 1, fontSize: home.top.dateSize, lineHeight: home.top.dateSize },
  weather: { flexDirection: "row", alignItems: "center", gap: home.top.weatherGap },
  weatherText: { fontSize: home.top.dateSize, lineHeight: home.top.dateSize },

  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: home.hero.gap,
    paddingTop: theme.layout.gap.section,
    paddingBottom: theme.layout.gap.section,
  },
  // 바바 얼굴 64 — 실제 이미지는 온보딩과 같은 자산을 쓴다(다음 PR 에서 교체)
  babaFace: {
    width: home.hero.baba,
    height: home.hero.baba,
    borderRadius: home.hero.baba / 2,
    backgroundColor: semantic.surfaceTone,
  },
  greeting: {
    flex: 1,
    fontSize: home.hero.titleSize,
    lineHeight: home.hero.titleLineHeight,
    letterSpacing: home.hero.letterSpacing,
  },

  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  stackContent: {
    gap: home.stackGap,
    paddingHorizontal: theme.layout.screenMargin,
    paddingBottom: 4,
  },

  dayCard: {
    borderRadius: home.dayCard.radius,
    padding: home.dayCard.padding,
    gap: home.dayCard.gap,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: home.dayCard.border,
    ...theme.shadows.sm,
  },
  dayHead: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  section: {
    fontSize: home.sectionLabel.fontSize,
    lineHeight: home.sectionLabel.fontSize,
    letterSpacing: home.sectionLabel.letterSpacing,
  },
  centerText: { textAlign: "center" },
  count: { flex: 1, textAlign: "right", fontSize: 11.5, lineHeight: 11.5 },
  list: { gap: home.list.gap },
  more: { fontSize: 12.5, lineHeight: 18 },

  // 12-b — 줄이 하나뿐일 때만 가운데가 읽기 쉽다 (12-b.md)
  emptyBlock: { gap: home.dayCard.gap, alignItems: "stretch" },
  invite: { fontSize: 15, lineHeight: 22.5, textAlign: "center" },
  hintCenter: { textAlign: "center" },

  addButton: {
    minHeight: home.addButton.minHeight,
    borderRadius: home.addButton.radius,
    backgroundColor: fill.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: { fontSize: home.addButton.fontSize, lineHeight: home.addButton.fontSize },

  momentCard: {
    borderRadius: home.momentCard.radius,
    paddingVertical: home.momentCard.paddingVertical,
    paddingHorizontal: home.momentCard.paddingHorizontal,
    gap: home.momentCard.gap,
    // 배경 투명 — 테두리만 (RULES 「원본과 다른 것」)
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: home.momentCard.border,
  },
  momentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: home.momentButton.gap,
    minHeight: home.momentButton.minHeight,
    paddingHorizontal: home.momentButton.paddingHorizontal,
    borderRadius: home.momentButton.radius,
    backgroundColor: home.momentButton.background,
    borderWidth: 1,
    borderColor: home.momentButton.border,
  },
  momentLabel: { flex: 1, fontSize: home.momentButton.fontSize, lineHeight: 18.9 },

  retroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: home.retroRow.gap,
    borderRadius: home.retroRow.radius,
    paddingVertical: home.retroRow.paddingVertical,
    paddingHorizontal: home.retroRow.paddingHorizontal,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: `${semantic.textPrimary}1A`,
  },
  retroCopy: { flex: 1, gap: 3 },
  retroTitle: { fontSize: 13.5, lineHeight: 18.9 },
  chevron: { fontSize: 15, lineHeight: 18 },
});
