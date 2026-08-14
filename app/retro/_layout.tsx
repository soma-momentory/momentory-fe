import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import { paperColors } from "@/design/paper";
import theme from "@/design/theme";
import { useAuth } from "@/features/auth/model/auth";

/**
 * 회고 — `momentory.states.mvp.json` 의 `retro` 상태 기계.
 *
 * **전체화면 모달 스택**이다(`ARCHITECTURE §3`) — 탭바를 두지 않는다. 회고는
 * 시작하면 끝까지 가는 한 줄이고, 중간에 보관함으로 새는 길을 만들지 않는다.
 * 나가는 길은 상단의 `‹` 와 `[잠시 쉬기]` 둘뿐이다.
 *
 * `C7` 에서 홈으로 pop 하고 `Diary` 한 장이 남는다 — **완료 화면은 허브가
 * 아니다**(`RULES.md` 「회고」).
 *
 * **라우트 가드가 최종 권한을 갖는다**(`§3-3`) — 회고 알림 딥링크가 바로 이
 * 스택을 열 수 있으므로 여기서도 세션을 확인한다.
 */
export default function RetroLayout() {
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
        // 화면 사이 fade 동안 비치는 바닥 — 회고는 종이 베이스다(`paperFlat`).
        // 옛 배경색이 남으면 전환 때 크림→테라코타가 한 번 번쩍인다
        contentStyle: { backgroundColor: paperColors.bg.flat },
      }}
    />
  );
}
