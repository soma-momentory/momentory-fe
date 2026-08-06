import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { InputRow } from "@/components/primitives/InputRow";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";

/**
 * `04` · 닉네임 (온보딩 1/6 · 필수)
 *
 * **대화 틀로 묻는다** — 폼 라벨이 아니라 말풍선 두 개로 질문과 이유를 나눈다.
 * 첫 줄은 무엇을 묻는지, 둘째 줄은 왜 묻는지.
 *
 * - **중복 검사를 하지 않는다.** 닉네임은 식별자가 아니라 부르는 말이라
 *   "이미 사용 중" 이라는 실패를 만들 이유가 없다
 * - 입력 전에도 버튼을 **사라지게 하지 않는다** — 비활성(0.36)으로 남겨
 *   다음에 무엇이 오는지 보이게 한다
 * - **뒤로가 없다.** 첫 질문이라 돌아갈 곳이 없다 — 자리는 예약한다
 */
export default function Nickname() {
  const [name, setName] = useState("");
  const ready = name.trim().length > 0;

  return (
    <ScreenBackground>
      <OnboardingTopBar step={0} />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ChatLayout>
          <Avatar />
          <BabaBubble index={0}>어떻게 불러드리면 좋을까요?</BabaBubble>
          <BabaBubble index={1}>
            당신의 이야기를 편안하게 나눌 수 있도록, 좋아하는 이름을 알려주세요.
          </BabaBubble>
        </ChatLayout>

        <View style={styles.bottom}>
          <InputRow
            value={name}
            onChangeText={setName}
            placeholder="실명도, 별명도 괜찮아요"
            returnKeyType="done"
            onSubmitEditing={() => ready && goNext()}
          />

          {/* 안내 두 줄 — 실패를 만들지 않겠다는 약속이라 입력 전에 미리 말한다 */}
          <View style={styles.hints}>
            <AppText variant="footnote" tone="legal">
              같은 닉네임을 쓰는 분이 있어도 괜찮아요.
            </AppText>
            <AppText variant="footnote" tone="legal">
              마이에서 언제든 바꿀 수 있어요.
            </AppText>
          </View>

          <AppButton label="이렇게 불러주세요" disabled={!ready} onPress={goNext} />
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const goNext = () => router.push("/profile");

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // 입력 → 안내 → 버튼. 시안 간격 11 / 11
  bottom: { gap: 11 },
  hints: { gap: 3 },
});
