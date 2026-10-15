import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabScreen } from "@/components/ds/TabScreen";
import { layout } from "@/design/ds";
import { track } from "@/features/analytics";
import { useDiary } from "@/features/diary/model/diary";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useDay, useTodayContext, weekStartOf } from "@/features/home/model/day";
import { HomeV2View } from "@/features/home/ui/v2/HomeV2View";
import { useSettings } from "@/features/my/model/settings";
import { weekDays, weekEnd } from "@/features/report/model/report";

/** 홈의 서비스 어댑터. 조회·계측·라우팅은 Lab에 공유하지 않는다. */
export default function Home() {
  const schedules = useDay((state) => state.schedules);
  const toggleDone = useDay((state) => state.toggleDone);
  const moveSchedule = useDay((state) => state.moveSchedule);
  const reorderSchedule = useDay((state) => state.reorderSchedule);
  const hide = useDay((state) => state.hide);
  const remove = useDay((state) => state.remove);
  const load = useDay((state) => state.load);
  const diaries = useDiary((state) => state.diaries);
  const retroNotify = useSettings((state) => state.notify.retro);
  const { date: today } = useTodayContext();
  const insets = useSafeAreaInsets();

  // 서버 일정은 홈이 뜰 때만 가져온다. 실패해도 기존처럼 빈 목록을 그린다.
  useEffect(() => {
    void load();
  }, [load]);

  const week = useMemo(() => {
    const start = weekStartOf(today);
    return weekDays(diaries, start, weekEnd(start));
  }, [diaries, today]);

  return (
    <HomeV2View
      model={{
        today,
        schedules,
        week,
        retroReminderTime:
          retroNotify.enabled && retroNotify.time != null ? retroNotify.time : null,
        weather: null,
        hasUnreadNotifications: false,
      }}
      actions={{
        onToggleDone: toggleDone,
        onMove: moveSchedule,
        onReorder: reorderSchedule,
        onHideCalendarSchedule: hide,
        onDeleteManualSchedule: remove,
        onEditManualSchedule: (id) => router.push(`/home/schedule/${id}`),
        onAddSchedule: () => router.push("/home/schedule/new"),
        onStartReflection: () => {
          track("retro_cta_clicked", { source: "home" });
          router.push(hasDiaryOn(diaries, today) ? "/retro/talk" : "/retro/confirm");
        },
        onOpenNotificationSettings: () => router.push("/my"),
        onOpenNotifications: () => router.push("/my"),
        onOpenWeatherInfo: () => {},
      }}
      renderFrame={(body, overlay) => (
        <TabScreen active="홈" overlay={overlay}>
          {body}
        </TabScreen>
      )}
      // TabScreen의 오버레이는 Safe Area를 적용한 Screen 밖, 화면 원점에 있다.
      menuTopFromPageY={(pageY) => pageY}
      menuBottomInset={layout.tabBar + Math.max(insets.bottom, layout.minBottomInset)}
    />
  );
}
