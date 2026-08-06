import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/model/auth";

/**
 * 홈 위에 뜨는 시트들(`12-c` · `12-d` · `12-e`).
 *
 * **배경을 그리지 않는다** — 뒤의 홈이 스크림 너머로 보여야 하므로 이 스택의
 * 화면은 전부 투명하고, 어둡게 덮는 것은 `Sheet` 의 `.scrimS` 다.
 * 투명 모달 설정 자체는 루트(`app/_layout.tsx`)의 `home` 스크린에 있다.
 *
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`) — `(tabs)`·
 * `(onboarding)` 과 같은 규칙이다. 시트도 보호 라우트라 세션 없이 열리면 안 된다.
 */
export default function HomeSheetsLayout() {
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
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}
