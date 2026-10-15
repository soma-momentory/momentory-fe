import { useRef, useState } from "react";
import {
  PixelRatio,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { BottomNavigation } from "../../../src/components/ds/BottomNavigation";
import { Button } from "../../../src/components/ds/Button";
import { Card } from "../../../src/components/ds/Card";
import { Icon } from "../../../src/components/ds/icons/Icon";
import { IconButton } from "../../../src/components/ds/IconButton";
import { Menu, type MenuAction } from "../../../src/components/ds/Menu";
import { Modal } from "../../../src/components/ds/Modal";
import { Screen } from "../../../src/components/ds/Screen";
import { SectionHeader } from "../../../src/components/ds/SectionHeader";
import { Text } from "../../../src/components/ds/Text";
import { Toast } from "../../../src/components/ds/Toast";
import {
  background,
  iosVariant,
  label as labelColor,
  layout,
  maxFontScale,
  raised,
  size,
  space,
  status,
  text,
} from "../../../src/design/ds";
import type { Schedule } from "../../../src/features/home/model/types";
import { GrassButton } from "../../../src/features/home/ui/GrassButton";
import { HomeCapybara } from "../../../src/features/home/ui/HomeCapybara";
import { ScheduleList } from "../../../src/features/home/ui/ScheduleList";
import { WeekEmotionStrip } from "../../../src/features/home/ui/WeekEmotionStrip";
import type { WeekDay } from "../../../src/features/report/model/report";
import { formatKoreanDateShort, koreanWeekday } from "../../../src/lib/day";
import { formatKoreanTime } from "../../../src/lib/time";

/** Presentation-only copy of the production home composition. No store, router or API imports. */
export type CurrentHomeModel = {
  today: string;
  schedules: Schedule[];
  week: readonly WeekDay[];
  retroNotifyTime: string | null;
};

export type CurrentHomeActions = {
  onToggleDone: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onReorder: (id: string, toIndex: number) => void;
  onHide: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onAdd: () => void;
  onReflection: () => void;
  onNotifications: () => void;
  onTab: (tab: string) => void;
};

const TABS = [
  { name: "홈", label: "홈", icon: "home" },
  { name: "쉼터", label: "쉼터", icon: "heart" },
  { name: "보관함", label: "보관함", icon: "folder-job" },
  { name: "리포트", label: "리포트", icon: "document" },
  { name: "마이", label: "마이", icon: "nav-my-page" },
] as const;

export function CurrentHomeView({
  model,
  actions,
}: {
  model: CurrentHomeModel;
  actions: CurrentHomeActions;
}) {
  const rootRef = useRef<View>(null);
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, maxFontScale);
  const dateLine = text.title1Hand.lineHeight * scale;
  const datePaddingTop = PixelRatio.roundToNearestPixel(
    Math.max((layout.minTouch - dateLine) / 2, 0) + 0.1 * dateLine,
  );
  const weekdayIndent = PixelRatio.roundToNearestPixel(
    0.22 * (text.title1Hand.fontSize - text.label1Hand.fontSize) * scale,
  );
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState<{ id: string; top: number } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const shown = model.schedules.filter((schedule) => !schedule.hidden);
  const empty = shown.length === 0;
  const folded = !expanded && shown.length > 5;
  const rows = folded ? shown.slice(0, 5) : shown;
  const allDone = !empty && shown.every((schedule) => schedule.done);
  const left = shown.filter((schedule) => !schedule.done).length;
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
                actions.onEdit(target.id);
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
                actions.onHide(target.id);
                setToast("일정을 삭제했어요 · 캘린더 원본은 그대로 있어요");
              },
            },
          ];

  return (
    <View ref={rootRef} style={styles.root}>
      <Screen padded={false} edges={[]}>
        <View style={styles.body}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!dragging}
          >
            <View style={styles.head}>
              <View style={{ paddingTop: datePaddingTop }}>
                <Text variant="title1Hand" color={labelColor.strong}>
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
                onPress={actions.onNotifications}
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
                    {model.retroNotifyTime != null
                      ? `${formatKoreanTime(model.retroNotifyTime)}엔 제가 먼저 말 걸어요`
                      : "편할 때 언제든 돌아볼 수 있어요"}
                  </Text>
                </View>
                <GrassButton
                  label="지금 하루 돌아보기"
                  onPress={actions.onReflection}
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
                description={empty ? undefined : left > 0 ? `${left}개 남음` : "모두 완료"}
                trailing={
                  <Button label="＋ 추가" variant="text" size="small" onPress={actions.onAdd} />
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
                  onMore={(id, atY) =>
                    rootRef.current?.measureInWindow((_, y) => {
                      setMenu({ id, top: atY - y + space.md });
                    })
                  }
                  onMove={actions.onMove}
                  onReorder={actions.onReorder}
                  onDragStateChange={setDragging}
                />
              )}
              {folded ? (
                <Button
                  label={`${shown.length - 5}개 더 보기`}
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
        </View>
        <BottomNavigation items={TABS} active="홈" onPress={actions.onTab} />
        <View style={styles.underTab} />
      </Screen>
      {menu != null && menuActions.length > 0 ? (
        <Menu actions={menuActions} top={menu.top} onDismiss={() => setMenu(null)} />
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
            actions.onRemove(asking);
            setAsking(null);
            setToast("일정을 삭제했어요.");
          }}
        />
      ) : null}
      {toast != null ? (
        <Toast message={toast} variant="positive" onDismiss={() => setToast(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0, paddingHorizontal: layout.screenPadding },
  scroll: { marginHorizontal: -layout.screenPadding },
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: layout.scrollClearance },
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
  ctaButton: { marginTop: 6, alignSelf: "flex-start", width: "90%", height: 44 },
  ctaText: { gap: space.sm },
  ctaChar: { marginRight: -8, marginBottom: -8 },
  section: { paddingTop: space.xl },
  invite: { paddingVertical: space.xl, gap: space.sm },
  centered: { textAlign: "center" },
  more: { alignSelf: "flex-start", paddingHorizontal: 0 },
  done: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.md },
  underTab: { height: layout.minBottomInset, backgroundColor: background.elevated },
});
