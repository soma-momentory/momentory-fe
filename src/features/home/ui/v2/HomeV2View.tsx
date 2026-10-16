import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { IconButton } from "@/components/ds/IconButton";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { Menu, type MenuAction } from "@/components/ds/Menu";
import { Modal } from "@/components/ds/Modal";
import { Toast } from "@/components/ds/Toast";
import { homeV2, layout, space } from "@/design/ds";
import { homeLayoutMode, type HomeLayoutMode } from "@/features/home/model/homeLayout";
import { MAX_VISIBLE_SCHEDULES, visibleSchedules } from "@/features/home/model/presentation";

import { PAPER_ROW_PITCH } from "../ScheduleList";

import { DatePaper, datePaperExtraFor } from "./DatePaper";
import { HeroCard } from "./HeroCard";
import { HomePaperGrid } from "./HomePaperGrid";
import { ScheduleSection, ScheduleSectionHeader } from "./ScheduleSection";
import type { HomeV2ViewProps } from "./types";
import { WeekDock } from "./WeekDock";

export type { HomeV2ViewActions, HomeV2ViewModel, HomeV2ViewProps, HomeWeatherView } from "./types";

/**
 * **홈 v2** 공유 뷰 — 표시 전용(계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §2 · P2).
 *
 * 운영 홈과 Expo Lab 의 「운영판 v2」가 함께 쓴다.
 *
 * 옛 `HomeView` 와 같은 원칙이다 — store · router · API · 계측을 **import 하지 않는다.** 값은
 * `model`, 부작용은 `actions` 로 받고, 프레임(앱 `TabScreen` · Lab 가상 폰)은 `renderFrame` 이 정한다.
 *
 * ## 배치 — `listOnly` · `wholeBody` (계획 §2.4)
 *
 * 보통은 날짜 · 히어로 · 일정 머리가 **고정**이고, **일정 목록만** 스크롤하며,
 * 이번 주 감정 도크는 탭바 위에 **늘 붙어 있다**(HD-7 · WK-1). 바깥 스크롤이 없으니 중첩 스크롤도 없다 —
 * 끄는 동안에는 스크롤을 잠근다. 목록 칸이 일정 2행보다 좁으면 날짜부터 일정까지 한 덩어리로
 * 스크롤한다(LY-1). 판정에는 `ScheduleList` 가 실제 배치에 쓰는 한 칸을 쓴다.
 *
 * 날씨는 `model.weather` 가 있을 때만, 종의 점은 서버 unread가 참일 때만 그린다.
 */
export function HomeV2View({
  model,
  actions,
  renderFrame,
  menuTopFromPageY,
  menuBottomInset = 0,
  onRowPitch,
  inboxPopover,
  weatherIntroSheet,
}: HomeV2ViewProps) {
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState<{ id: string; top: number; anchorTop: number } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fontScale = useEffectiveFontScale();
  const sizes = useRef({ root: 0, fixed: 0, pitch: PAPER_ROW_PITCH, empty: 0 });
  const bellRef = useRef<View>(null);
  const [mode, setMode] = useState<HomeLayoutMode>("listOnly");

  const shown = visibleSchedules(model.schedules);
  const empty = shown.length === 0;
  const folded = !expanded && shown.length > MAX_VISIBLE_SCHEDULES;
  const rows = folded ? shown.slice(0, MAX_VISIBLE_SCHEDULES) : shown;
  const allDone = !empty && shown.every((schedule) => schedule.done);
  const target = model.schedules.find((schedule) => schedule.id === menu?.id) ?? null;
  const refreshMode = useCallback(() => {
    const { root, fixed, pitch, empty: measuredEmpty } = sizes.current;
    if (root === 0 || fixed === 0) return;
    const rowPitch = empty
      ? PAPER_ROW_PITCH + Math.max(0, Math.round(homeV2.type.task.lineHeight * (fontScale - 1)))
      : pitch;
    // Schedule count, check state and fold state do not affect this decision.
    setMode((previous) =>
      homeLayoutMode({
        availableHeight: root - fixed - DOCK_SPACE,
        rowPitch,
        emptyHeight: empty ? measuredEmpty : 0,
        previous,
      }),
    );
  }, [empty, fontScale]);
  const handleRowPitch = useCallback(
    (pitch: number) => {
      sizes.current.pitch = pitch;
      refreshMode();
      onRowPitch?.(pitch);
    },
    [onRowPitch, refreshMode],
  );

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

  const unread = model.hasUnreadNotifications;

  const fixed = (
    <View
      testID="home-v2-fixed"
      style={styles.fixed}
      onLayout={(event) => {
        sizes.current.fixed = event.nativeEvent.layout.height;
        refreshMode();
      }}
    >
      <View style={[styles.header, { height: layout.minTouch + datePaperExtraFor(fontScale) }]}>
        <DatePaper today={model.today} fontScale={fontScale} />
        <View ref={bellRef}>
          <IconButton
            name="bell"
            accessibilityLabel={unread ? "알림, 읽지 않은 소식 있음" : "알림"}
            color={homeV2.color.ink}
            onPress={() => {
              bellRef.current?.measureInWindow((_x, y, _width, height) => {
                const top = menuTopFromPageY(y + height + space.xs);
                if (typeof top === "number") actions.onOpenNotifications(top);
                else void top.then(actions.onOpenNotifications);
              });
            }}
          />
          {/* 점은 장식이 아니라 상태다 — 그래서 이름도 함께 바뀐다(위). 숫자는 세지 않는다 */}
          {unread ? <View testID="home-v2-unread-dot" style={styles.dot} /> : null}
        </View>
      </View>

      <View style={styles.heroWrap}>
        <HeroCard
          retroReminderTime={model.retroReminderTime}
          weather={model.weather}
          onStartReflection={actions.onStartReflection}
          onOpenWeatherInfo={actions.onOpenWeatherInfo}
        />
      </View>

      <View style={styles.inset}>
        <ScheduleSectionHeader
          schedules={model.schedules}
          empty={empty}
          onAdd={actions.onAddSchedule}
        />
      </View>
    </View>
  );

  const list = (
    <View
      onLayout={
        empty
          ? (event) => {
              sizes.current.empty = event.nativeEvent.layout.height;
              refreshMode();
            }
          : undefined
      }
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
            void Promise.all([anchorTop, anchorBottom]).then(([top, bottom]) => open(top, bottom));
          }
        }}
        onMove={actions.onMove}
        onReorder={actions.onReorder}
        onDragStateChange={setDragging}
        onRowPitch={handleRowPitch}
      />
    </View>
  );

  const body = (
    <View
      testID="home-v2-root"
      style={styles.root}
      onLayout={(event) => {
        sizes.current.root = event.nativeEvent.layout.height;
        refreshMode();
      }}
    >
      <HomePaperGrid />

      {mode === "listOnly" ? (
        <>
          {fixed}
          <ScrollView
            testID="home-v2-list-scroll"
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!dragging}
          >
            {list}
          </ScrollView>
        </>
      ) : (
        <ScrollView
          testID="home-v2-body-scroll"
          style={styles.list}
          contentContainerStyle={styles.wholeContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!dragging}
        >
          {fixed}
          <View style={styles.wholeList}>{list}</View>
        </ScrollView>
      )}

      <View style={styles.dock}>
        <WeekDock days={model.week} today={model.today} />
      </View>
    </View>
  );

  const overlay = (
    <>
      {menu != null && menuActions.length > 0 ? (
        <Menu
          actions={menuActions}
          top={menu.top}
          anchorTop={menu.anchorTop}
          // ⋮ 메뉴가 도크를 덮지 않게 — 호출자의 탭바 여백 위에 도크 자리를 더한다
          bottomInset={menuBottomInset + DOCK_SPACE}
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
      {inboxPopover}
      {menu == null && asking == null && toast == null && inboxPopover == null
        ? weatherIntroSheet
        : null}
    </>
  );

  return renderFrame(body, overlay);
}

/** 도크가 탭바 위로 떠 있는 간격 */
const DOCK_GAP = space.md;
/** 도크가 차지하는 아래 자리 — 목록 끝 여백 · 메뉴 아래 여백에 더한다 */
const DOCK_SPACE = homeV2.size.dock.height + DOCK_GAP * 2;

const styles = StyleSheet.create({
  // 프레임(TabScreen)의 좌우 패딩을 되돌린다 — 모눈 종이가 화면 끝까지 깔리고, 안쪽 여백은 v2 값을 쓴다
  root: { flex: 1, minHeight: 0, marginHorizontal: -layout.screenPadding },
  fixed: { paddingTop: space.xs },
  header: {
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
  heroWrap: { marginHorizontal: space.lg },
  inset: { paddingHorizontal: space.xl },
  list: { flex: 1, minHeight: 0 },
  // 마지막 줄이 도크 뒤에 숨지 않게 — 도크 자리만큼 아래를 비운다
  listContent: { paddingHorizontal: space.xl, paddingBottom: DOCK_SPACE },
  wholeContent: { paddingBottom: DOCK_SPACE },
  wholeList: { paddingHorizontal: space.xl },
  dock: { position: "absolute", left: space.lg, right: space.lg, bottom: DOCK_GAP },
});
