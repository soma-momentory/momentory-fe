import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import { paperColors } from "@/design/paper";
import theme from "@/design/theme";
import { useAuth } from "@/features/auth/model/auth";

/**
 * 일기 상세 — `A3`·`A3-b`·`A3-c` 와 수정(`A4`).
 *
 * 탭 안이 아니라 **탭 위에 얹히는 스택**이다. 일기를 읽는 동안은 하단 탭이
 * 필요 없고, 닫으면 보던 보관함 자리로 돌아와야 하기 때문이다.
 *
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`) — 다른 스택과 같다.
 *
 * 스택의 바닥색은 화면이 쓰는 **`paperFlat`** 과 같은 종이색이다 — 화면 전환
 * 사이에 옛 배경색이 한 프레임 비치지 않게(`PLAN.md` Phase 3-8).
 */
export default function DiaryLayout() {
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
        contentStyle: { backgroundColor: paperColors.bg.flat },
      }}
    />
  );
}
