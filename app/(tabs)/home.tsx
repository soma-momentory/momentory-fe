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
import { useWhatsNew } from "@/features/home/model/useWhatsNew";
import { hasUnreadLetter, useLetters } from "@/features/letter/model/letter";
import type { HomeWeather } from "@/features/home/model/weather";
import { HomeV2View } from "@/features/home/ui/v2/HomeV2View";
import { toHomeWeatherView } from "@/features/home/ui/v2/weatherStickers";
import { WhatsNewPopup } from "@/features/home/ui/WhatsNewPopup";
import { useMusic } from "@/features/music/model/music";
import { useSettings } from "@/features/my/model/settings";
import { weekDays, weekEnd } from "@/features/report/model/report";
import { rewardTotal, useWardrobe } from "@/features/wardrobe/model/wardrobe";
import { AttendanceSheet } from "@/features/wardrobe/ui/AttendanceSheet";
import { TangerineMissionSheet } from "@/features/wardrobe/ui/TangerineMissionSheet";

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
  const babaOutfit = useWardrobe((state) => state.outfit);
  const attendanceDay = useWardrobe((state) => state.attendanceDay);
  const attendanceRewards = useWardrobe((state) => state.attendanceRewards);
  /** 출석 시트에 보일 귤 합 — 그날 처음 출석 귤을 받은 정산에서만 연다 */
  const [attendanceTotal, setAttendanceTotal] = useState<number | null>(null);
  /** 첫 귤 정산이 끝났나 — 출석 시트가 뜰지 알기 전에는 날씨 첫 안내를 띄우지 않는다 */
  const [settled, setSettled] = useState(false);
  const [missions, setMissions] = useState(false);
  const todayRewards = useWardrobe((state) => state.todayRewards);
  const whatsNew = useWhatsNew();
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
  const attendanceOpen = attendanceTotal != null && attendanceRewards.length > 0;

  // 시트 순서: 업데이트 소식 → 출석 → 날씨 첫 안내. 소식을 닫은 뒤에 정산해서 출석 시트 · 귤 축하가 겹치지 않는다
  useFocusEffect(
    useCallback(() => {
      if (authStatus !== "authenticated" || whatsNew.status !== "none") return;
      // 귤 정산 — 일기 · 일정 · 쉼터 · 편지는 서버가 확인해 준다. 그날 첫 출석이면 출석 시트를,
      // 아니면 받은 게 있을 때만 귤 축하를 띄운다(위기 안내가 있던 날은 둘 다 없다).
      // 미션을 끝낸 자리에서 이미 정산했으면 여기서는 받을 것이 없다(`settle`)
      void useWardrobe
        .getState()
        .refresh()
        .then((rewards) => {
          if (rewards.some((r) => r.reason === "CHECK_IN")) {
            setAttendanceTotal(rewardTotal(rewards));
            return;
          }
          useWardrobe.getState().celebrate(rewards);
        })
        .finally(() => setSettled(true));
    }, [authStatus, whatsNew.status]),
  );

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
          babaOutfit,
        }}
        actions={{
          onToggleDone: (id) => {
            const finishing = useDay.getState().schedules.find((x) => x.id === id)?.done === false;
            void toggleDone(id).then(async (saved) => {
              const visible = useDay.getState().schedules.filter((x) => !x.hidden);
              if (!saved || !finishing || !visible.every((x) => x.done)) return;
              // 오늘 일정을 다 끝냈다 — 서버가 확인하고 주면 그 자리에서 귤이 터진다
              await useWardrobe.getState().settle();
            });
          },
          onMove: moveSchedule,
          onReorder: reorderSchedule,
          onHideCalendarSchedule: hide,
          onDeleteManualSchedule: remove,
          onEditManualSchedule: (id) => router.push(`/home/schedule/${id}`),
          onAddSchedule: () => router.push("/home/schedule/new"),
          onOpenMissions: () => {
            track("tangerine_missions_opened", { source: "home" });
            setMissions(true);
          },
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
          homeFocused &&
          settled &&
          !attendanceOpen &&
          whatsNew.status === "none" &&
          weather.status === "intro" &&
          weatherIntroReadyFor === letterUserId ? (
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
      {homeFocused && whatsNew.status === "open" && !missions && weatherInfoFor == null ? (
        <WhatsNewPopup onDismiss={whatsNew.dismiss} />
      ) : null}
      {missions ? (
        <TangerineMissionSheet
          todayRewards={todayRewards}
          attendanceDay={attendanceDay}
          attendanceRewards={attendanceRewards}
          onDismiss={() => setMissions(false)}
          onGoWardrobe={() => {
            setMissions(false);
            // 꾸미기는 탭이다 — 쌓지 않고 바꾼다(`TabScreen`)
            router.replace("/wardrobe");
          }}
        />
      ) : null}
      {attendanceOpen ? (
        <AttendanceSheet
          total={attendanceTotal}
          day={attendanceDay}
          rewards={attendanceRewards}
          onDismiss={() => setAttendanceTotal(null)}
        />
      ) : null}
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
