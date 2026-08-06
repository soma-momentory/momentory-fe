import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import theme from "@/design/theme";
import { AppProviders } from "@/lib/providers";

/**
 * 라우트 설정만 둔다. **Provider 는 여기가 아니라 `src/lib/providers.tsx` 다** —
 * 축 A·B 두 사람이 이 파일에서 부딪히지 않게 (`docs/TASKS.md` 「둘이 부딪히는 곳」).
 */
export default function RootLayout() {
  return (
    <AppProviders>
      {/* 배경이 크림이라 상태바 글자는 항상 어둡다 (다크모드에서도 반전 없음) */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          // 화면 전환은 Fade only — 슬라이드 없음 (theme.motion.spec.screen)
          animation: "fade",
          animationDuration: theme.motion.spec.screen.duration,
          contentStyle: { backgroundColor: theme.colors.semantic.background },
        }}
      />
    </AppProviders>
  );
}
