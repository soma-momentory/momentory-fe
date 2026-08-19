import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import theme from "@/design/theme";
import { useAuth } from "@/features/auth/model/auth";

/**
 * 마이 안쪽 — 기본 정보 수정 목록(`M3`)과 항목별 수정 다섯(`M4`~`M8`:
 * 닉네임 · 나이 · 성별 · 관심 분야 · 쉬는 방법).
 * 탭 위에 얹히는 스택이라 하단 탭이 없다 — 고치는 동안은 다른 탭이 필요 없다.
 *
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`). ⚠ 새 디자인이 목록을
 * 다섯 라우트로 쪼갰는데 가드는 **여기 하나뿐**이다 — `app/my/` 아래에 파일을
 * 더할 때 이 레이아웃 밖으로 나가지 않게 한다(`PLAN.md` A-4).
 *
 * 알림 설정(`M2`)은 라우트가 아니다 — 마이 기본 화면 위에 겹치는 **시트**라
 * `app/(tabs)/my.tsx` 안에서 열린다(`design.md` §11).
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
