import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, type ReactNode } from "react";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

// 폰트가 준비되기 전에 화면을 보이지 않는다 — 서체가 바뀌며 깜빡이지 않게.
void SplashScreen.preventAutoHideAsync();

/**
 * 앱 전체를 감싸는 Provider 스택. **여기 하나만 고친다.**
 *
 * `app/_layout.tsx` 는 라우트 설정(Stack · StatusBar)만 남긴다. Provider 를
 * 늘릴 때 레이아웃 파일을 건드리면 축 A·B 두 사람이 같은 줄에서 부딪힌다
 * (`docs/TASKS.md` 「둘이 부딪히는 곳」).
 *
 * ## 삽입 순서 — 바깥에서 안으로
 *
 * ```
 * GestureHandlerRootView   ← M3. **반드시 최상단.** RNGH 가 루트를 요구한다
 *   SafeAreaProvider       ← 지금 있음
 *     QueryClientProvider  ← M2. 첫 API 호출 (ARCHITECTURE §1)
 *       AuthGate           ← M2-0. hydrating 동안 보이는 것이 곧 S0 (§3)
 *         children
 * ```
 *
 * 순서에 이유가 있다:
 * - **GestureHandlerRootView 가 가장 밖**이다. 안쪽에 두면 그 위의 제스처가
 *   죽는다 — 홈 바텀시트(`12-c`·`12-d`·`12-e`)가 여기 걸린다.
 * - **AuthGate 는 가장 안**이다. 토큰 갱신에 Query 가 필요하고, 갱신 결과로
 *   라우트를 막아야 하므로 라우트 트리 바로 위여야 한다.
 *
 * **아직 설치하지 않은 것을 미리 넣지 않는다** — 쓸 화면이 생길 때 넣는다
 * (`ARCHITECTURE.md §1`). 위 셋은 자리만 적어둔 것이지 지금 있는 것이 아니다.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const fontsReady = useAppFonts();

  // 폰트를 기다리는 동안은 스플래시가 떠 있다. 여기서 무언가를 그리면
  // 시스템 서체로 한 번 그렸다가 바뀌며 깜빡인다.
  if (!fontsReady) return null;

  // initialMetrics 를 주지 않으면 인셋을 실제로 재기 전까지 자식을 그리지 않는다 —
  // 스플래시가 내려간 뒤 한 프레임이 비어 깜빡인다.
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}>{children}</SafeAreaProvider>;
}

/**
 * Pretendard 4 weight. 위계는 굵기·크기·자간으로만 만든다 — 서체는 하나다.
 *
 * 굵기를 `fontWeight` 가 아니라 **파일 이름**으로 고르므로 4개를 각각 등록한다
 * (Android 는 `fontWeight` 로 OTF 굵기를 골라주지 않는다).
 */
function useAppFonts() {
  const [loaded, error] = useFonts({
    "Pretendard-Regular": require("../../assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-Medium": require("../../assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-SemiBold": require("../../assets/fonts/Pretendard-SemiBold.otf"),
    "Pretendard-Bold": require("../../assets/fonts/Pretendard-Bold.otf"),
  });

  useEffect(() => {
    // 폰트 로딩이 실패해도 앱을 붙잡아두지 않는다 — 시스템 서체로라도 뜬다.
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  return loaded || error != null;
}
