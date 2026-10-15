import type { ReactNode } from "react";
import { useState } from "react";
import {
  PixelRatio,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { Button } from "@/components/ds/Button";
import { Card } from "@/components/ds/Card";
import { Icon } from "@/components/ds/icons/Icon";
import { IconButton } from "@/components/ds/IconButton";
import { Menu, type MenuAction } from "@/components/ds/Menu";
import { Modal } from "@/components/ds/Modal";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { Text } from "@/components/ds/Text";
import { Toast } from "@/components/ds/Toast";
import {
  iosVariant,
  label as labelColor,
  layout,
  maxFontScale,
  raised,
  size,
  space,
  status,
  text,
} from "@/design/ds";
import {
  MAX_VISIBLE_SCHEDULES,
  remainingLabel,
  visibleSchedules,
} from "@/features/home/model/presentation";
import type { Schedule } from "@/features/home/model/types";
import type { WeekDay } from "@/features/report/model/report";
import { formatKoreanDateShort, koreanWeekday } from "@/lib/day";
import { formatKoreanTime } from "@/lib/time";

import { GrassButton } from "./GrassButton";
import { HomeCapybara } from "./HomeCapybara";
import { ScheduleList } from "./ScheduleList";
import { WeekEmotionStrip } from "./WeekEmotionStrip";

/** 표시할 값만 받는다. 오늘·일기·설정의 공급처는 호출자가 결정한다. */
export type HomeViewModel = {
  today: string;
  schedules: Schedule[];
  week: readonly WeekDay[];
  /** 알림을 켰고 시각이 있을 때만 값이 있다. */
  retroReminderTime: string | null;
};

/** 모든 부작용은 호출자가 처리한다. 이 컴포넌트는 store·API·라우터·분석을 모른다. */
export type HomeViewActions = {
  onToggleDone: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onReorder: (id: string, toIndex: number) => void;
  onHideCalendarSchedule: (id: string) => void;
  onDeleteManualSchedule: (id: string) => void;
  onEditManualSchedule: (id: string) => void;
  onAddSchedule: () => void;
  onStartReflection: () => void;
  onOpenNotificationSettings: () => void;
};

export type HomeViewProps = {
  model: HomeViewModel;
  actions: HomeViewActions;
  /** 앱은 TabScreen, Lab은 가상 폰 프레임을 사용한다. 오버레이는 Screen 밖에 둔다. */
  renderFrame: (body: ReactNode, overlay: ReactNode) => ReactNode;
  /** pageY를 프레임의 오버레이 좌표로 바꾼다. Safe Area는 호출자가 책임진다. */
  menuTopFromPageY: (pageY: number) => number | Promise<number>;
  /** 메뉴가 탭바·홈 인디케이터를 덮지 않도록 비워 둘 하단 높이. */
  menuBottomInset?: number;
};

/**
 * 운영 홈 `12`/`12-b`의 화면 조립을 그대로 공유한다.
 * 날짜·알림 → 회고 카드 → 주간 감정 → 오늘 일정 순서, 빈 목록은 같은 슬롯의
 * 초대 문구, 완료는 점수 대신 사실 한 줄이라는 기존 디자인 결정을 유지한다.
 */
const DATE_VARIANT = "title1Hand" as const;
const HAND_TOP_BEARING = 0.1;
const HAND_LEFT_BEARING = 0.22;
const CHAR_BLEED = 8;
const CTA_DROP = 6;
const CTA_HEIGHT = 44;
const CTA_WIDTH = "90%";

export function HomeView({
  model,
  actions,
  renderFrame,
  menuTopFromPageY,
  menuBottomInset = 0,
}: HomeViewProps) {
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, maxFontScale);
  const dateLine = text[DATE_VARIANT].lineHeight * scale;
  const datePaddingTop = PixelRatio.roundToNearestPixel(
    Math.max((layout.minTouch - dateLine) / 2, 0) + HAND_TOP_BEARING * dateLine,
  );
  const weekdayIndent = PixelRatio.roundToNearestPixel(
    HAND_LEFT_BEARING * (text[DATE_VARIANT].fontSize - text.label1Hand.fontSize) * scale,
  );

  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState<{ id: string; top: number; anchorTop: number } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const shown = visibleSchedules(model.schedules);
  const empty = shown.length === 0;
  const folded = !expanded && shown.length > MAX_VISIBLE_SCHEDULES;
  const rows = folded ? shown.slice(0, MAX_VISIBLE_SCHEDULES) : shown;
  const allDone = !empty && shown.every((schedule) => schedule.done);
  const target = model.schedules.find((schedule) => schedule.id === menu?.id) ?? null;
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

  const body = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!dragging}
    >
      <View style={styles.head}>
        <View style={{ paddingTop: datePaddingTop }}>
          <Text variant={DATE_VARIANT} color={labelColor.strong}>
            {formatKoreanDateShort(model.today)}
          </Text>
          <Text
            variant="label1Hand"
            color={labelColor.alternative}
            style={{ paddingLeft: weekdayIndent }}
          >
            {`${koreanWeekday(model.today)}요일`}
          </Text>
        </View>
        <IconButton
          name="bell"
          accessibilityLabel="알림 설정"
          color={labelColor.normal}
          onPress={actions.onOpenNotificationSettings}
          style={styles.bell}
        />
      </View>

      <Card padding="loose" style={styles.cta}>
        <View style={styles.ctaBody}>
          <View style={styles.ctaText}>
            <Text variant="headline1" color={labelColor.normal}>
              오늘 하루는 어땠어요?
            </Text>
            <Text
              variant={iosVariant("label2", "body2Reading")}
              color={labelColor.alternative}
              {...(Platform.OS === "ios"
                ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.85 }
                : null)}
            >
              {model.retroReminderTime != null
                ? `${formatKoreanTime(model.retroReminderTime)}엔 제가 먼저 말 걸어요`
                : "편할 때 언제든 돌아볼 수 있어요"}
            </Text>
          </View>
          <GrassButton
            label="지금 하루 돌아보기"
            onPress={actions.onStartReflection}
            style={styles.ctaButton}
          />
        </View>
        <View style={styles.ctaChar}>
          <HomeCapybara />
        </View>
      </Card>

      <View style={styles.section}>
        <WeekEmotionStrip days={model.week} today={model.today} />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="오늘 일정"
          description={empty ? undefined : remainingLabel(model.schedules)}
          trailing={
            <Button label="＋ 추가" variant="text" size="small" onPress={actions.onAddSchedule} />
          }
        />

        {empty ? (
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
          />
        )}

        {folded ? (
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
  );

  const overlay = (
    <>
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
    </>
  );

  return renderFrame(body, overlay);
}

const styles = StyleSheet.create({
  // TabScreen의 좌우 패딩을 스크롤 경계에서만 되돌려 체크 효과가 잘리지 않게 한다.
  scroll: { marginHorizontal: -layout.screenPadding },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.scrollClearance,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.md,
    paddingBottom: space.md,
  },
  bell: { marginRight: -space.md },
  cta: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, ...raised.card },
  ctaBody: { flex: 1, gap: 22 },
  ctaButton: {
    marginTop: CTA_DROP,
    alignSelf: "flex-start",
    width: CTA_WIDTH,
    height: CTA_HEIGHT,
  },
  ctaText: { gap: space.sm },
  ctaChar: { marginRight: -CHAR_BLEED, marginBottom: -CHAR_BLEED },
  section: { paddingTop: space.xl },
  invite: { paddingVertical: space.xl, gap: space.sm },
  centered: { textAlign: "center" },
  more: { alignSelf: "flex-start", paddingHorizontal: 0 },
  done: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.md },
});
