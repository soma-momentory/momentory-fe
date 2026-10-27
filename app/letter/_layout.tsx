import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import { background, motion } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";

/**
 * 바바의 편지 — 전체 화면(`[date]`)과 편지 시각 고르기(`time`) · PRD 4-2 · 4-8.
 *
 * 일기 상세(`app/diary/_layout.tsx`)처럼 **탭 위에 얹히는 스택**이다 — 닫으면 연 자리로 돌아간다.
 *
 * **라우트 가드가 최종 권한을 갖는다**(`ARCHITECTURE §3-3`) — 다른 스택과 같다.
 *
 * 스택의 바닥색은 앱 기본 면이다 — 화면 전환
 * 사이에 옛 배경색이 한 프레임 비치지 않게(`PLAN.md` Phase 3-8).
 */
export default function LetterLayout() {
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
        animationDuration: motion.duration,
        contentStyle: { backgroundColor: background.normal },
      }}
    />
  );
}
