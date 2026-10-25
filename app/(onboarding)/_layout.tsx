import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import { background, motion } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * 로그인 뒤 온보딩 스택(v2 · 2026-10-25) — 질문 넷 · 목표 · 답 정리 · 이름 · 나이 성별 · 캘린더 ·
 * 알림 · 연구 그래프 · 지금 첫 회고. 로그인 전 화면(시작 · 문제 · 소개)은 `app/intro/` 다.
 * 상단바 · 진행 막대는 화면마다 `OnboardingFrame` 이 그린다.
 *
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`) — 진입 판정(S0)
 * 한 번으로 끝내지 않고, 이 레이아웃이 `authenticated` 가 아니면 무조건
 * 로그인으로 되돌린다. 딥링크로 바로 들어와도 여기서 막힌다.
 *
 * 선택지(`GET /onboarding/options` — 이름 길이 상한)도 여기서 한 번 받아 둔다. 기다리지 않는다.
 */
export default function OnboardingLayout() {
  const status = useAuth((s) => s.status);

  // 딥링크로 S0 을 건너뛰고 들어온 콜드 스타트 — 아무도 hydrate 를 안 돌렸다면
  // 여기서 돌린다. 이미 판정됐으면 아무 일도 없다.
  useEffect(() => {
    if (useAuth.getState().status === "hydrating") void useAuth.getState().hydrate();
  }, []);

  // 인증된 뒤에 부른다 — 토큰이 없으면 요청이 나가지도 않고 폴백만 남는다
  useEffect(() => {
    if (status === "authenticated") void useOnboardingOptions.getState().load();
  }, [status]);

  if (status === "hydrating") {
    // 판정 전에는 보호 라우트를 그리지 않는다 — 깜빡임보다 유출이 나쁘다.
    // 콜드 스타트에서는 S0 이 이미 hydrate 를 돌리고 있어 한순간이다.
    return null;
  }
  if (status !== "authenticated") {
    return <Redirect href="/login" />;
  }

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
