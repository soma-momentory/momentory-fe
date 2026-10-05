import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Screen, Spinner, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

/**
 * `S0` · 스플래시 = `entry` 상태 기계의 `route` 판정 자리.
 *
 * ## 로그인과 같은 화면에서 버튼만 뺀 것이다 (2026-08-20)
 *
 * 새 시안에 `S0` 프레임이 **없다**(결정 N4). 없는 것을 지어내는 대신 **바로 다음에
 * 올 화면(`S1` 로그인)과 같은 자리에 같은 것**을 두고, 아직 정하지 못한 것(로그인
 * 수단)만 비웠다. 그 자리에 기다림 표시가 앉는다.
 *
 * 그래서 `S0` → `S1` 이 **깜빡이지 않는다** — 워드마크와 태그라인이 같은 자리에
 * 있고 아래만 버튼으로 바뀐다. 옛 화면은 캐릭터 · 광원 · 호흡 애니메이션 · 발밑
 * 그림자를 그렸는데, 반입 패키지가 캐릭터를 전부 뺐고(N8) **마지막 캐릭터 자산이
 * 여기 있었다**.
 *
 * - **아무것도 묻지 않는다** — 워드마크 · 태그라인 · 기다림 하나
 * - **진행률·퍼센트를 두지 않는다** — 얼마나 걸리는지 모르는 일에 숫자를 붙이면
 *   그 숫자가 틀렸을 때 신뢰가 깎인다(`Spinner` 머리말 · `RULES.md` 4)
 * - **최소 0.8초**를 보장하고 준비되면 즉시 넘어간다. 1.5초 지연 상태(`S0-b`)는
 *   MVP 범위 밖이다
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

export default function Splash() {
  const status = useAuth((s) => s.status);
  const completed = useOnboardingCompletion((s) => s.completed);
  const [minDone, setMinDone] = useState(false);
  // `hydrate` 가 **끝났다** — `status` 만 보면 안 된다: `hydrate` 는 「인증됨」으로 먼저
  // 바꾼 뒤에 서버에 온보딩 완료 여부를 묻는다(`syncMe`). 그 답이 0.8초 하한보다 늦으면
  // 아직 모르는 완료 여부(기본값 false)로 판정해 온보딩을 마친 사람을 온보딩으로
  // 보냈다(개발 서버 1초 남짓 · 2026-10-05 실기기)
  const [hydrated, setHydrated] = useState(false);

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

  return (
    <Screen>
      {/* 로그인과 **같은 블록**이다 — 자리·간격·아래 96 까지(`login.tsx` `hero`) */}
      <View style={styles.hero}>
        <Text variant="wordmarkHand" color={labelColor.strong}>
          모멘토리
        </Text>
        <Text variant="body2Reading" color={labelColor.neutral}>
          오늘을 돌아보고, 내일을 조금 다르게.
        </Text>
      </View>

      {/* 로그인이라면 소셜 3종이 서는 자리 — 아직 무엇을 누를지 정하기 전이다 */}
      <View style={styles.waiting} accessibilityLabel="준비 중" accessibilityRole="progressbar">
        <Spinner />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    // 광학 중앙 — 로그인과 같은 값이라야 두 화면이 이어질 때 흔들리지 않는다
    paddingBottom: 96,
  },
  /**
   * 소셜 3종(48×3 + 간격 10×2 = 164)이 서던 자리를 그대로 비워 둔다 —
   * 높이를 맞춰 두면 `S1` 로 넘어갈 때 워드마크가 위아래로 튀지 않는다.
   */
  waiting: { height: 164, alignItems: "center", justifyContent: "center" },
});
