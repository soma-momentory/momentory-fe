import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BottomNavigation,
  Button,
  Card,
  Icon,
  IconButton,
  Menu,
  Modal,
  Screen,
  SectionHeader,
  Text,
  Toast,
  type MenuAction,
  type TabItem,
} from "@/components/ds";
import { background, label as labelColor, layout, size, space, status } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import {
  MAX_VISIBLE_SCHEDULES,
  remainingLabel,
  useDay,
  useTodayContext,
  visibleSchedules,
  weekStartOf,
} from "@/features/home/model/day";
import { ScheduleList } from "@/features/home/ui/ScheduleList";
import { WeekEmotionStrip } from "@/features/home/ui/WeekEmotionStrip";
import { useSettings } from "@/features/my/model/settings";
import { weekDays, weekEnd } from "@/features/report/model/report";
import { formatKoreanDateShort, koreanWeekday } from "@/lib/day";
import { formatKoreanTime } from "@/lib/time";

/**
 * `12` · 홈 · 일정을 가져온 상태 + `12-b` · 일정이 없는 경우
 *
 * ## 새 디자인 (2026-08-20 · `PLAN.md` A Phase 4)
 *
 * 날씨 씬(하늘·언덕·카피바라·병아리)이 **전부 사라지고** 네 칸이 남았다
 * (`Home Sample.dc.html` · `design.md` 「홈」):
 * **날짜 + 알림 → 하루 돌아보기 CTA → 이번 주 감정 → 오늘 일정.**
 *
 * 2세대에서 뺐던 「하루 돌아보기」가 **되돌아왔다** — 이번엔 줄이 아니라 카드 안의
 * Solid Primary CTA 이고, **화면에서 유일한 solid 버튼**이다(`design.md` §6).
 * 회고를 여는 병아리가 없어졌으니 문이 다시 글자로 돌아온 셈이다.
 *
 * ## 지키는 규칙
 *
 * - **`12-b` 는 별도 레이아웃이 아니다** — 머리도 `＋ 추가`도 자리를 지키고
 *   **목록 슬롯의 줄만 초대 문구로 바뀐다**
 * - **일러스트·안내 그림을 두지 않는다** — 비어 있는 것은 문제가 아니라 시작이다
 * - **진행률·연속 배지·점수를 두지 않는다.** 「N개 남음」은 **남은 수**이지
 *   달성률이 아니다(`design.md` 「홈」이 「2/4 마침」을 이 말로 바꿨다)
 * - **완료에 감정을 묻지 않는다**(N7 · `PLAN.md` A-8). 체크박스 한 번으로 끝나고
 *   마친 줄은 **취소선 + `label.neutral`** 로 목록에 남는다
 * - 일정 순서는 **꾹 눌러 끈다**(`ScheduleList`), 수정·삭제는 **⋮ 메뉴**(시안 4-2)
 *
 * ## 메뉴·모달·토스트는 상태이고, 입력 바는 라우트다
 *
 * 고르면 사라지는 것(⋮ 메뉴 · 확인 모달 · 토스트)은 이력에 남을 것이 없어 화면이
 * 상태로 든다. 반대로 **입력 바(`12-c`·`12-e`)는 라우트**다 — 뒤로가기가 닫기여야
 * 하기 때문이다(`PLAN.md` A-4).
 */
export default function Home() {
  const schedules = useDay((s) => s.schedules);
  const toggleDone = useDay((s) => s.toggleDone);
  const moveSchedule = useDay((s) => s.moveSchedule);
  const reorderSchedule = useDay((s) => s.reorderSchedule);
  const hide = useDay((s) => s.hide);
  const remove = useDay((s) => s.remove);
  const load = useDay((s) => s.load);
  const diaries = useDiary((s) => s.diaries);
  const insets = useSafeAreaInsets();

  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState<{ id: string; top: number } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { date: today } = useTodayContext();
  // 알림 설정(M3)과 같은 store 를 본다 — 홈이 다른 시각을 말하면 안 된다
  const retroNotify = useSettings((s) => s.notify.retro);

  // 일정은 서버가 정본이다 — 홈이 뜰 때 받아온다. **못 받아도 화면은 그대로
  // 그린다**(빈 목록 = `12-b`) — 로딩 표시도 안내도 두지 않는다(`RULES.md` 4)
  useEffect(() => {
    void load();
  }, [load]);

  const shown = visibleSchedules(schedules);
  const empty = shown.length === 0;
  const folded = !expanded && shown.length > MAX_VISIBLE_SCHEDULES;
  const rows = folded ? shown.slice(0, MAX_VISIBLE_SCHEDULES) : shown;
  const allDone = !empty && shown.every((s) => s.done);

  // 이번 주(월~일)의 감정 — 일기가 남긴 값을 리포트와 **같은 계산**으로 본다.
  // 두 화면이 같은 주를 다르게 세면 어느 쪽이 맞는지 알 수 없게 된다
  const week = useMemo(() => {
    const start = weekStartOf(today);
    return weekDays(diaries, start, weekEnd(start));
  }, [diaries, today]);

  const target = schedules.find((s) => s.id === menu?.id) ?? null;
  const actions: MenuAction[] =
    target == null
      ? []
      : target.source === "manual"
        ? [
            {
              label: "수정하기",
              icon: "pencil",
              onPress: () => {
                setMenu(null);
                router.push(`/home/schedule/${target.id}`);
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
            // 가져온 일정은 지울 것이 여기 없다 — 캘린더 원본을 건드리지 않는다(`12-c`).
            // 되돌릴 수 있는 동작이라 위험색도 확인 모달도 쓰지 않는다
            {
              label: "홈에서 숨기기",
              icon: "close",
              onPress: () => {
                setMenu(null);
                hide(target.id);
                setToast("홈에서만 보이지 않게 돼요 · 캘린더 원본은 그대로 있어요");
              },
            },
          ];

  return (
    <Screen padded={false} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // 줄을 끄는 동안에는 스크롤을 멈춘다 — 손가락 하나가 두 일을 하지 않게
        scrollEnabled={!dragging}
      >
        <View style={styles.head}>
          <View>
            <Text variant="title3" color={labelColor.strong}>
              {formatKoreanDateShort(today)}
            </Text>
            <Text variant="caption1" color={labelColor.alternative}>
              {`${koreanWeekday(today)}요일`}
            </Text>
          </View>
          {/* 알림 **목록** 화면은 MVP 에 없다 — 종은 알림을 정하는 곳으로 보낸다.
              갈 곳 없는 줄을 만들지 않는다(`CLAUDE.md` 「마이의 편집 경로」).
              ⚠ 옛 `/my/notify` 는 마이 이관에서 사라지고 **시트가 됐다**(A-11) —
              그 시트를 여는 곳이 `M1` 이라 여기서는 마이로 보낸다 */}
          <IconButton
            name="bell"
            accessibilityLabel="알림 설정"
            color={labelColor.normal}
            onPress={() => router.push("/my")}
            style={styles.bell}
          />
        </View>

        <Card padding="loose" style={styles.cta}>
          <View style={styles.ctaText}>
            <Text variant="body1" color={labelColor.normal}>
              오늘 하루는 어땠어요?
            </Text>
            <Text variant="body2Reading" color={labelColor.alternative}>
              {/* 알림을 켜지 않은 사람에게 정하지 않은 시각을 말하지 않는다 (12.md) */}
              {retroNotify.enabled && retroNotify.time != null
                ? `${formatKoreanTime(retroNotify.time)}엔 제가 먼저 말 걸어요`
                : "편할 때 언제든 돌아볼 수 있어요"}
            </Text>
          </View>
          {/* 이 화면의 유일한 Solid Primary — 하루의 주 행동이다 (`design.md` §6) */}
          <Button label="지금 하루 돌아보기" fill onPress={() => router.push("/retro/confirm")} />
        </Card>

        <View style={styles.section}>
          <WeekEmotionStrip days={week} today={today} onSeeAll={() => router.replace("/report")} />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="오늘 일정"
            description={empty ? undefined : remainingLabel(schedules)}
            trailing={
              // 추가는 3순위가 아니라 **머리의 행동**이다 — 면을 채우지 않는 Text Button.
              // 글리프(＋)는 문안에 이미 있으므로 아이콘을 겹쳐 붙이지 않는다
              <Button
                label="＋ 추가"
                variant="text"
                size="small"
                onPress={() => router.push("/home/schedule/new")}
              />
            }
          />

          {empty ? (
            // 12-b — 목록 슬롯의 줄만 초대 문구로 바뀐다
            <View style={styles.invite}>
              <Text variant="body1" color={labelColor.normal} style={styles.centered}>
                오늘 하루를 차곡차곡 담아볼까요?
              </Text>
              <Text variant="caption1" color={labelColor.alternative} style={styles.centered}>
                일정을 추가하면 하루를 돌아볼 때 더 풍부한 대화를 나눌 수 있어요.
              </Text>
            </View>
          ) : (
            <ScheduleList
              schedules={rows}
              onToggleDone={toggleDone}
              // 누른 지점(창 기준) → 메뉴가 사는 레이어(상단 inset 아래) 기준으로
              // 옮긴다. 안 그러면 상태바 높이만큼 아래에 뜬다
              onMore={(id, atY) => setMenu({ id, top: atY - insets.top + space.md })}
              onMove={moveSchedule}
              onReorder={reorderSchedule}
              onDragStateChange={setDragging}
            />
          )}

          {folded ? (
            // 5개까지 펼치고 나머지는 접는다 (12.md) — 누르면 실제로 펼쳐진다
            <Button
              label={`${shown.length - MAX_VISIBLE_SCHEDULES}개 더 보기`}
              variant="text"
              size="small"
              onPress={() => setExpanded(true)}
              style={styles.more}
            />
          ) : null}

          {allDone ? (
            <View style={styles.done}>
              <Icon name="circle-check" size={size.icon.md} color={status.positive} />
              <Text variant="label1" color={status.positive}>
                오늘 일정을 모두 마쳤어요.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomNavigation
        items={TABS}
        active="홈"
        onPress={(tab) => {
          if (tab !== "홈") router.replace(ROUTES[tab]);
        }}
      />
      {/* 탭바 아래 홈 인디케이터 자리 — 탭바와 같은 면으로 이어 둔다.
          `Screen` 의 bottom edge 를 쓰면 탭바가 떠 있는 것처럼 보인다 */}
      <View style={[styles.underTab, { height: insets.bottom }]} />

      {menu != null && actions.length > 0 ? (
        <Menu actions={actions} top={menu.top} onDismiss={() => setMenu(null)} />
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
            remove(asking);
            setAsking(null);
            setToast("일정을 삭제했어요.");
          }}
        />
      ) : null}

      {toast != null ? (
        <Toast message={toast} variant="positive" onDismiss={() => setToast(null)} />
      ) : null}
    </Screen>
  );
}

type TabName = "홈" | "쉼터" | "보관함" | "리포트" | "마이";

/** `design.md` §10 — 다섯 칸. 없는 글리프를 추측하지 않는다(`person` 은 없다) */
const TABS: readonly TabItem<TabName>[] = [
  { name: "홈", icon: "home", label: "홈" },
  { name: "쉼터", icon: "heart", label: "쉼터" },
  { name: "보관함", icon: "folder-job", label: "보관함" },
  { name: "리포트", icon: "document", label: "리포트" },
  { name: "마이", icon: "nav-my-page", label: "마이" },
];

/** `replace` 인 이유 — 탭은 쌓이는 화면이 아니다 */
const ROUTES: Record<TabName, "/home" | "/rest" | "/archive" | "/report" | "/my"> = {
  홈: "/home",
  쉼터: "/rest",
  보관함: "/archive",
  리포트: "/report",
  마이: "/my",
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenPadding,
    // 스크롤 리스트 하단 클리어런스 — 탭바 56 + 20 (`design.md` §3)
    paddingBottom: layout.scrollClearance,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: space.md,
    paddingBottom: space.md,
  },
  // 44 히트는 지키되 날짜 줄의 높이를 밀지 않게 오른쪽으로 당긴다
  bell: { marginRight: -space.md },
  cta: { gap: 22 },
  ctaText: { gap: space.sm },
  // 섹션 ↔ 섹션 (`design.md` §3 — 20~28)
  section: { paddingTop: space.xl },
  invite: { paddingVertical: space.xl, gap: space.sm },
  centered: { textAlign: "center" },
  more: { alignSelf: "flex-start", paddingHorizontal: 0 },
  done: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.md },
  underTab: { backgroundColor: background.elevated },
});
