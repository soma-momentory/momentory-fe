import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { RetroButton } from "@/components/chat/RetroButton";
import { RetroScene } from "@/components/chat/RetroScene";
import { RetroNav } from "@/components/common/RetroNav";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { paperColors, paperTypography } from "@/design/paper";
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
 *
 * 새 디자인(`PLAN.md` D2 — 시각만): 종이 배경 + 언덕 + 카피바라(`RetroScene`).
 * **옛 바바 얼굴 원(`assets/baba/face-joy.png`)은 뺐다** — 캐릭터가 카피바라로
 * 바뀌었고, 그 카피바라는 이제 화면 전체의 배경 층이라 얼굴을 한 번 더 얹으면
 * 같은 캐릭터가 두 번 나온다.
 */
export default function RetroIntro() {
  const schedules = useDay((s) => s.schedules);
  const moments = useDay((s) => s.moments);

  const shown = visibleSchedules(schedules);
  // 감정 기록은 「일정에 달린 감정의 총 개수」다 — 감정을 남긴 줄의 수가 아니다
  const emotionCount = shown.reduce((n, s) => n + s.emotions.length, 0);

  return (
    <ScreenBackground variant="paperFlat">
      <RetroScene />
      <RetroNav variant="paper" />

      <View style={styles.center}>
        <View style={styles.copy}>
          <AppText weight="700" style={styles.title}>
            오늘도 함께{"\n"}기억을 정리해볼까요?
          </AppText>
          <AppText style={styles.body}>
            천천히 떠올라도 괜찮아요.{"\n"}작은 기억 하나면 충분해요.
          </AppText>
        </View>

        {/* 재료 카드 — 카드지만 톤 면이다. 시작 전 화면에 카드 위계를 얹지 않는다 */}
        <Card variant="paperSoft" style={styles.material}>
          <AppText style={styles.materialLabel}>오늘 바바가 기억해둔 것</AppText>
          <AppText weight="700" style={styles.materialValue}>
            {`일정 ${shown.length}개 · 순간 ${moments.length}개 · 감정 기록 ${emotionCount}개`}
          </AppText>
        </Card>
      </View>

      <RetroButton label="시작하기" onPress={() => router.push("/retro/confirm")} />
    </ScreenBackground>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: 24 },
  copy: { gap: 12 },
  title: {
    fontSize: type.screenTitle.fontSize,
    lineHeight: type.screenTitle.lineHeight + 4,
    color: paperColors.text.primary,
  },
  // 언덕(`bg/hill`) 위로 내려앉을 수 있는 글이라 잉크 톤으로 둔다 — `muted` 는
  // 종이 위 2.9 · 언덕 위 1.9 로 둘 다 AA 미달이다(`paper.ts`)
  body: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight + 3,
    color: paperColors.text.greenStrong,
  },
  // 카드 안쪽 간격 7 — 라벨과 값이 한 덩어리로 읽힌다
  material: { gap: 7, marginBottom: theme.layout.gap.section },
  materialLabel: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },
  materialValue: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },
});
