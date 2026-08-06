import { router } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

import { RetroNav } from "@/components/common/RetroNav";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { useDay, visibleSchedules } from "@/features/home/model/day";

/**
 * `C1` · 회고 인트로
 *
 * **시작 전에 재료를 먼저 보여준다.** "오늘 무슨 일 있었죠?"로 열면 사용자가
 * 기억을 꺼내는 일부터 해야 한다. 바바가 이미 기억해둔 것을 한 줄로 보여주면
 * 회고는 **떠올리기가 아니라 고르기**가 된다(`C1.md`).
 *
 * - 재료 카드의 숫자는 **오늘 실제로 담긴 것**이다 — `12`·`C2` 와 같은 값을
 *   본다. 그래서 하드코딩하지 않고 같은 store 에서 센다
 * - **몇 분 걸린다고 말하지 않는다** — 대화 길이는 사용자가 정한다
 * - **진행률·단계 번호를 노출하지 않는다**
 */
export default function RetroIntro() {
  const schedules = useDay((s) => s.schedules);
  const moments = useDay((s) => s.moments);

  const shown = visibleSchedules(schedules);
  // 감정 기록은 「일정에 달린 감정의 총 개수」다 — 감정을 남긴 줄의 수가 아니다
  const emotionCount = shown.reduce((n, s) => n + s.emotions.length, 0);

  return (
    <ScreenBackground>
      <RetroNav />

      <View style={styles.center}>
        <Image
          source={require("../../assets/baba/face-joy.png")}
          style={styles.baba}
          resizeMode="contain"
        />

        <View style={styles.copy}>
          <AppText tone="strong" weight="700" style={styles.title}>
            오늘도 함께{"\n"}기억을 정리해볼까요?
          </AppText>
          <AppText tone="body" style={styles.body}>
            천천히 떠올라도 괜찮아요.{"\n"}작은 기억 하나면 충분해요.
          </AppText>
        </View>

        {/* 재료 카드 — 카드지만 톤 면이다. 시작 전 화면에 카드 위계를 얹지 않는다 */}
        <Card style={styles.material}>
          <AppText variant="caption" tone="caption">
            오늘 바바가 기억해둔 것
          </AppText>
          <AppText tone="strong" weight="500" style={styles.materialValue}>
            {`일정 ${shown.length}개 · 순간 ${moments.length}개 · 감정 기록 ${emotionCount}개`}
          </AppText>
        </Card>
      </View>

      <AppButton label="시작하기" onPress={() => router.push("/retro/confirm")} />
    </ScreenBackground>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: 24 },
  baba: { width: 96, height: 96, borderRadius: 48 },
  copy: { gap: 12 },
  title: { fontSize: 26, lineHeight: 36.4 },
  body: { fontSize: 15, lineHeight: 27 },
  // 카드 안쪽 간격 7 — 라벨과 값이 한 덩어리로 읽힌다
  material: { gap: 7, backgroundColor: semantic.surfaceTone, borderColor: "transparent" },
  materialValue: { fontSize: 13.5, lineHeight: 21.6 },
});
