import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import theme from "@/design/theme";
import { useAuth } from "@/features/auth/model/auth";

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

  // S0 을 건너뛴 콜드 스타트(딥링크)면 스스로 판정한다. 이미 판정됐으면 아무 일도 없다
  useEffect(() => {
    if (useAuth.getState().status === "hydrating") void useAuth.getState().hydrate();
  }, []);

  // 판정 전에는 보호 라우트를 그리지 않는다 — 깜빡임보다 유출이 나쁘다
  if (status === "hydrating") return null;
  if (status !== "authenticated") return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: theme.motion.spec.screen.duration,
        contentStyle: { backgroundColor: theme.colors.semantic.background },
      }}
    />
  );
}
