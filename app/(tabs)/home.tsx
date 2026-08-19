import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { TabScreen } from "@/components/common/TabScreen";
import { CloudIcon, MoonIcon, RainIcon, SunIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import {
  paperColors,
  paperHomeCard,
  paperRadius,
  paperTypography,
  paperWeatherOf,
} from "@/design/paper";
import theme from "@/design/theme";
import {
  doneCountLabel,
  MAX_VISIBLE_SCHEDULES,
  useDay,
  useTodayContext,
  visibleSchedules,
} from "@/features/home/model/day";
import { ScheduleList } from "@/features/home/ui/ScheduleList";
import { WeatherScene } from "@/features/home/ui/WeatherScene";
import { useSettings } from "@/features/my/model/settings";
import { formatKoreanDate } from "@/lib/day";
import { formatKoreanTime } from "@/lib/time";

/**
 * `12` · 홈 · 일정을 가져온 상태 + `12-b` · 일정이 없는 경우
 *
 * ## 새 디자인 (2026-08-14 · `PLAN.md` Phase 3-1)
 *
 * **날씨와 일정, 둘뿐이다**(`docs/design/prototype/홈.dc.html`):
 * 날짜·날씨 줄 → 날씨 씬(하늘·언덕·카피바라·병아리) → 잔디 위 「오늘 일정」 카드.
 *
 * 옛 구조에서 **뺀 것 둘** — 사용자 결정(2026-08-14), 기록은 `PLAN.md` D9:
 * - **「오늘의 순간」(메모)** — 시안에 없다. `12-d` 시트로 가는 문이 사라졌다
 * - **「지금 하루 돌아보기」 줄** — 회고는 이제 **씬의 병아리**가 연다
 *   (`docs/design/app-flow.md` §1 「홈 ─ 병아리 탭 ─▶ 하루 회고」).
 *   갈 곳과 정한 시각은 병아리의 말풍선이 말한다
 *
 * 그래서 `RULES.md` 「세 칸의 순서가 하루의 순서다」는 이 화면에서 더 이상 성립하지
 * 않는다 — 칸이 하나다. 남은 규칙은 그대로 지킨다:
 *
 * - **`12-b` 는 별도 레이아웃이 아니다** — 카드도 추가 버튼도 자리를 지키고
 *   **목록 슬롯의 줄만 초대 문구로 바뀐다**
 * - **일러스트·안내 그림을 두지 않는다** — 비어 있는 것은 문제가 아니라 시작이다.
 *   씬의 캐릭터는 빈 상태를 달래는 그림이 아니라 늘 있는 배경이다
 * - **진행률·연속 배지·점수를 두지 않는다.** "2/4 마침"은 사실이지 성취가 아니다
 * - **한 줄에 터치가 둘이다** — 체크 원은 마침, 제목은 상세 시트. 힌트 줄이 그걸 말한다
 *
 * 일정 순서는 **손잡이를 꾹 눌러 끈다**(`ScheduleList` · D10). 날씨는 아직
 * 샘플이다 — 실제 소스는 Phase 5(`PLAN.md` D5).
 */
export default function Home() {
  const schedules = useDay((s) => s.schedules);
  const toggleDone = useDay((s) => s.toggleDone);
  const moveSchedule = useDay((s) => s.moveSchedule);
  const reorderSchedule = useDay((s) => s.reorderSchedule);
  const load = useDay((s) => s.load);
  const [dragging, setDragging] = useState(false);
  const { date: today, weather } = useTodayContext();
  // 알림 설정(M3)과 같은 store 를 본다 — 홈이 다른 시각을 말하면 안 된다
  const retroNotify = useSettings((s) => s.notify.retro);

  // 일정은 서버가 정본이다 — 홈이 뜰 때 받아온다. **못 받아도 화면은 그대로
  // 그린다**(빈 목록 = `12-b`) — 로딩 표시도 안내도 두지 않는다(`RULES.md` 4)
  useEffect(() => {
    void load();
  }, [load]);

  const shown = visibleSchedules(schedules);
  const empty = shown.length === 0;

  /**
   * 원 탭 — **켤 때만 감정 시트가 뜬다**(`design-system.md` §4.2).
   * 다시 눌러 끄는 것은 되돌리는 동작이라 아무것도 묻지 않는다.
   */
  const completeAndAsk = (id: string) => {
    const turningOn = schedules.find((s) => s.id === id)?.done === false;
    toggleDone(id);
    if (turningOn) router.push({ pathname: "/home/emotion/[id]", params: { id } });
  };
  const sky = paperWeatherOf(weather.label);
  const WeatherIcon = ICONS[weather.label] ?? SunIcon;

  return (
    <TabScreen active="홈" background="paperHome" surfaceColor={sky.top}>
      {/* 날짜 · 날씨 — 하늘색 위에 앉는다. 글자색은 그 하늘에 맞춰 바뀐다 */}
      <View style={[styles.header, { backgroundColor: sky.top }]}>
        <AppText weight="700" style={[styles.date, { color: sky.ink }]}>
          {formatKoreanDate(today)}
        </AppText>
        <View style={styles.weather}>
          <WeatherIcon color={sky.sub} />
          <AppText style={[styles.weatherText, { color: sky.sub }]}>
            {`${weather.label} · ${weather.celsius}°`}
          </AppText>
        </View>
      </View>

      <View style={styles.fullBleed}>
        <WeatherScene
          weatherLabel={weather.label}
          bubbleTitle="지금 하루 돌아보기"
          bubbleCaption={
            // 알림을 켜지 않은 사람에게 정하지 않은 시각을 말하지 않는다 (12.md)
            retroNotify.enabled && retroNotify.time != null
              ? `${formatKoreanTime(retroNotify.time)}엔 제가 먼저 말 걸어요`
              : "편할 때 언제든 돌아볼 수 있어요"
          }
          onRetroPress={() => router.push("/retro/intro")}
        />
      </View>

      {/* 잔디 — 씬의 앞 언덕과 같은 색으로 이어진다 */}
      <ScrollView
        style={styles.grass}
        contentContainerStyle={styles.grassContent}
        showsVerticalScrollIndicator={false}
        // 줄을 끄는 동안에는 스크롤을 멈춘다 — 손가락 하나가 두 일을 하지 않게
        scrollEnabled={!dragging}
      >
        <View style={styles.dayCard}>
          <View style={styles.dayHead}>
            <AppText weight="700" style={styles.dayTitle}>
              오늘 일정
            </AppText>
            {empty ? null : <AppText style={styles.count}>{doneCountLabel(schedules)}</AppText>}
            {/* 추가는 카드 머리의 알약이다 — 있든 없든 같은 자리·크기·모양 */}
            <Pressable
              accessibilityRole="button"
              style={styles.addButton}
              onPress={() => router.push("/home/schedule/new")}
            >
              <AppText style={styles.addLabel}>＋ 추가</AppText>
            </Pressable>
          </View>

          <View style={styles.list}>
            {empty ? (
              // 12-b — 목록 슬롯의 줄만 초대 문구로 바뀐다
              <AppText weight="700" style={styles.invite}>
                오늘 하루를 차곡차곡 담아볼까요?
              </AppText>
            ) : (
              <ScheduleList
                schedules={shown.slice(0, MAX_VISIBLE_SCHEDULES)}
                onToggleDone={completeAndAsk}
                onOpen={(id) => router.push(`/home/schedule/${id}`)}
                onMove={moveSchedule}
                onReorder={reorderSchedule}
                onDragStateChange={setDragging}
              />
            )}
            {shown.length > MAX_VISIBLE_SCHEDULES ? (
              // 5개까지 펼치고 나머지는 접는다 (12.md)
              <Pressable accessibilityRole="button">
                <AppText style={styles.more}>
                  {`${shown.length - MAX_VISIBLE_SCHEDULES}개 더 보기`}
                </AppText>
              </Pressable>
            ) : null}
          </View>

          <AppText style={[styles.hint, empty ? styles.hintCenter : null]}>
            {empty
              ? "일정을 추가하면 하루를 돌아볼 때 더 풍부한 대화를 나눌 수 있어요."
              : "체크하면 마침과 감정을 남겨요 · 제목을 누르면 고치거나 지울 수 있어요 · 손잡이를 꾹 눌러 순서를 바꿔요"}
          </AppText>
        </View>
      </ScrollView>
    </TabScreen>
  );
}

const ICONS: Record<string, typeof SunIcon> = {
  맑음: SunIcon,
  흐림: CloudIcon,
  비: RainIcon,
  밤: MoonIcon,
};

const { styles: type } = paperTypography;
const FULL_BLEED = -theme.layout.screenMargin;
// 홈 카드는 그림자 대신 잉크 테두리 + 오프셋이다 (design-system.md §3)
const inkBorder = {
  borderWidth: paperHomeCard.borderWidth,
  borderColor: paperHomeCard.borderColor,
};

const styles = StyleSheet.create({
  fullBleed: { marginHorizontal: FULL_BLEED },

  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginHorizontal: FULL_BLEED,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
  },
  date: {
    fontSize: type.homeDate.fontSize,
    lineHeight: type.homeDate.lineHeight,
    letterSpacing: type.homeDate.letterSpacing,
  },
  weather: { flexDirection: "row", alignItems: "center", gap: 5, paddingBottom: 3 },
  weatherText: { fontSize: type.bodySm.fontSize, lineHeight: type.bodySm.lineHeight },

  grass: { flex: 1, marginHorizontal: FULL_BLEED, backgroundColor: paperColors.bg.hillHome },
  // 카드는 **잔디의 아래쪽**에 붙는다 — 탭바와 20 을 띄운다. 남는 잔디는 위로 간다
  grassContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 20,
  },

  dayCard: {
    borderRadius: paperRadius.cardHome,
    backgroundColor: paperColors.bg.card,
    overflow: "hidden",
    ...inkBorder,
    ...paperHomeCard.shadow,
  },
  dayHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  dayTitle: {
    fontSize: type.screenTitle.fontSize - 2,
    lineHeight: type.screenTitle.lineHeight - 2,
    color: paperColors.text.primaryHome,
  },
  count: {
    flex: 1,
    textAlign: "right",
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    color: paperColors.text.mutedWarmText,
  },
  // 시안의 추가는 **채운 버튼이 아니라 테두리 알약**이다 (PLAN.md D9)
  addButton: {
    minHeight: theme.touch.minTarget - 12,
    justifyContent: "center",
    borderRadius: paperRadius.pill,
    paddingHorizontal: 13,
    backgroundColor: paperColors.bg.card,
    ...inkBorder,
  },
  addLabel: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primaryHome,
  },

  // 시안의 목록 칸은 **높이 206 고정**이다 — 일정 수에 따라 카드가 커졌다 작아지면
  // 잔디 위에서 카드의 자리가 흔들린다. 넘치면 이 안만 스크롤된다
  list: { paddingHorizontal: 20, gap: 4, minHeight: 206 },
  divider: { height: 1, backgroundColor: paperColors.line.soft },
  invite: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    textAlign: "center",
    paddingVertical: 18,
    color: paperColors.text.primaryHome,
  },
  more: {
    paddingVertical: 8,
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.mutedWarmText,
  },

  hint: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },
  hintCenter: { textAlign: "center" },
});
