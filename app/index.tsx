import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { SplashLoader } from "@/components/entry/SplashLoader";
import { SPLASH_LOGO_HALF_HEIGHT, SplashLogo } from "@/components/entry/SplashLogo";
import { Text } from "@/components/ds";
import { background, label, motion, space } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

/**
 * `S0` · 스플래시 = `entry` 상태 기계의 `route` 판정 자리.
 *
 * ## 네이티브 스플래시의 얼굴을 이어받고, 그 아래에 워드마크를 더한다 (2026-10-06 · 사용자 요청)
 *
 * 네이티브 스플래시는 **얼굴만** 그린다 — 안드로이드 12+ 는 스플래시 그림을 원으로 깎아서, 얼굴
 * 아래에 `Momentory` 를 크게 두면 양끝이 잘린다. 그래서 S0 가 네이티브 스플래시와 **같은 색
 * (`background.splash`) · 같은 그림 · 같은 자리**에 얼굴을 그려 이어받고(그림이 그려지는 순간
 * 네이티브 스플래시를 내린다 — `providers.tsx` 는 `/` 에서 내리지 않는다), 그 아래에 워드마크를
 * 서서히 띄운다 — 얼굴 + 워드마크 묶음이 화면 한가운데에 선다(`components/entry/SplashLogo`).
 * 얼굴은 움직이지 않고 그 아래만 더해진다. 기다림 표시는 묶음 아래에 따로 선다.
 *
 * 이 화면에는 원 제한이 없어 워드마크를 얼굴 아래에 크게 둘 수 있다 — 한 장으로 합쳤던 것
 * (같은 날)을 이 때문에 다시 나눴다(`docs/PRODUCT.md` 「상류와 차이」 #43).
 *
 * - **아무것도 묻지 않는다** — 얼굴 · 워드마크 · 기다림 표시(`SplashLoader`)뿐이다. 진행률·퍼센트를
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
 * 온보딩이 되풀이되지 않는다.
 *
 * ## 서버에 못 물어봤으면 여기서 기다린다 (2026-10-13)
 *
 * 오프라인 · 서버 장애로 답을 못 받으면 완료 여부는 「모른다」(`null`)다. 그때 온보딩으로
 * 보내면 마친 사람이 온보딩을 다시 보고(실제로 그랬다), 홈으로 보내도 화면이 전부 서버
 * 데이터라 빈 화면뿐이다. 그래서 **스플래시에 머물며 안내 한 줄을 띄우고, 몇 초마다 다시
 * 묻는다** — 연결이 돌아오면 누르지 않아도 넘어간다. 팝업·재시도 버튼은 두지 않는다
 * (`RULES.md` 4). 연결을 따로 검사하지 않는다 — 와이파이에 붙어 있어도 서버에 닿지 못할
 * 수 있고, 판정에 필요한 것은 「서버가 답했나」뿐이다.
 */
const MIN_SPLASH_MS = 800;

/** 서버에 못 물어봤을 때 다시 묻는 간격 — 한 번이 끝난 뒤에 잰다(겹쳐 보내지 않는다) */
const RETRY_MS = 3_000;

/** 기다리는 동안 로고 아래에 놓는 한 줄 — 누를 것도, 경고 표시도 없다 */
const OFFLINE_LINE = "인터넷 연결을 기다리고 있어요";

/** 로고 묶음 아래 끝과 기다림 표시 사이 — 로고와 한 덩어리로 읽히지 않게 넉넉히 띄운다
 * (20 → 48 → 96 · 2026-10-06 사용자 요청 「더 내려」 두 번) */
const LOADER_GAP = space.xl5 * 2;

export default function Splash() {
  const status = useAuth((s) => s.status);
  const completed = useOnboardingCompletion((s) => s.completed);
  const [minDone, setMinDone] = useState(false);
  // `hydrate` 가 **끝났다** — `status` 만 보면 안 된다: `hydrate` 는 「인증됨」으로 먼저
  // 바꾼 뒤에 서버에 온보딩 완료 여부를 묻는다(`syncMe`). 그 답이 0.8초 하한보다 늦으면
  // 아직 모르는 완료 여부(기본값 false)로 판정해 온보딩을 마친 사람을 온보딩으로
  // 보냈다(개발 서버 1초 남짓 · 2026-10-05 실기기)
  const [hydrated, setHydrated] = useState(false);
  const [loaderOpacity] = useState(() => new Animated.Value(0));
  // 다시 물은 횟수 — 실패할 때마다 올라 다음 시도를 건다
  const [retries, setRetries] = useState(0);
  const waiting = minDone && hydrated && status === "authenticated" && completed == null;

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
    // 서버에 못 물어봤다 — 아래 재시도가 답을 받으면 `completed` 가 바뀌어 여기가 다시 돈다
    if (completed == null) return;
    // 온보딩을 마친 사람은 홈으로 — 매번 온보딩을 다시 보게 하지 않는다.
    // 이 값은 `hydrate` 가 서버에 물어 적어둔 것이다(위 주석)
    router.replace(completed ? "/home" : "/welcome");
  }, [minDone, hydrated, status, completed]);

  useEffect(() => {
    if (!waiting) return;
    // 401 이면 `syncMe` 가 세션을 내려 위 효과가 로그인으로 보낸다
    const t = setTimeout(() => {
      void useAuth
        .getState()
        .syncMe()
        .then(() => setRetries((n) => n + 1));
    }, RETRY_MS);
    return () => clearTimeout(t);
  }, [waiting, retries]);

  // 얼굴이 그려진 뒤에 네이티브 스플래시를 내리고 기다림 표시를 띄운다 — 얼굴은 같은 그림이라
  // 바뀌는 순간이 보이지 않는다(워드마크는 `SplashLogo` 가 함께 띄운다)
  const reveal = () => {
    void SplashScreen.hideAsync();
    Animated.timing(loaderOpacity, {
      toValue: 1,
      duration: motion.duration,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View
      style={styles.root}
      accessible
      accessibilityLabel={waiting ? `모멘토리 · ${OFFLINE_LINE}` : "모멘토리 · 준비 중"}
      accessibilityRole="progressbar"
    >
      <SplashLogo onFaceShown={reveal} />
      <Animated.View
        style={[styles.loaderSeat, { opacity: loaderOpacity }]}
        pointerEvents="none"
        testID="splash-waiting"
      >
        <SplashLoader />
        {waiting && (
          <Text variant="body2" color={label.neutral} style={styles.offline}>
            {OFFLINE_LINE}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: background.splash },
  // 로고 묶음(화면 한가운데) 아래 — 묶음을 밀지 않게 흐름 밖에 앉힌다
  loaderSeat: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    marginTop: SPLASH_LOGO_HALF_HEIGHT + LOADER_GAP,
  },
  offline: { marginTop: space.lg },
});
