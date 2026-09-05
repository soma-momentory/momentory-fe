import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { AnalyticsObserver } from "@/features/analytics/AnalyticsObserver";

import { ToastHost } from "@/components/ds";
import { startCalendarForegroundSync } from "@/features/calendar/model/foregroundSync";
import { startDayRollover } from "@/features/home/model/dayRollover";
import { startReminderSync } from "@/features/my/model/reminders";

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
 * - **AuthGate 는 가장 안**이다. 판정 결과로 라우트를 막아야 하므로 라우트
 *   트리 바로 위여야 한다. 토큰 갱신 자체는 Query 없이 `auth.ts`(`getAccessToken`·
 *   `hydrate`)에서 이미 돈다 — AuthGate 가 필요한 것은 QueryClient 도입 이후
 *   백그라운드 리페치 등에서 세션이 죽었을 때 라우트를 되돌리는 몫이다.
 *
 * **아직 설치하지 않은 것을 미리 넣지 않는다** — 쓸 화면이 생길 때 넣는다
 * (`ARCHITECTURE.md §1`). 위 셋은 자리만 적어둔 것이지 지금 있는 것이 아니다.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const fontsReady = useAppFonts();

  // 알림 설정 ↔ OS 예약을 맞추는 구독. **화면이 아니라 여기 하나에 건다** —
  // 값이 바뀌는 자리가 넷이라, 화면마다 걸면 하나를 빠뜨린다
  // (`features/my/model/reminders.ts`). 폰트보다 먼저 걸어도 되는 일이라
  // 이른 반환 위에 둔다 — 훅은 조건 없이 돈다.
  useEffect(() => startReminderSync(), []);

  // 기기 캘린더 ↔ 서버 화해를 **앱이 앞으로 돌아올 때마다** 돌린다. 캘린더 앱에서
  // 일정을 고치고 돌아온 직후가 바로 그때다 — 콜드 스타트에만 걸면 앱을 껐다 켜야
  // 들어온다(`features/calendar/model/foregroundSync.ts`). 여기 거는 이유는 위
  // 알림 구독과 같다: 탭 밖에 있는 동안에도 살아 있어야 한다.
  useEffect(() => startCalendarForegroundSync(), []);

  // 새벽 4:00 에 하루가 넘어가는 것도 여기서 지킨다 — 밤새 켜 둔 앱이 어제 날짜와
  // 어제 일정을 든 채로 남지 않게(`features/home/model/dayRollover.ts`).
  useEffect(() => startDayRollover(), []);

  // 폰트를 기다리는 동안은 스플래시가 떠 있다. 여기서 무언가를 그리면
  // 시스템 서체로 한 번 그렸다가 바뀌며 깜빡인다.
  if (!fontsReady) return null;

  // initialMetrics 를 주지 않으면 인셋을 실제로 재기 전까지 자식을 그리지 않는다 —
  // 스플래시가 내려간 뒤 한 프레임이 비어 깜빡인다.
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {/* 토스트는 **라우트 위**에 산다 — 화면 안에 두면 화면이 바뀔 때 알림도
          함께 사라진다(`lib/toast.ts`). 자리만 차지하지 않게 `box-none` 이다 */}
      <View style={styles.root}>
        <AnalyticsObserver />
        {children}
        <ToastHost />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

/**
 * 앱 서체는 **교보손글씨 하나**이고(2026-09-06), Pretendard 4웨이트는 **로그인
 * (`S1`) 전용**으로 남아 있다(`ds/typography.ts` 의 `gothicFamily`).
 *
 * 굵기를 `fontWeight` 가 아니라 **파일 이름**으로 고르므로 넷을 각각 등록한다
 * (Android 는 `fontWeight` 로 OTF 굵기를 골라주지 않는다).
 */
function useAppFonts() {
  const [loaded, error] = useFonts({
    "Pretendard-Regular": require("../../assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-Medium": require("../../assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-SemiBold": require("../../assets/fonts/Pretendard-SemiBold.otf"),
    "Pretendard-Bold": require("../../assets/fonts/Pretendard-Bold.otf"),
    // **앱 전체의 서체** — `ds/typography.ts` 의 `fontFamily` 다섯 이름이 모두 이 파일이다
    KyoboHandwriting2025lyb: require("../../assets/fonts/KyoboHandwriting2025lyb.ttf"),
    /**
     * ⚠ **우리 서체가 아니다.** 구글 로그인 버튼 **한 줄**만 쓴다 —
     * 한국어 브랜딩 가이드라인이 라벨 서체를 「Roboto Medium」으로 지정한다
     * (`components/ds/SocialButton.tsx`). 그래서 `ds/typography.ts` 의
     * `fontFamily` 토큰에는 올리지 않았다 — 다른 화면이 집어 쓰면 안 된다.
     */
    "Roboto-Medium": require("../../assets/fonts/Roboto-Medium.ttf"),
  });

  useEffect(() => {
    // 폰트 로딩이 실패해도 앱을 붙잡아두지 않는다 — 시스템 서체로라도 뜬다.
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  return loaded || error != null;
}
