import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { timeField } from "@/design/tokens.mvp";
import { useDraft } from "@/features/onboarding/model/draft";
import { dateAtTime, formatKoreanTime, toHHMM } from "@/lib/time";

/**
 * `08` · 회고 시간 (온보딩 5/6)
 *
 * **알림을 켜지 않아도 끝까지 갈 수 있다.** 시간을 고르는 것과 알림을 받는 것은
 * 다른 결정이라, 같은 화면에 `[다음]` 과 `[알림 없이 쓸게요]` 를 함께 둔다(`08.md`).
 *
 * - **"마지막으로,"를 쓰지 않는다** — 바로 다음 `09` 가 "마지막으로 하나만 더"라
 *   충돌한다. 마지막이라는 말은 캘린더 한 곳에만 둔다(`08.md`)
 * - 시간 선택은 **OS 피커**로 연다. 커스텀 휠을 만들지 않는다
 * - `[알림 없이 쓸게요]` 를 골라도 **회고 시각은 저장된다** — `notifyRetro` 만
 *   끄고, 홈의 「밤 9:30엔 제가 먼저 말 걸어요」 문구는 시각을 계속 쓴다
 * - 여기서 정한 시각은 `10` 완료 카드 · `M1` 프로필 · `M3` 알림 **세 곳이 같은
 *   값**을 본다 — 그래서 초안 `retroTime` 하나에만 쓴다
 * - 저장 직후의 OS 알림 권한 다이얼로그(`P*`)는 OS 가 그린다. 권한 API 는
 *   M2 에서 `expo-notifications` 와 함께 붙는다 — 지금은 자리만 비워 둔다
 */
export default function RetroTime() {
  const retroTime = useDraft((s) => s.retroTime);
  const set = useDraft((s) => s.set);
  const [showPicker, setShowPicker] = useState(false);
  // 초안의 21:30 은 스키마 기본값이라 「고른 것」이 아니다 — 고르기 전에는
  // placeholder 를 보인다(시안의 「선택 전」). 고르면 그 값이 자리를 채운다.
  const [picked, setPicked] = useState(false);

  const onPick = (_e: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (date) {
      set("retroTime", toHHMM(date));
      setPicked(true);
    }
  };

  const goNext = (notify: boolean) => {
    // 알림만 끈다 — 회고 시각은 남는다 (08.md)
    set("notifyRetro", notify);
    router.push("/calendar");
  };

  return (
    <ScreenBackground>
      <OnboardingTopBar step={4} onBack={() => router.back()} />

      <ChatLayout>
        <Avatar />
        <BabaBubble index={0}>하루를 언제 돌아보면 가장 편안할까요?</BabaBubble>
        <BabaBubble index={1}>
          바쁜 하루 속에서도 부담 없이 기록할 수 있도록, 당신이 편한 시간에 찾아갈게요.
        </BabaBubble>
      </ChatLayout>

      <View style={styles.bottom}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="시간 선택"
          onPress={() => setShowPicker(true)}
          style={styles.timeRow}
        >
          <AppText tone={picked ? "strong" : "caption"} style={styles.timeLabel}>
            {picked ? formatKoreanTime(retroTime) : "시간 선택"}
          </AppText>
          <AppText variant="caption" tone="caption">
            ▾
          </AppText>
        </Pressable>

        {showPicker ? (
          <DateTimePicker mode="time" value={dateAtTime(retroTime)} onChange={onPick} />
        ) : null}

        <AppText variant="caption" tone="legal" style={styles.hint}>
          탭하면 시간을 고를 수 있어요
        </AppText>

        {/* 고르지 않아도 넘어간다 — 초안이 스키마 기본값 21:30 을 들고 있다 */}
        <AppButton label="다음" onPress={() => goNext(true)} />

        {/* 거절을 같은 화면에 둔다. 골라도 회고 시각은 저장된다 */}
        <AppButton label="알림 없이 쓸게요" variant="quiet" onPress={() => goNext(false)} />
      </View>
    </ScreenBackground>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  bottom: { gap: 11 },
  // 08 의 시간 칸 — `.tfield` 가 아니라 r16 · ink 14% · 1px (tokens.timeField)
  timeRow: {
    height: timeField.height,
    borderRadius: timeField.radius,
    borderWidth: timeField.borderWidth,
    borderColor: timeField.border,
    backgroundColor: semantic.surface,
    paddingHorizontal: timeField.paddingHorizontal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeLabel: { fontSize: timeField.fontSize, lineHeight: timeField.fontSize * 1.2 },
  hint: { textAlign: "center" },
});
