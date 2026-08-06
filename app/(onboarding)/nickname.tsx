import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { InputRow } from "@/components/primitives/InputRow";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { useDraft } from "@/features/onboarding/model/draft";

/**
 * `04` · 닉네임 (온보딩 1/6 · 필수)
 *
 * **대화 틀로 묻는다** — 폼 라벨이 아니라 말풍선 두 개로 질문과 이유를 나눈다.
 * 첫 줄은 무엇을 묻는지, 둘째 줄은 왜 묻는지.
 *
 * - **1~10자.** 11자부터는 더 입력되지 않고 **오류 문구 없이 카운터 색만**
 *   바뀐다(`04.md`) — 막힌 이유는 글자 수 표시가 이미 말하고 있다
 * - **중복 검사를 하지 않는다.** 닉네임은 식별자가 아니라 부르는 말이라
 *   "이미 사용 중" 이라는 실패를 만들 이유가 없다
 * - **금지어는 바바 · 모멘토리 둘뿐**이고 이때만 한 줄이 붙는다(`04.md`)
 * - **앞뒤 공백은 저장할 때 잘라낸다** — 입력 중에는 그대로 두고 다음으로
 *   넘어가는 순간 trim 한 값이 초안에 남는다
 * - 입력 전에도 버튼을 **사라지게 하지 않는다** — 비활성(0.36)으로 남겨
 *   다음에 무엇이 오는지 보이게 한다
 * - **뒤로가 없다.** 첫 질문이라 돌아갈 곳이 없다 — 자리는 예약한다
 */
const MAX_NICKNAME = 10;
const FORBIDDEN = ["바바", "모멘토리"];

export default function Nickname() {
  // 화면 로컬 state 로 두면 다음 화면으로 넘어가는 순간 사라진다 — 초안에 쌓는다
  const name = useDraft((s) => s.nickname);
  const set = useDraft((s) => s.set);
  const trimmed = name.trim();
  const forbidden = FORBIDDEN.includes(trimmed);
  const ready = trimmed.length > 0 && !forbidden;

  const goNext = () => {
    // 앞뒤 공백은 저장할 때 잘라낸다 (04.md)
    set("nickname", trimmed);
    router.push("/profile");
  };

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
            편하게 불리고 싶은 이름을 알려주세요.{"\n"}실명도, 별명도 괜찮아요.
          </BabaBubble>
        </ChatLayout>

        <View style={styles.bottom}>
          <InputRow
            value={name}
            onChangeText={(v) => set("nickname", v)}
            placeholder="이름 또는 별명"
            maxLength={MAX_NICKNAME}
            showCounter
            returnKeyType="done"
            onSubmitEditing={() => ready && goNext()}
          />

          {/* 금지어일 때만 붙는 한 줄 (04.md). 모달·경고 아이콘을 만들지 않는다.
              ⚠ 문안은 스펙에 없어 지었다 — 상류가 정하면 그걸로 바꾼다 */}
          {forbidden ? (
            <AppText variant="footnote" tone="accent">
              바바와 모멘토리는 이미 있는 이름이에요. 다른 이름을 알려주세요.
            </AppText>
          ) : null}

          {/* 안내 두 줄 — 실패를 만들지 않겠다는 약속이라 입력 전에 미리 말한다 */}
          <View style={styles.hints}>
            <AppText variant="footnote" tone="legal">
              같은 이름을 사용하는 분이 있어도 괜찮아요.
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

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // 입력 → 안내 → 버튼. 시안 간격 11 / 11
  bottom: { gap: 11 },
  hints: { gap: 3 },
});
