import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/model/auth";

/**
 * 쉼터 안쪽 — 행동 카드 상세.
 *
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`) — `(tabs)`·`home` 과
 * 같은 규칙이다.
 */
export default function RestLayout() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    if (useAuth.getState().status === "hydrating") void useAuth.getState().hydrate();
  }, []);

  if (status === "hydrating") return null;
  if (status !== "authenticated") return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
