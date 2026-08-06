import { router } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";

/**
 * `03` · 환영 (온보딩 0/6)
 *
 * **질문 전에 누가 묻는지 먼저 밝힌다.** 바바를 크게(196) 보여주고 무엇을 할지와
 * 얼마나 걸리는지를 말한 뒤 시작한다.
 *
 * - **진행점을 두지 않는다** — 아직 질문이 시작되지 않았다. 점은 `04` 부터
 * - **질문 개수를 숫자로 말하지 않는다**("6개 질문"). 남은 분량을 세게 만들고 그건 재촉이다
 * - "30초면 끝나요 · 언제든 바꿀 수 있어요" — **되돌릴 수 있다는 말**이 있어야
 *   답을 고민 없이 넘길 수 있다
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
            저는 앞으로 당신과 하루를 함께 돌아볼 모멘토리예요. 몇 가지 질문만 하면 당신에게 맞는
            공간을 준비할게요.
          </AppText>
        </View>

        <AppText variant="caption" tone="legal" style={styles.center1}>
          30초면 끝나요 · 언제든 바꿀 수 있어요
        </AppText>
      </View>

      <AppButton label="시작하기" onPress={() => router.push("/nickname")} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 22 },
  baba: { width: 196, height: 196 },
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
