import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { fill } from "@/design/tokens.mvp";

/**
 * `C7` · 완료 → 홈
 *
 * **확인 한 장 뒤 홈으로 돌아간다.** 완료 화면을 허브로 만들면 회고가 끝나지
 * 않은 것처럼 느껴진다 — 체크 하나, 두 줄, 버튼 하나다(`C7.md`).
 *
 * - **다음 행동 제안을 두지 않는다** — 여기서 쉼터·행동 카드로 보내면 회고 뒤에
 *   할 일이 하나 더 생긴다. 그래서 버튼이 **하나뿐**이다
 * - 본문은 **무엇이 남았는지 사실만** 말한다 — 일기 한 장과 행동 카드 한 장
 * - **점수·연속 일수·배지·축하 연출을 쓰지 않는다**
 * - 돌아가는 곳은 홈(`12`)이다 — **회고를 마쳤다고 홈이 다른 화면이 되지 않는다**
 *
 * 상단에 `‹` 도 `[잠시 쉬기]` 도 두지 않는다 — 되돌아갈 회고가 이미 끝났다.
 * 그래서 `replace` 로 들어오고, 여기서 뒤로 가도 대화로 돌아가지 않는다.
 */
export default function RetroDone() {
  return (
    <ScreenBackground>
      <View style={styles.center}>
        {/* 체크 원 56 — 축하 연출이 아니라 확인 표시다 */}
        <View style={styles.check}>
          <AppText tone="onDark" style={styles.checkMark}>
            ✓
          </AppText>
        </View>

        <View style={styles.copy}>
          <AppText tone="strong" weight="700" style={styles.title}>
            오늘도 잘 담아냈어요
          </AppText>
          <AppText tone="body" style={styles.body}>
            오늘의 일기와 내일 해볼 행동을 함께 남겼어요.
          </AppText>
        </View>
      </View>

      <AppButton label="홈으로 돌아가기" onPress={() => router.replace("/home")} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 20 },
  check: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: fill.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 22, lineHeight: 24 },
  copy: { gap: 10 },
  title: { fontSize: 25, lineHeight: 35, textAlign: "center" },
  body: {
    fontSize: 14.5,
    lineHeight: 25.4,
    textAlign: "center",
    color: theme.colors.semantic.textBody,
  },
});
