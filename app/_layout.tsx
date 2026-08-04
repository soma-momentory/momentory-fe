import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import theme from "@/design/theme";

// 폰트가 준비되기 전에 화면을 보이지 않는다 — 서체가 바뀌며 깜빡이지 않게.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 위계는 굵기·크기·자간으로만 만든다. 서체는 Pretendard 하나다.
  const [fontsLoaded, fontError] = useFonts({
    "Pretendard-Regular": require("../assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-Medium": require("../assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-SemiBold": require("../assets/fonts/Pretendard-SemiBold.otf"),
    "Pretendard-Bold": require("../assets/fonts/Pretendard-Bold.otf"),
  });

  useEffect(() => {
    // 폰트 로딩이 실패해도 앱을 붙잡아두지 않는다 — 시스템 서체로라도 뜬다.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
