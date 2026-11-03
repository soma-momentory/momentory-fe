import { useCallback, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";

import { BottomSheet } from "@/components/ds/BottomSheet";
import { IconButton } from "@/components/ds/IconButton";
import { Menu, type MenuAction } from "@/components/ds/Menu";
import { Modal } from "@/components/ds/Modal";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { Toast } from "@/components/ds/Toast";
import { homeV2, layout, space } from "@/design/ds";
import { type StudioDesign } from "@/design/studioDesign";
import {
  MAX_VISIBLE_SCHEDULES,
  remainingLabel,
  visibleSchedules,
} from "@/features/home/model/presentation";

import { DatePaper, datePaperExtraFor } from "./DatePaper";
import { HeroCard } from "./HeroCard";
import { ScheduleColumn, WeekColumn } from "./HomeStickers";
import { ScheduleSection, ScheduleSectionHeader } from "./ScheduleSection";
import type { HomeV2ViewProps } from "./types";
import { dockDayName, WeekDock } from "./WeekDock";

export type { HomeV2ViewActions, HomeV2ViewModel, HomeV2ViewProps, HomeWeatherView } from "./types";

/**
 * **홈 v2** 공유 뷰 — 표시 전용(계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §2 · P2).
 *
 * 운영 홈과 Expo Lab 의 「운영판 v2」가 함께 쓴다.
 *
 * 옛 `HomeView` 와 같은 원칙이다 — store · router · API · 계측을 **import 하지 않는다.** 값은
 * `model`, 부작용은 `actions` 로 받고, 프레임(앱 `TabScreen` · Lab 가상 폰)은 `renderFrame` 이 정한다.
 *
 * ## 배치 — 홈 배경 자체가 카드 한 장 (2026-11-03 · 시안 4)
 *
 * 면을 따로 그리지 않는다. 배경 위에 날짜 · 편지 → 히어로(남는 높이를 모두 채운다)가 놓이고,
 * 「오늘 일정」 · 「이번 주 감정」은 히어로 맨 위의 칸반 보드 두 칸이다.
 * 칸을 누르면 각 내용이 시트로 올라온다.
 * 일정 기능은 시트 안의 같은 `ScheduleSection` 이 그대로 맡는다
 * (HD-4 — 체크 · ⋮ 메뉴 · 삭제 확인 · 끌기 · 접근성 이동 · 5개 접기 · 「+ 추가」).
 * 화면이 카드의 최소 높이보다 작으면 바깥이 스크롤되고 두 칸은 그 아래에 남는다.
 */
export function HomeV2View({
  design,
  model,
  actions,
  renderFrame,
  menuTopFromPageY,
  menuBottomInset = 0,
  onRowPitch,
  weatherIntroSheet,
}: HomeV2ViewProps & { design?: StudioDesign }) {
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState<{ id: string; top: number; anchorTop: number } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"schedule" | "week" | null>(null);
  const fontScale = useEffectiveFontScale(1.5);

  const shown = visibleSchedules(model.schedules);
  const empty = shown.length === 0;
  const folded = !expanded && shown.length > MAX_VISIBLE_SCHEDULES;
  const rows = folded ? shown.slice(0, MAX_VISIBLE_SCHEDULES) : shown;
  const allDone = !empty && shown.every((schedule) => schedule.done);
  const target = model.schedules.find((schedule) => schedule.id === menu?.id) ?? null;
  const today = model.week.find((day) => day.date === model.today) ?? null;
  const closeSheet = useCallback(() => setSheet(null), []);

  // ⋮ 메뉴 — 직접 추가한 일정은 수정 · 삭제, 캘린더에서 온 일정은 「삭제하기」(= 숨김 · S5 · S8)
  const menuActions: MenuAction[] =
    target == null
      ? []
      : target.source === "manual"
        ? [
            {
              label: "수정하기",
              icon: "pencil",
              onPress: () => {
                setMenu(null);
                actions.onEditManualSchedule(target.id);
              },
            },
            {
              label: "삭제하기",
              icon: "trash",
              negative: true,
              onPress: () => {
                setMenu(null);
                setAsking(target.id);
              },
            },
          ]
        : [
            {
              label: "삭제하기",
              icon: "trash",
              negative: true,
              onPress: () => {
                setMenu(null);
                actions.onHideCalendarSchedule(target.id);
                setToast("일정을 삭제했어요 · 캘린더 원본은 그대로 있어요");
              },
            },
          ];

  const unread = model.hasUnreadLetter;
  const scheduleState = empty ? "0개" : remainingLabel(model.schedules);

  const body = (
    <View testID="home-v2-root" style={styles.root}>
      <ScrollView
        testID="home-v2-body-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View testID="home-v2-page" style={styles.page}>
          <View style={[styles.header, { height: layout.minTouch + datePaperExtraFor(fontScale) }]}>
            <DatePaper today={model.today} fontScale={fontScale} />
            <View>
              <IconButton
                name="mail"
                size={homeV2.size.mail.icon}
                accessibilityLabel={unread ? "바바의 편지, 새 편지 있음" : "바바의 편지"}
                color={homeV2.color.ink}
                onPress={actions.onOpenLetter}
              />
              {/* 점은 장식이 아니라 상태다 — 그래서 이름도 함께 바뀐다(위). 숫자는 세지 않는다 */}
              {unread ? <View testID="home-v2-unread-dot" style={styles.dot} /> : null}
            </View>
          </View>

          <View testID="home-v2-hero-wrap" style={styles.heroWrap}>
            <HeroCard
              design={design}
              weather={model.weather}
              onStartReflection={actions.onStartReflection}
              onOpenWeatherInfo={actions.onOpenWeatherInfo}
              board={(compact, headOnly) => (
                <>
                  <ScheduleColumn
                    schedules={shown}
                    state={scheduleState}
                    compact={compact}
                    headOnly={headOnly}
                    onPress={() => setSheet("schedule")}
                  />
                  <WeekColumn
                    days={model.week}
                    today={model.today}
                    state={today == null ? "기록 없음" : dockDayName(today)}
                    compact={compact}
                    headOnly={headOnly}
                    onPress={() => setSheet("week")}
                  />
                </>
              )}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const overlay = (
    <>
      {sheet === "schedule" ? (
        <BottomSheet onDismiss={closeSheet}>
          <ScheduleSectionHeader
            schedules={model.schedules}
            empty={empty}
            onAdd={actions.onAddSchedule}
            flushTop
          />
          <ScrollView
            testID="home-v2-list-scroll"
            style={styles.sheetList}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!dragging}
          >
            <ScheduleSection
              rows={rows}
              empty={empty}
              hiddenCount={folded ? shown.length - MAX_VISIBLE_SCHEDULES : 0}
              allDone={allDone}
              onExpand={() => setExpanded(true)}
              onToggleDone={actions.onToggleDone}
              onMore={(id, topPageY, bottomPageY) => {
                const anchorTop = menuTopFromPageY(topPageY);
                const anchorBottom = menuTopFromPageY(bottomPageY);
                const open = (resolvedTop: number, resolvedBottom: number) =>
                  setMenu({ id, top: resolvedBottom + space.sm, anchorTop: resolvedTop });
                if (typeof anchorTop === "number" && typeof anchorBottom === "number") {
                  open(anchorTop, anchorBottom);
                } else {
                  void Promise.all([anchorTop, anchorBottom]).then(([top, bottom]) =>
                    open(top, bottom),
                  );
                }
              }}
              onMove={actions.onMove}
              onReorder={actions.onReorder}
              onDragStateChange={setDragging}
              onRowPitch={onRowPitch}
            />
          </ScrollView>
        </BottomSheet>
      ) : null}
      {sheet === "week" ? (
        <BottomSheet title="이번 주 감정" closable onDismiss={closeSheet}>
          <WeekDock days={model.week} today={model.today} />
        </BottomSheet>
      ) : null}
      {menu != null && menuActions.length > 0 ? (
        <Menu
          actions={menuActions}
          top={menu.top}
          anchorTop={menu.anchorTop}
          bottomInset={menuBottomInset}
          onDismiss={() => setMenu(null)}
        />
      ) : null}
      {asking != null ? (
        <Modal
          title="이 일정을 삭제할까요?"
          description="삭제한 일정은 되돌릴 수 없어요."
          cancelLabel="취소"
          confirmLabel="삭제"
          destructive
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            actions.onDeleteManualSchedule(asking);
            setAsking(null);
            setToast("일정을 삭제했어요.");
          }}
        />
      ) : null}
      {toast != null ? (
        <Toast message={toast} variant="positive" onDismiss={() => setToast(null)} />
      ) : null}
      {menu == null && asking == null && toast == null && sheet == null ? weatherIntroSheet : null}
    </>
  );

  return renderFrame(body, overlay);
}

/** 시트 안 일정 목록의 최대 높이 — 화면의 절반쯤. 넘으면 그 안에서 스크롤한다 */
const SHEET_LIST_MAX = Math.round(Dimensions.get("window").height * 0.5);

const styles = StyleSheet.create({
  // 프레임(TabScreen)의 좌우 패딩을 되돌린다 — 모눈 종이가 화면 끝까지 깔리고, 안쪽 여백은 v2 값을 쓴다
  root: { flex: 1, minHeight: 0, marginHorizontal: -layout.screenPadding },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { flexGrow: 1, paddingTop: space.xs, paddingBottom: space.md },
  // 면을 그리지 않는다 — 홈 배경이 곧 카드이고 안쪽 것들은 그 위에 놓인다
  page: { flex: 1 },
  header: {
    zIndex: 1,
    height: layout.minTouch,
    paddingLeft: 22,
    paddingRight: space.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: homeV2.size.bell.dot,
    height: homeV2.size.bell.dot,
    borderRadius: homeV2.size.bell.dot / 2,
    backgroundColor: homeV2.color.alert,
  },
  heroWrap: { flex: 1 },
  sheetList: { maxHeight: SHEET_LIST_MAX, marginTop: space.xs },
});
