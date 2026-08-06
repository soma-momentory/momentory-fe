import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { InputRow } from "@/components/primitives/InputRow";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";

/**
 * `08` · 회고 시간 (온보딩 4/6 · 필수)
 *
 * **알림을 켜달라고 하지 않고, 언제 찾아갈지를 묻는다.** 같은 권한 요청이지만
 * 프레임이 다르다 — "알림 허용" 은 앱의 요구이고 "편한 시간" 은 사용자의 선택이다.
 * `[알림 없이 쓸게요]` 를 **같은 화면에** 두어 거절이 막다른 길이 아니게 한다.
 *
 * - `[알림 없이 쓸게요]` 를 골라도 **회고 시각은 저장된다** — 알림만 끄고,
 *   홈의 「밤 9:30엔 제가 먼저 말 걸어요」 문구는 시각을 계속 쓴다
 * - 저장 직후 **OS 알림 권한 다이얼로그**가 뜬다. 커스텀 다이얼로그를 만들지
 *   않는다 — OS 가 그리는 화면(`P*`)은 MVP 에 없다. 지금은 권한 API 를 붙이지
 *   않으므로 그 자리만 비워 둔다
 *
 * ⚠ **시간 선택 모달(`08-b`)은 MVP 범위 밖이다.** 그래서 이 화면의 시간 칸은
 * 아직 아무것도 열지 않는다. `[다음]` 은 시안에서도 **비활성이 아니다** — 고르지
 * 않아도 넘어간다.
 */
export default function RetroTime() {
  return (
    <ScreenBackground>
      <OnboardingTopBar step={3} onBack={() => router.back()} />

      <ChatLayout>
        <Avatar />
        <BabaBubble index={0}>마지막으로, 하루를 언제 돌아보면 가장 편안할까요?</BabaBubble>
        <BabaBubble index={1}>
          바쁜 하루 속에서도 부담 없이 기록할 수 있도록, 당신이 편한 시간에 찾아갈게요.
        </BabaBubble>
      </ChatLayout>

      <View style={styles.bottom}>
        {/*
          MVP 가 가진 상태는 「선택 전」 하나뿐이라 placeholder 를 그대로 보인다.
          선택은 08-b 가 하는데 범위 밖이라 아직 열지 않는다.

          **고르지 않아도 시각은 정해져 있다** — 초안이 스키마 기본값 21:30 을 들고
          있고 `10` 이 "밤 9:30" 으로 되돌려준다. 그래서 비어 보여도 다음 화면이
          할 말을 잃지 않는다.

          editable={false} — 키보드로 아무 문자열이나 받으면 시각이 아닌 값이
          초안에 들어가고 09·10 에서 걸러낼 방법이 없다.
        */}
        <View style={styles.timeRow}>
          <InputRow value="" placeholder="시간 선택" editable={false} />
          <AppText variant="caption" tone="caption" style={styles.caret}>
            ▾
          </AppText>
        </View>

        <AppText variant="caption" tone="legal" style={styles.hint}>
          탭하면 시간을 고를 수 있어요
        </AppText>

        {/* 고르지 않아도 넘어간다 — 시안의 [다음] 도 비활성이 아니다 */}
        <AppButton label="다음" onPress={goNext} />

        {/* 거절을 같은 화면에 둔다. 골라도 회고 시각은 저장된다 */}
        <AppButton label="알림 없이 쓸게요" variant="quiet" onPress={goNext} />
      </View>
    </ScreenBackground>
  );
}

const goNext = () => router.push("/calendar");

const styles = StyleSheet.create({
  bottom: { gap: 11 },
  timeRow: { justifyContent: "center" },
  // ▾ 는 입력 칸 안 오른쪽에 얹는다. 칸 자체가 아직 눌리지 않으므로 장식이다
  caret: { position: "absolute", right: 20 },
  hint: { textAlign: "center" },
});
