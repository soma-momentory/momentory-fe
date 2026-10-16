import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabScreen } from "@/components/ds/TabScreen";
import { WeatherCreditSheet } from "@/components/weather/WeatherCreditSheet";
import { WeatherIntroSheet } from "@/components/weather/WeatherIntroSheet";
import { layout } from "@/design/ds";
import { track } from "@/features/analytics";
import { useAuth } from "@/features/auth/model/auth";
import { useDiary } from "@/features/diary/model/diary";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useDay, useTodayContext, weekStartOf } from "@/features/home/model/day";
import { useHomeWeather } from "@/features/home/model/useHomeWeather";
import type { HomeWeather } from "@/features/home/model/weather";
import { HomeV2View } from "@/features/home/ui/v2/HomeV2View";
import { toHomeWeatherView } from "@/features/home/ui/v2/weatherStickers";
import { useSettings } from "@/features/my/model/settings";
import { useInbox } from "@/features/notifications/model/inbox";
import { InboxPopover } from "@/features/notifications/ui/InboxPopover";
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
  const authStatus = useAuth((state) => state.status);
  const inbox = useInbox();
  const weather = useHomeWeather();
  const [inboxTop, setInboxTop] = useState(0);
  const [weatherInfoFor, setWeatherInfoFor] = useState<HomeWeather | null>(null);
  const [weatherIntroReadyFor, setWeatherIntroReadyFor] = useState<number | null>(null);
  const [homeFocused, setHomeFocused] = useState(false);
  const { date: today } = useTodayContext();
  const insets = useSafeAreaInsets();

  const sameUser = authStatus === "authenticated" && inbox.userId != null;
  const currentWeather = sameUser && weather.ownerUserId === inbox.userId ? weather.weather : null;
  const weatherView = toHomeWeatherView(currentWeather);

  useFocusEffect(
    useCallback(() => {
      setHomeFocused(true);
      if (authStatus === "authenticated" && inbox.userId != null) {
        void useInbox.getState().refreshUnread();
      }
      return () => {
        setHomeFocused(false);
        void useInbox.getState().close();
        setWeatherInfoFor(null);
      };
    }, [authStatus, inbox.userId]),
  );

  useEffect(() => {
    if (
      !homeFocused ||
      weather.status !== "intro" ||
      !sameUser ||
      weather.ownerUserId !== inbox.userId
    ) {
      return;
    }
    const timer = setTimeout(() => setWeatherIntroReadyFor(inbox.userId), 600);
    return () => clearTimeout(timer);
  }, [homeFocused, weather.status, weather.ownerUserId, sameUser, inbox.userId]);

  // 서버 일정은 홈이 뜰 때만 가져온다. 실패해도 기존처럼 빈 목록을 그린다.
  useEffect(() => {
    void load();
  }, [load]);

  const week = useMemo(() => {
    const start = weekStartOf(today);
    return weekDays(diaries, start, weekEnd(start));
  }, [diaries, today]);

  return (
    <>
      <HomeV2View
        model={{
          today,
          schedules,
          week,
          retroReminderTime:
            retroNotify.enabled && retroNotify.time != null ? retroNotify.time : null,
          weather: weatherView,
          hasUnreadNotifications: sameUser && inbox.hasUnread === true,
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
          onOpenNotificationSettings: () => {
            void useInbox.getState().close();
            router.push({ pathname: "/my", params: { openNotificationSettings: "1" } });
          },
          onOpenNotifications: (top) => {
            if (!sameUser) return;
            setInboxTop(top);
            void useInbox.getState().open();
          },
          onOpenWeatherInfo: () => {
            if (weatherView != null) setWeatherInfoFor(currentWeather);
          },
        }}
        inboxPopover={
          homeFocused && sameUser && inbox.isOpen ? (
            <InboxPopover
              items={inbox.items}
              status={inbox.status}
              unreadIds={inbox.unreadAtOpen}
              hasMore={inbox.nextCursor != null}
              loadingMore={inbox.loadingMore}
              top={inboxTop}
              onDismiss={() => void useInbox.getState().close()}
              onOpenSettings={() => {
                void useInbox.getState().close();
                router.push({ pathname: "/my", params: { openNotificationSettings: "1" } });
              }}
              onPressItem={(item) => {
                void useInbox.getState().markRead(item.id);
                if (item.link != null) {
                  void useInbox.getState().close();
                  router.push(item.link);
                }
              }}
              onEndReached={() => void useInbox.getState().loadMore()}
              onSeen={(ids) => useInbox.getState().markSeen(ids)}
            />
          ) : null
        }
        weatherIntroSheet={
          homeFocused &&
          weather.status === "intro" &&
          weatherIntroReadyFor === inbox.userId &&
          !inbox.isOpen ? (
            <WeatherIntroSheet
              onAccept={() => void weather.acceptIntro()}
              onDismiss={() => void weather.dismissIntro()}
            />
          ) : null
        }
        renderFrame={(body, overlay) => (
          <TabScreen active="홈" overlay={overlay}>
            {body}
          </TabScreen>
        )}
        // TabScreen의 오버레이는 Safe Area를 적용한 Screen 밖, 화면 원점에 있다.
        menuTopFromPageY={(pageY) => pageY}
        menuBottomInset={layout.tabBar + Math.max(insets.bottom, layout.minBottomInset)}
      />
      {currentWeather != null && weatherView != null ? (
        <WeatherCreditSheet
          visible={weatherInfoFor === currentWeather}
          onDismiss={() => setWeatherInfoFor(null)}
          source={currentWeather.source}
          label={currentWeather.label}
          temperatureC={currentWeather.temperatureC}
          updatedAt={currentWeather.updatedAt}
        />
      ) : null}
    </>
  );
}
