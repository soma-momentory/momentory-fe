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
import { useDraft } from "@/features/onboarding/model/draft";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `05-b` · 나이 · 성별 (온보딩 2/6 · **선택**)
 *
 * **선택 항목이라는 것을 배지로 먼저 말한다.** 배지는 "선택"이 아니라
 * **"선택사항"** — "선택"은 "고르라"는 뜻으로도 읽힌다(`05-b.md`).
 * 나이·성별은 질문을 조금 더 잘 맞추는 데만 쓰이므로 비워도 넘어갈 수 있다.
 *
 * - **미선택으로 넘어가면 CTA 라벨이 `[건너뛰기]`** 가 된다 — 같은 자리에서
 *   같은 동작을 하되 무엇을 하는지 말이 달라진다(`05-b.md`)
 * - **값이 들어간 나이에는 지우기 × 가 붙는다**(시각 19 · 히트 44) —
 *   선택을 되돌릴 길이 없으면 선택이 아니다
 * - **비워둔 것과 「선택 안 함」을 구별한다.** 앞은 묻지 않기를 고른 것이고,
 *   뒤는 해당 없음을 고른 것이다 — `gender` 는 `null` 과 `UNSPECIFIED_GENDER`
 *   를 따로 든다
 *
 * ⚠ 스펙은 「입력 후」 상태(값 칩 104×44)만 그린다 — **입력 전 모양이 없어**
 * 나이는 입력줄(`.tfield`)로 받고, 스펙의 핵심인 지우기 × 를 값이 있을 때
 * 붙인다. 값 칩 형태로 바꿀지는 상류 확인 후보다(`TASKS.md`).
 *
 * **성별 칩은 서버가 준다**(`model/options.ts`). 못 받았으면 대역으로 그린다.
 */
export default function Profile() {
  const genders = useOnboardingOptions((s) => s.genders);
  const age = useDraft((s) => s.age);
  const gender = useDraft((s) => s.gender);
  const set = useDraft((s) => s.set);
  // 미선택으로 넘어가면 라벨이 [건너뛰기] — 하나라도 답했으면 [다음] (05-b.md)
  const answered = age.length > 0 || gender != null;

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
              // 값이 들어가면 지우기 × — 선택을 되돌릴 길 (05-b.md)
              onClear={() => set("age", "")}
            />
          </View>

          <View style={styles.field}>
            <FieldLabel>성별</FieldLabel>
            <ChipFlow
              items={genders}
              selected={gender == null ? [] : [gender]}
              // 같은 것을 다시 누르면 미선택으로 되돌린다 — 고른 뒤 무를 길이 있어야 한다
              onToggle={(id) => set("gender", gender === id ? null : id)}
            />
          </View>

          {/* 개인정보 문구는 실제 처리와 같은 말이어야 한다 — 저장되고 질문
              생성에만 쓰이므로 "사용하지 않아요"라고 쓸 수 없다 (05-b.md) */}
          <AppText variant="caption" tone="caption">
            답변은 질문을 조금 더 잘 맞추는 데만 사용하며, 다른 사람에게 공개되지 않아요.
          </AppText>

          {/* 선택 질문이라 비워도 열린다 — disabled 를 두지 않는다 */}
          <AppButton label={answered ? "다음" : "건너뛰기"} onPress={goNext} />
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

/**
 * `.sech` 라벨 + 「선택사항」 배지. "선택"이 아니라 **"선택사항"** —
 * "선택"은 "고르라"는 뜻으로도 읽힌다(`05-b.md`).
 */
function FieldLabel({ children }: { children: string }) {
  return (
    <View style={styles.labelRow}>
      <AppText style={styles.label}>{children}</AppText>
      <View style={styles.badge}>
        <AppText tone="accent" style={styles.badgeText}>
          선택사항
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
