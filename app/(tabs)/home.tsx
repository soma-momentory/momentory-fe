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
import { hasUnreadLetter, useLetters } from "@/features/letter/model/letter";
import type { HomeWeather } from "@/features/home/model/weather";
import { HomeV2View } from "@/features/home/ui/v2/HomeV2View";
import { toHomeWeatherView } from "@/features/home/ui/v2/weatherStickers";
import { useMusic } from "@/features/music/model/music";
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
  const authStatus = useAuth((state) => state.status);
  const letterUserId = useLetters((state) => state.userId);
  const letters = useLetters((state) => state.summaries);
  const musicTrackId = useMusic((state) => state.trackId);
  const musicPlaying = useMusic((state) => state.playing);
  const selectMusic = useMusic((state) => state.select);
  const toggleMusic = useMusic((state) => state.toggle);
  const skipMusic = useMusic((state) => state.skip);
  const weather = useHomeWeather();
  const [weatherInfoFor, setWeatherInfoFor] = useState<HomeWeather | null>(null);
  const [weatherIntroReadyFor, setWeatherIntroReadyFor] = useState<number | null>(null);
  const [homeFocused, setHomeFocused] = useState(false);
  const { date: today } = useTodayContext();
  const insets = useSafeAreaInsets();

  const sameUser = authStatus === "authenticated" && letterUserId != null;
  const currentWeather = sameUser && weather.ownerUserId === letterUserId ? weather.weather : null;
  const unreadLetter = sameUser && hasUnreadLetter(letters);
  const weatherView = toHomeWeatherView(currentWeather);

  useFocusEffect(
    useCallback(() => {
      setHomeFocused(true);
      if (authStatus === "authenticated" && letterUserId != null) {
        // 편지는 아침에 열린다 — 홈에 올 때마다 목록 첫 칸으로 점을 다시 정한다(PRD 4-1)
        void useLetters
          .getState()
          .refresh()
          .then(() => {
            const { summaries } = useLetters.getState();
            if (summaries != null) {
              track("letter_entry_shown", { has_unread: hasUnreadLetter(summaries) });
            }
          });
      }
      return () => {
        setHomeFocused(false);
        setWeatherInfoFor(null);
      };
    }, [authStatus, letterUserId]),
  );

  useEffect(() => {
    if (
      !homeFocused ||
      weather.status !== "intro" ||
      !sameUser ||
      weather.ownerUserId !== letterUserId
    ) {
      return;
    }
    const timer = setTimeout(() => setWeatherIntroReadyFor(letterUserId), 600);
    return () => clearTimeout(timer);
  }, [homeFocused, weather.status, weather.ownerUserId, sameUser, letterUserId]);

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
          hasUnreadLetter: unreadLetter,
          musicTrackId,
          musicPlaying,
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
            router.push({ pathname: "/my", params: { openNotificationSettings: "1" } });
          },
          // 편지함 목록을 연다 — 지난 편지도 있다는 걸 목록으로 보인다(2026-10-27 · `app/letter/index.tsx`).
          // 안 연 새 편지가 있으면 목록 위에 그 편지를 바로 펼친다 — 닫으면 목록이 남는다
          onOpenLetter: () => {
            if (!sameUser) return;
            const latest = letters?.[0];
            router.push(unreadLetter && latest != null ? `/letter?open=${latest.date}` : "/letter");
          },
          onOpenWeatherInfo: () => {
            if (weatherView != null) setWeatherInfoFor(currentWeather);
          },
          onSelectMusic: selectMusic,
          onToggleMusic: toggleMusic,
          onSkipMusic: skipMusic,
        }}
        weatherIntroSheet={
          homeFocused && weather.status === "intro" && weatherIntroReadyFor === letterUserId ? (
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
