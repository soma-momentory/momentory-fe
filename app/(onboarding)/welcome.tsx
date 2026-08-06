import { router } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";

/**
 * `03` · 환영 (온보딩 0/6)
 *
 * **질문 전에 누가 묻는지 먼저 밝힌다.** 바바(136)가 자기를 밝히고 몇 가지만
 * 묻겠다고 예고한 뒤 시작한다.
 *
 * - **앱 이름과 캐릭터를 분리한다** — "모멘토리예요"가 아니라 "모멘토리의
 *   바바예요"(`03.md`). 앱이 말을 거는 것과 캐릭터가 말을 거는 것은 다른 약속이다
 * - **진행점을 두지 않는다** — 아직 질문이 시작되지 않았다. 점은 `04` 부터
 * - **초 단위로 재촉하지 않는다** — "30초면 끝나요"가 아니라 "금방 끝나요".
 *   숫자를 적으면 그 숫자가 지켜지지 않을 때 신뢰가 깎인다(`03.md`)
 * - "마이에서 언제든 바꿀 수 있어요"는 **약속**이다 — 여섯 항목 전부가
 *   마이에 편집 경로를 가져야 한다(`M1`·`M2`·`M3`)
 */
export default function Welcome() {
  return (
    <ScreenBackground>
      <View style={styles.center}>
        <Image
          source={require("../../assets/baba/sitting-greeting.png")}
          style={styles.baba}
          resizeMode="contain"
        />

        <View style={styles.copy}>
          <AppText variant="title" tone="strong" weight="700" style={styles.center1}>
            안녕하세요.
          </AppText>
          <AppText style={styles.body}>
            저는 앞으로 당신과 하루를 함께 돌아볼 모멘토리의 바바예요. 몇 가지 질문으로 당신에게
            맞는 공간을 준비할게요.
          </AppText>
        </View>

        <AppText variant="caption" tone="legal" style={styles.center1}>
          금방 끝나요 · 답변은 마이에서 언제든 바꿀 수 있어요
        </AppText>
      </View>

      <AppButton label="시작하기" onPress={() => router.push("/nickname")} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 22 },
  baba: { width: 136, height: 136 },
  copy: { alignItems: "center", gap: 12 },
  center1: { textAlign: "center" },
  // 제목 23 bold · 본문 15/1.8 폭 290 — 시안 값. typography 에 없는 조합이다.
  body: {
    width: 290,
    fontSize: 15,
    lineHeight: 27,
    textAlign: "center",
    color: theme.colors.semantic.textBody,
  },
});
