import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

import { Spinner } from "@/components/ds";
import { background, motion, space } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

/**
 * `S0` · 스플래시 = `entry` 상태 기계의 `route` 판정 자리.
 *
 * ## 네이티브 스플래시의 얼굴을 이어받고, 그 아래에 워드마크를 더한다 (2026-10-06 · 사용자 요청)
 *
 * 네이티브 스플래시는 **얼굴만** 그린다 — 안드로이드 12+ 는 스플래시 그림을 원으로 깎아서, 얼굴
 * 아래에 `Momentory` 를 크게 두면 양끝이 잘린다. 그래서 S0 가 네이티브 스플래시와 **같은 색
 * (`background.splash`) · 같은 그림(`splash-icon.png`) · 같은 자리**에 얼굴을 그려 이어받고(그림이
 * 그려지는 순간 네이티브 스플래시를 내린다 — `providers.tsx` 는 `/` 에서 내리지 않는다), 그
 * 아래에 워드마크(`splash-wordmark.png`)와 기다림 표시를 서서히 띄운다. 얼굴은 움직이지 않고
 * 그 아래만 더해진다.
 *
 * 이 화면에는 원 제한이 없어 워드마크를 얼굴 아래에 크게 둘 수 있다 — 한 장으로 합쳤던 것
 * (같은 날)을 이 때문에 다시 나눴다(`docs/PRODUCT.md` 「상류와 차이」 #43).
 *
 * - **아무것도 묻지 않는다** — 얼굴 · 워드마크 · 기다림 표시(`Spinner`)뿐이다. 진행률·퍼센트를
 *   두지 않는다 — 얼마나 걸리는지 모르는 일에 숫자를 붙이면 그 숫자가 틀렸을 때 신뢰가 깎인다
 * - **최소 0.8초**를 보장하고 준비되면 즉시 넘어간다 — 워드마크가 번쩍 지나가지 않게
 * - **`max(0.8s, 준비완료)`** — 그 사이 SecureStore 세션을 비동기로 복원한다
 *   (`hydrating` 동안 보이는 것이 곧 S0 다, `ARCHITECTURE §3`). 판정 셋:
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
const MIN_SPLASH_MS = 800;

/**
 * 네이티브 스플래시가 그림을 그리는 크기 — `app.config.ts` `expo-splash-screen` 의 `imageWidth`.
 * 두 곳이 어긋나면 S0 로 넘어가는 순간 얼굴이 커지거나 줄어든다.
 */
const SPLASH_IMAGE_SIZE = 288;
/** 그림 안에서 얼굴이 차지하는 몫 — 캔버스 1024 중 532(`splash-icon.png` 을 만들 때 정했다) */
const FACE_SIZE = (SPLASH_IMAGE_SIZE * 532) / 1024;
/**
 * 워드마크 폭 — 한 장이던 때(얼굴 아래 캔버스 410/1024 · 약 115)의 **두 배**(2026-10-06 · 사용자 요청).
 * 높이는 그림 비율(540 × 76)을 따른다.
 */
const WORDMARK_WIDTH = 230;
const WORDMARK_HEIGHT = (WORDMARK_WIDTH * 76) / 540;

export default function Splash() {
  const status = useAuth((s) => s.status);
  const completed = useOnboardingCompletion((s) => s.completed);
  const [minDone, setMinDone] = useState(false);
  // `hydrate` 가 **끝났다** — `status` 만 보면 안 된다: `hydrate` 는 「인증됨」으로 먼저
  // 바꾼 뒤에 서버에 온보딩 완료 여부를 묻는다(`syncMe`). 그 답이 0.8초 하한보다 늦으면
  // 아직 모르는 완료 여부(기본값 false)로 판정해 온보딩을 마친 사람을 온보딩으로
  // 보냈다(개발 서버 1초 남짓 · 2026-10-05 실기기)
  const [hydrated, setHydrated] = useState(false);
  const [wordmarkOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    void useAuth
      .getState()
      .hydrate()
      .then(() => setHydrated(true));
    const t = setTimeout(() => setMinDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // 0.8초 하한과 hydration 둘 다 끝나야 넘어간다 — 먼저 끝난 쪽이 기다린다
    if (!minDone || !hydrated) return;
    if (status !== "authenticated") {
      router.replace("/login");
      return;
    }
    // 온보딩을 마친 사람은 홈으로 — 매번 온보딩을 다시 보게 하지 않는다.
    // 이 값은 `hydrate` 가 서버에 물어 적어둔 것이다(위 주석)
    router.replace(completed ? "/home" : "/welcome");
  }, [minDone, hydrated, status, completed]);

  // 얼굴이 그려진 뒤에 네이티브 스플래시를 내리고 워드마크·기다림 표시를 띄운다 — 얼굴은 같은 그림이라
  // 바뀌는 순간이 보이지 않는다. 그림을 못 읽어도 붙잡아 두지 않는다
  const reveal = () => {
    void SplashScreen.hideAsync();
    Animated.timing(wordmarkOpacity, {
      toValue: 1,
      duration: motion.duration,
      useNativeDriver: true,
    }).start();
  };

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
      <Animated.View style={[styles.underFace, { opacity: wordmarkOpacity }]} pointerEvents="none">
        <Image
          source={require("../assets/splash-wordmark.png")}
          style={styles.wordmark}
          testID="splash-wordmark"
          resizeMode="contain"
          fadeDuration={0}
        />
        <View testID="splash-waiting">
          <Spinner />
        </View>
      </Animated.View>
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
  // 얼굴 아랫변 바로 아래 — 얼굴을 밀어 올리지 않게 흐름 밖(절대 배치)에 앉힌다.
  // 워드마크와 기다림 표시 사이는 한 덩어리로 읽히지 않게 조금 더 띄운다
  underFace: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: space.xl,
    marginTop: FACE_SIZE / 2 + space.lg,
  },
  wordmark: { width: WORDMARK_WIDTH, height: WORDMARK_HEIGHT },
});
