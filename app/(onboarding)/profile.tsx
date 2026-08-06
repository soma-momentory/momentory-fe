import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChipFlow } from "@/components/chat/ChipFlow";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { InputRow } from "@/components/primitives/InputRow";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { useDraft, type Gender } from "@/features/onboarding/model/draft";

/**
 * `05-b` · 나이 · 성별 (온보딩 2/6 · **선택**)
 *
 * **선택 질문이라는 것을 라벨 옆 태그로 밝힌다.** 나이·성별은 말 거는 방식에만
 * 쓰이므로 비워도 `[다음]` 이 열린다 — 그래서 버튼에 `disabled` 가 없다.
 *
 * **비워둔 것과 「선택 안 함」을 구별한다.** 둘 다 답이지만 뜻이 다르다 —
 * 앞은 묻지 않기를 고른 것이고, 뒤는 해당 없음을 고른 것이다. 그래서 `gender` 는
 * `null`(미선택)과 `"none"`(선택 안 함)을 따로 들고 간다.
 *
 * ⚠ MVP 스펙은 **「입력 후」 상태만** 갖는다(원본 `05` 입력 전은 잘렸다).
 * 나이는 시안의 값 칩(104×44 · 지우기 ×) 대신 **`InputRow` 로 받는다** — 빈 상태를
 * 추측으로 그리지 않기 위한 결정이다. 값이 든 뒤의 칩 모양은 상류 확인 후에 붙인다.
 * 나이 placeholder 도 스펙에 없어 **비워 둔다** — 문안을 지어내지 않는다.
 */
const GENDERS: readonly { id: Gender; label: string }[] = [
  { id: "male", label: "남성" },
  { id: "female", label: "여성" },
  { id: "none", label: "선택 안 함" },
];

export default function Profile() {
  const age = useDraft((s) => s.age);
  const gender = useDraft((s) => s.gender);
  const set = useDraft((s) => s.set);

  return (
    <ScreenBackground>
      <OnboardingTopBar step={1} onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ChatLayout>
          <Avatar />
          <BabaBubble index={0}>몇 가지 기본 정보를 알려주세요.</BabaBubble>
          <BabaBubble index={1}>
            더 잘 맞는 질문을 위한 정보예요. 원하지 않는 항목은 선택하지 않아도 괜찮아요.
          </BabaBubble>
        </ChatLayout>

        <View style={styles.bottom}>
          <View style={styles.field}>
            <FieldLabel>나이</FieldLabel>
            <InputRow
              value={age}
              onChangeText={(v) => set("age", v)}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <View style={styles.field}>
            <FieldLabel>성별</FieldLabel>
            <ChipFlow
              items={GENDERS}
              selected={gender == null ? [] : [gender]}
              // 같은 것을 다시 누르면 미선택으로 되돌린다 — 고른 뒤 무를 길이 있어야 한다
              onToggle={(id) => set("gender", gender === id ? null : (id as Gender))}
            />
          </View>

          <AppText variant="caption" tone="caption">
            말을 거는 방식에만 활용되며, 다른 사람에게 보여지지 않아요.
          </AppText>

          {/* 선택 질문이라 비워도 열린다 — disabled 를 두지 않는다 */}
          <AppButton label="다음" onPress={goNext} />
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

/** `.sech` 라벨 + `.badge` 「선택」 태그. 선택 질문임을 라벨 옆에서 밝힌다 */
function FieldLabel({ children }: { children: string }) {
  return (
    <View style={styles.labelRow}>
      <AppText style={styles.label}>{children}</AppText>
      <View style={styles.badge}>
        <AppText tone="accent" style={styles.badgeText}>
          선택
        </AppText>
      </View>
    </View>
  );
}

const goNext = () => router.push("/interests");

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: { gap: 14 },
  // .col9 — 라벨과 입력 사이 9
  field: { gap: 9 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  // .sech{font:600 11.5px/1;letter-spacing:.04em;color:var(--textCaption)}
  label: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 11.5,
    lineHeight: 11.5,
    letterSpacing: 0.46,
    color: semantic.textSlogan,
  },
  // .badge{font:600 11px/1;color:var(--textAccent);background:#F6E7DA;padding:5px 8px;radius:6px}
  badge: {
    backgroundColor: semantic.accentWash,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
  },
  badgeText: { fontFamily: "Pretendard-SemiBold", fontSize: 11, lineHeight: 11 },
});
