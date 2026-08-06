import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { useDraft } from "@/features/onboarding/model/draft";

/**
 * `09` · 캘린더 (온보딩 6/6 · 선택)
 *
 * **권한을 묻기 전에 무엇에 쓰는지 먼저 말한다.** 시스템 다이얼로그는
 * "허용/거부"만 물어서, 그 앞에 이유가 없으면 대부분 거부로 끝난다(`09.md`).
 *
 * - **안내는 실제 처리와 같은 말이어야 한다.** 일정 제목은 `Schedule` 로
 *   **저장되므로** "저장하지 않아요"라고 쓸 수 없다 — 이전 문구("일정 제목만
 *   참고하며, 내용은 저장하거나 공유하지 않아요")는 사실과 달라 **폐기됐다**
 * - **시간을 읽지 않는다** — `Schedule.time` 은 MVP 에서 항상 `null`.
 *   그래서 안내에도 "시간"을 넣지 않는다
 * - **실패해도 진행한다.** 연결 실패가 온보딩을 막지 않는다 — 마이에서 다시
 *   시도한다. 두 버튼이 같은 곳으로 가되, `[나중에 할게요]` 로 건너뛰면
 *   완료 화면이 **`10-b`**(카드에 안내 한 줄)가 된다
 * - `[나중에 할게요]` 는 `quiet` 로 두되 **숨기지 않는다.** 거절 경로가 보이지
 *   않으면 허용이 강요가 된다
 *
 * ⚠ 실제 권한 요청은 OS 다이얼로그가 그린다(`expo-calendar`, M2 도입 예정).
 * 지금은 붙이지 않으므로 **연결했다고 표시만** 하고 넘어간다.
 */
export default function CalendarLink() {
  const set = useDraft((s) => s.set);

  const link = () => {
    // TODO expo-calendar — OS 권한 다이얼로그. 커스텀 화면을 만들지 않는다(RULES)
    set("calendarLinked", true);
    router.push("/done");
  };

  const later = () => {
    set("calendarLinked", false);
    router.push("/done");
  };

  return (
    <ScreenBackground>
      <OnboardingTopBar step={5} onBack={() => router.back()} />

      <ChatLayout>
        <Avatar />
        <BabaBubble index={0}>마지막으로 하나만 더 부탁드릴게요.</BabaBubble>
        <BabaBubble index={1}>
          오늘 있었던 일을 더 쉽게 떠올릴 수 있도록 캘린더를 연결해볼까요?
        </BabaBubble>
      </ChatLayout>

      <View style={styles.bottom}>
        {/* 무엇을 어디까지 가져가는지를 못박는 카드. 버튼보다 먼저 읽히는 자리다 */}
        <Card>
          <AppText variant="caption" style={styles.notice}>
            일정 제목을 모멘토리에 저장해 회고 질문을 만드는 데 사용해요. 캘린더 원본은 수정하지
            않고, 다른 사람에게 공유하지 않아요.
          </AppText>
        </Card>

        <AppButton label="캘린더 연결하기" onPress={link} />
        <AppButton label="나중에 할게요" variant="quiet" onPress={later} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  bottom: { gap: 11 },
  // css 12.5/1.6 — body 톤. 카드 안에서 읽히는 문장이라 caption 색이 아니다
  notice: { lineHeight: 20 },
});
