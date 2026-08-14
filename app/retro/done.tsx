import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { RetroButton } from "@/components/chat/RetroButton";
import { RetroScene } from "@/components/chat/RetroScene";
import { CheckCircleIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { paperColors, paperTypography } from "@/design/paper";

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
 *
 * 체크는 **글리프가 아니라 선 아이콘**이다(`CheckCircleIcon`) — 문자 `✓` 는
 * 기기마다 굵기가 튀고 이모지 폰트로 대체되기도 한다(`RULES.md` 「아이콘」).
 */
export default function RetroDone() {
  return (
    <ScreenBackground variant="paperFlat">
      <RetroScene />

      <View style={styles.center}>
        {/* 체크 원 56 — 축하 연출이 아니라 확인 표시다 */}
        <CheckCircleIcon size={56} color={paperColors.brand.greenDark} />

        <View style={styles.copy}>
          <AppText weight="700" style={styles.title}>
            오늘도 잘 담아냈어요
          </AppText>
          <AppText style={styles.body}>오늘의 일기와 내일 해볼 행동을 함께 남겼어요.</AppText>
        </View>
      </View>

      <RetroButton label="홈으로 돌아가기" onPress={() => router.replace("/home")} />
    </ScreenBackground>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 20 },
  copy: { gap: 10 },
  title: {
    fontSize: type.screenTitle.fontSize,
    lineHeight: type.screenTitle.lineHeight + 3,
    textAlign: "center",
    color: paperColors.text.primary,
  },
  // 언덕 위에 내려앉을 수 있는 줄이라 잉크 톤을 유지한다 (`muted` 는 AA 미달)
  body: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight + 3,
    textAlign: "center",
    color: paperColors.text.greenStrong,
  },
});
