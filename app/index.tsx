import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { AppText } from "@/components/primitives/AppText";
import { useReduceMotion } from "@/components/primitives/AppButton";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { babaShadow } from "@/design/tokens.mvp";
import { useAuth } from "@/features/auth/model/auth";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";

/**
 * `S0` · 스플래시 = `entry` 상태 기계의 `route` 판정 자리.
 *
 * **첫 화면은 아무것도 묻지 않는다.** 바바 하나와 워드마크, 문장 하나(`S0.md`).
 * 로딩을 숨기려고 진행 바를 그리면 기다림이 더 길게 느껴진다 — 광원과 호흡으로
 * "살아 있다"만 전한다.
 *
 * - **워드마크도 Pretendard 하나** — 서체를 늘리는 대신 크기(34)와 자간(.055em)으로
 *   위계를 만든다. 자간은 .145 → **.055em**(2026-08-06) — 넓은 자간이 낱글자로 읽혔다
 * - **연결선·먼지 없음** — 선이 워드마크와 슬로건을 갈라놨다. 여백 26 으로 대신한다
 * - 그림자는 **92×8 / 24% 를 발밑에** — 크면 캐릭터가 떠 보인다
 * - 모션은 `breathe`(scale 1→1.015 · 4.6s) · `glowPulse`(5.6s). **Reduce Motion
 *   에서 전부 정지**한다
 * - **최소 0.8초**를 보장하고 준비되면 즉시 넘어간다. 진행 바·퍼센트 없음.
 *   1.5초 지연 상태(`S0-b`)는 MVP 범위 밖이다
 * - **`max(0.8s, 준비완료)`** — 그 사이 SecureStore 세션을 비동기로 복원한다
 *   (`hydrating` 동안 보이는 것이 곧 S0 다, §3). 판정 셋:
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
const BABA = 147;
const GLOW = 176;

export default function Splash() {
  const reduceMotion = useReduceMotion();
  const status = useAuth((s) => s.status);
  const completed = useOnboardingCompletion((s) => s.completed);
  const [minDone, setMinDone] = useState(false);
  const [breathe] = useState(() => new Animated.Value(1));
  const [glow] = useState(() => new Animated.Value(0.62));

  useEffect(() => {
    void useAuth.getState().hydrate();
    const t = setTimeout(() => setMinDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // 0.8초 하한과 hydration 둘 다 끝나야 넘어간다 — 먼저 끝난 쪽이 기다린다
    if (!minDone || status === "hydrating") return;
    if (status !== "authenticated") {
      router.replace("/login");
      return;
    }
    // 온보딩을 마친 사람은 홈으로 — 매번 온보딩을 다시 보게 하지 않는다.
    // 이 값은 `hydrate` 가 서버에 물어 적어둔 것이다(위 주석).
    router.replace(completed ? "/home" : "/welcome");
  }, [minDone, status, completed]);

  useEffect(() => {
    if (reduceMotion) {
      breathe.setValue(1);
      glow.setValue(0.62);
      return;
    }
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.015, duration: 2300, useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 1, duration: 2300, useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 0.4, duration: 2800, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.62, duration: 2800, useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduceMotion, breathe, glow]);

  return (
    <ScreenBackground variant="entry">
      <View style={styles.center}>
        <View style={styles.stage}>
          {/* 광원 176 / .62 — 바바 뒤에서 숨 쉬는 빛 */}
          <Animated.View style={[styles.glow, { opacity: glow }]} pointerEvents="none">
            <Svg width={GLOW} height={GLOW}>
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={white} stopOpacity="1" />
                  <Stop offset="100%" stopColor={white} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#glow)" />
            </Svg>
          </Animated.View>

          {/* 발밑 그림자 92×8 / 24% — 캐릭터가 뜨지 않게 발에 붙인다 */}
          <Svg width={92} height={8} style={styles.shadow} pointerEvents="none">
            <Ellipse
              cx={46}
              cy={4}
              rx={46}
              ry={4}
              fill={babaShadow.color}
              opacity={babaShadow.opacity}
            />
          </Svg>

          <Animated.Image
            source={require("../assets/baba/sitting-greeting.png")}
            style={[styles.baba, { transform: [{ scale: breathe }] }]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.wordmarkBlock}>
          <AppText tone="strong" style={styles.wordmark}>
            모멘토리
          </AppText>
          <AppText style={styles.slogan}>오늘도 잠시 쉬어가도 괜찮아요.</AppText>
        </View>
      </View>
    </ScreenBackground>
  );
}

const { semantic } = theme.colors;
const white = theme.colors.palette.white;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 30 },
  stage: { width: GLOW, height: BABA + 10, alignItems: "center", justifyContent: "flex-end" },
  glow: {
    position: "absolute",
    // 광원 중심을 바바 몸통(높이의 46%)에 맞춘다 (9-mvp.mjs)
    top: (BABA + 10) * 0.46 - GLOW / 2,
    alignSelf: "center",
  },
  shadow: { position: "absolute", bottom: 0 },
  baba: { width: BABA, height: BABA },
  // 워드마크 ↔ 슬로건 여백 26 — 연결선을 두지 않는다 (S0.md)
  wordmarkBlock: { alignItems: "center", gap: 26 },
  // 34 · 자간 .055em (= 34 × 0.055 ≈ 1.87) · Pretendard 하나로
  wordmark: {
    fontFamily: "Pretendard-Regular",
    fontSize: 34,
    lineHeight: 39.4,
    letterSpacing: 1.87,
  },
  slogan: { fontSize: 13.5, lineHeight: 21.6, color: semantic.textBody },
});
