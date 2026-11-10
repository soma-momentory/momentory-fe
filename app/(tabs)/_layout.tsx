import { Redirect, Stack, useNavigation, type NativeStackNavigationProp } from "expo-router";
import { useEffect } from "react";

import { background, motion } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";
import { syncDeviceCalendar } from "@/features/calendar/model/foregroundSync";
import { useDiary } from "@/features/diary/model/diary";

/**
 * 탭 스택. **하단 탭은 여기서 그리지 않는다** — 각 화면이 `TabScreen` 으로
 * 감싸 자기 탭을 표시한다. 배경 그라디언트가 탭바 뒤까지 이어져야 하는데,
 * 레이아웃에서 그리면 화면의 `ScreenBackground` 바깥이라 그 뒤가 빈다.
 *
 * ⚠ expo-router 의 `Tabs` 를 아직 쓰지 않는 이유는 `TabBar` 주석에 있다 —
 * 네 칸 중 홈만 있어서, 없는 라우트를 가리키는 `Tabs.Screen` 을 선언하게 된다.
 *
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`) — `(onboarding)` 과
 * 같은 규칙이다. 진입 판정(`S0`) 한 번으로 끝내지 않고, 세션이 없으면 여기서
 * 무조건 로그인으로 되돌린다. 회고 알림 딥링크도 이 문을 지난다.
 */
export default function TabsLayout() {
  const status = useAuth((s) => s.status);
  // 레이아웃의 navigation 은 이 그룹이 서 있는 **루트 스택**의 것이다
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();

  /**
   * **탭은 루트 스택의 바닥이다.** 소개 → 로그인 → 온보딩을 지나 들어오면 그 화면들이 탭 아래에
   * 쌓여 남는다 — `replace("/home")` 은 맨 위 한 장만 바꾼다. 그대로 두면 기기 뒤로가기 · 스와이프가
   * 홈에서 다시 온보딩(소개)으로 갔다(2026-11-10 실기기 · 기본 정보를 고치고 뒤로 나가다 발견).
   * 들어오는 길(온보딩 완료 · 다시 로그인 · 앞으로 생길 길)마다 막지 않고 여기 한 곳에서 탭 아래를 걷는다.
   * 탭 위에 이미 올라온 것(온보딩 끝의 「지금 이야기하기」 → 회고)은 그대로 둔다.
   */
  useEffect(() => {
    const state = navigation.getState();
    const at = state?.routes.findIndex((r) => r.name === "(tabs)") ?? -1;
    if (state == null || at <= 0) return;
    navigation.reset({ ...state, index: state.index - at, routes: state.routes.slice(at) });
  }, [navigation]);

  // S0 을 건너뛴 콜드 스타트(딥링크)면 스스로 판정한다. 이미 판정됐으면 아무 일도 없다
  useEffect(() => {
    if (useAuth.getState().status === "hydrating") void useAuth.getState().hydrate();
  }, []);

  /**
   * 기기 캘린더 화해의 **콜드 스타트 자리.** 온보딩을 마친 사용자가 앱에 들어오는
   * 길은 결국 여기를 지난다.
   *
   * **바뀐 게 있는지 묻지 않고 그냥 한 번 읽는다.** 앱이 꺼져 있는 동안 구글
   * 캘린더에서 고친 것은 어떤 알림으로도 알 수 없고, `expo-calendar` 는 변경 시각도
   * (Android 에선) 주지 않는다. 읽는 데 실측 229ms 이고, **바뀐 게 없으면 서버는
   * 부르지 않는다**(해시 비교 · `calendarSync.ts`).
   *
   * 기다리지 않는다 — 홈은 캘린더 없이도 그려진다. 실패는 조용하고 다음 실행이
   * 다시 보낸다(`RULES.md` 4).
   *
   * ⚠ **여기는 콜드 스타트뿐이다.** 앱이 살아 있는 동안 캘린더 앱에서 고친 것은
   * 이 훅이 다시 돌지 않으므로 못 본다 — 그건 포그라운드 복귀가 맡는다
   * (`providers.tsx` 의 `startCalendarForegroundSync`).
   */
  useEffect(() => {
    if (status !== "authenticated") return;
    void syncDeviceCalendar();
  }, [status]);

  /**
   * 보관함·리포트·마이·쉼터가 읽는 일기·행동 카드를 **여기서 한 번** 받아 둔다 —
   * 화면마다 부르면 탭을 옮길 때마다 조회가 나간다. `load()` 는 스스로 한 번만
   * 돌고(로컬 옵티미스틱 변경 보호), 실패하면 다음 진입이 다시 시도한다.
   */
  useEffect(() => {
    if (status !== "authenticated") return;
    void useDiary.getState().load();
  }, [status]);

  // 판정 전에는 보호 라우트를 그리지 않는다 — 깜빡임보다 유출이 나쁘다
  if (status === "hydrating") return null;
  if (status !== "authenticated") return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: motion.duration,
        contentStyle: { backgroundColor: background.normal },
      }}
    />
  );
}
