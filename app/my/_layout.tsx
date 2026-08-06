import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import theme from "@/design/theme";
import { useAuth } from "@/features/auth/model/auth";

/**
 * 마이 안쪽 — 회고 프로필(`M2`)과 알림 설정(`M3`).
 * 탭 위에 얹히는 스택이라 하단 탭이 없다 — 고치는 동안은 다른 탭이 필요 없다.
 *
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`).
 */
export default function MyLayout() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    if (useAuth.getState().status === "hydrating") void useAuth.getState().hydrate();
  }, []);

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
