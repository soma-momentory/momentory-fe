import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import theme from "@/design/theme";
import { useAuth } from "@/features/auth/model/auth";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * 온보딩 스택. 상단 조각(`BackChevron`·`ProgressDots`)은 **여기서 그리지 않는다** —
 * 화면마다 있고 없고가 다르기 때문이다:
 *
 * - `03` 환영 — 진행점 **없음**(아직 질문이 시작되지 않았다), 뒤로 **없음**
 * - `04` 닉네임 — 진행점 1/6, 뒤로 **없음**(첫 질문이라 돌아갈 곳이 없다)
 * - `05-b` 부터 — 진행점 + 뒤로
 *
 * 레이아웃에 올려두고 화면마다 끄면 「없음」이 세 종류로 갈려 조건문이 화면과
 * 레이아웃 양쪽에 생긴다. 화면이 자기 상단을 그리는 편이 읽기 쉽다.
 * 대신 `OnboardingTopBar` 가 자리를 고정한다.
 *
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`) — 진입 판정(S0)
 * 한 번으로 끝내지 않고, 이 레이아웃이 `authenticated` 가 아니면 무조건
 * 로그인으로 되돌린다. 딥링크로 바로 들어와도 여기서 막힌다.
 *
 * **선택지도 여기서 한 번 받아둔다**(`04`·`05-b`·`06` 이 같은 목록을 본다).
 * **기다리지 않는다** — 화면은 대역으로 즉시 그리고 답이 오면 조용히 바뀐다.
 * 선택지를 기다리느라 온보딩 첫 화면을 붙잡아 두지 않는다.
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
        animationDuration: theme.motion.spec.screen.duration,
        contentStyle: { backgroundColor: theme.colors.semantic.background },
      }}
    />
  );
}
