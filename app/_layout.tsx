import { Stack } from "expo-router";

import { RouteStatusBar } from "@/components/RouteStatusBar";

import { background, motion } from "@/design/ds";
import { AppProviders } from "@/lib/providers";

/**
 * 라우트 설정만 둔다. **Provider 는 여기가 아니라 `src/lib/providers.tsx` 다** —
 * 축 A·B 두 사람이 이 파일에서 부딪히지 않게 (`docs/TASKS.md` 「둘이 부딪히는 곳」).
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <RouteStatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          // 화면 전환은 Fade only — 슬라이드 없음 (theme.motion.spec.screen)
          animation: "fade",
          animationDuration: motion.duration,
          contentStyle: { backgroundColor: background.normal },
        }}
      >
        {/*
          홈의 시트 3종(`12-c`·`12-d`·`12-e`)은 **투명 모달**이다 — 뒤의 홈이
          스크림 너머로 계속 보여야 어디서 왔는지를 잃지 않는다(`Sheet` 주석).
          시트가 라우트라서 뒤로가기·스와이프백이 그대로 닫기가 된다.
        */}
        <Stack.Screen
          name="home"
          options={{
            presentation: "transparentModal",
            animation: "fade",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />

        {/*
          ⚠ **회고는 여기서도 스와이프-백을 끈다.** `app/retro/_layout.tsx` 가 이미
          껐지만 그것은 **회고 스택 안쪽**(intro→…→talk)에만 걸린다 — 회고 전체가
          이 루트 스택의 화면 하나라, 바깥 제스처는 살아 있어서 **회고 한 벌이
          통째로 닫혔다.**

          `talk` 의 0~10 슬라이더를 **왼쪽 끝에서 오른쪽으로** 끌 때마다 대화가
          사라지던 자리다(2026-08-28 실기기) — 엄지가 왼쪽에 있을 때 드래그 시작점이
          iOS 엣지 제스처 영역 안이라 시스템이 그걸 뒤로가기로 가져간다.
          `PanResponder`(JS)는 네이티브 엣지 제스처를 막지 못한다.

          설계상으로도 이쪽이 맞다 — 회고에서 나가는 길은 상단 `✕` 하나다
          (`RULES.md` 「회고」 · `app/retro/_layout.tsx`).
        */}
        <Stack.Screen name="retro" options={{ gestureEnabled: false }} />
      </Stack>
    </AppProviders>
  );
}
