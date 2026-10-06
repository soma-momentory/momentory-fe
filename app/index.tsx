import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { background } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

/**
 * `S0` · 스플래시 = `entry` 상태 기계의 `route` 판정 자리.
 *
 * ## 네이티브 스플래시와 한 장이다 (2026-10-06 · 사용자 요청)
 *
 * 예전에는 네이티브 스플래시(아이콘) 뒤에 로그인과 같은 블록(워드마크 · 태그라인 · 스피너)을
 * 0.8초 이상 한 번 더 보여서 **로딩 화면이 두 장**으로 보였다. 이제 S0 는 네이티브 스플래시와
 * **같은 색(`background.splash`) · 같은 그림(`splash-icon.png`) · 같은 자리**를 그린다 — 그림이
 * 그려지는 순간 네이티브 스플래시를 내리므로(`providers.tsx` 는 `/` 에서 내리지 않는다) 바뀌는
 * 순간이 보이지 않는다. 판정이 끝나면 바로 다음 화면으로 간다.
 *
 * - **0.8초 하한을 없앴다** — 하한은 S0 가 번쩍 지나가지 않게 둔 것인데, 네이티브 스플래시와
 *   한 장이 되면서 지나갈 화면이 따로 없다(`docs/PRODUCT.md` 「상류와 차이」 #43)
 * - **아무것도 묻지 않는다 · 진행률·퍼센트를 두지 않는다**는 그대로다
 * - 판정은 `hydrate` 가 **끝난 뒤**다 — 그 사이 SecureStore 세션을 복원하고 서버에 온보딩
 *   완료 여부를 묻는다(`hydrating` 동안 보이는 것이 곧 S0 다, `ARCHITECTURE §3`). 판정 셋:
 *
 * ```
 * 세션 없음                    → (auth)/login
 * 세션 있음 · 온보딩 미완료     → (onboarding)/welcome
 * 세션 있음 · 온보딩 완료       → (tabs)/home
 * ```
 *
 * **온보딩 완료 여부의 정본은 서버다** — `hydrate` 가 `GET /api/v1/users/me` 를
 * 기다렸다가 `completion` 에 적는다(`auth.ts` `syncMe`). 그래서 앱을 껐다 켜도
 * 온보딩이 되풀이되지 않는다. ⚠ 단 **서버에 못 물어봤을 때는**(오프라인 등) 그
 * 플래그가 아직 메모리라(`completion.ts` · MMKV 는 M3) 온보딩이 다시 뜬다.
 * 분기 자체는 여기 있고, 영속이 붙어도 이 파일은 바뀌지 않는다.
 */
/**
 * 네이티브 스플래시가 그림을 그리는 크기 — `app.config.ts` `expo-splash-screen` 의 `imageWidth`.
 * 두 곳이 어긋나면 S0 로 넘어가는 순간 그림이 커지거나 줄어든다.
 */
const SPLASH_IMAGE_SIZE = 288;

export default function Splash() {
  const status = useAuth((s) => s.status);
  const completed = useOnboardingCompletion((s) => s.completed);
  // `hydrate` 가 **끝났다** — `status` 만 보면 안 된다: `hydrate` 는 「인증됨」으로 먼저
  // 바꾼 뒤에 서버에 온보딩 완료 여부를 묻는다(`syncMe`). 그 답을 기다리지 않으면
  // 아직 모르는 완료 여부(기본값 false)로 판정해 온보딩을 마친 사람을 온보딩으로
  // 보냈다(개발 서버 1초 남짓 · 2026-10-05 실기기)
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void useAuth
      .getState()
      .hydrate()
      .then(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (status !== "authenticated") {
      router.replace("/login");
      return;
    }
    // 온보딩을 마친 사람은 홈으로 — 매번 온보딩을 다시 보게 하지 않는다.
    // 이 값은 `hydrate` 가 서버에 물어 적어둔 것이다(위 주석)
    router.replace(completed ? "/home" : "/welcome");
  }, [hydrated, status, completed]);

  // 그림이 그려진 뒤에 네이티브 스플래시를 내린다 — 같은 그림이라 바뀌는 순간이 보이지 않는다.
  // 그림을 못 읽어도 붙잡아 두지 않는다
  const reveal = () => void SplashScreen.hideAsync();

  return (
    <View
      style={styles.root}
      accessible
      accessibilityLabel="모멘토리 · 준비 중"
      accessibilityRole="progressbar"
    >
      <Image
        source={require("../assets/splash-icon.png")}
        style={styles.mark}
        testID="splash-mark"
        resizeMode="contain"
        // 안드로이드는 그림을 0.3초에 걸쳐 서서히 띄운다 — 네이티브 스플래시와 같은 그림이
        // 옅어졌다 짙어지며 한 번 깜빡여 보였다
        fadeDuration={0}
        onLoad={reveal}
        onError={reveal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 화면 전체(상태바·내비 바 밑까지)의 한가운데 — 네이티브 스플래시가 그림을 앉히는 기준과 같다
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: background.splash,
  },
  mark: { width: SPLASH_IMAGE_SIZE, height: SPLASH_IMAGE_SIZE },
});
