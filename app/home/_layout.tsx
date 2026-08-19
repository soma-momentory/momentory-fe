import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/model/auth";

/**
 * 홈 위에 뜨는 입력 바 둘 — **수정(`12-c`)과 추가(`12-e`)**.
 * (`12-d` 순간 입력은 2026-08-14 에, 완료 감정 시트는 2026-08-20 에 사라졌다 — N7.)
 *
 * **배경을 그리지 않는다** — 뒤의 홈이 계속 보여야 하므로 이 스택의 화면은 전부
 * 투명하고, 아래에서 올라오는 바만 자기 면을 든다(`ScheduleEditBar`).
 * 투명 모달 설정 자체는 루트(`app/_layout.tsx`)의 `home` 스크린에 있다.
 *
 * **바가 라우트인 이유는 닫기다** — `router.back()` 하나가 닫기여야 기기
 * 뒤로가기·스와이프백이 그대로 닫기가 된다(`PLAN.md` A-4).
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
