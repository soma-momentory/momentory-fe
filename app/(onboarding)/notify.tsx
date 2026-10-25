import { track } from "@/features/analytics";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { BottomSheet, Button, Chip, Text, WheelPicker } from "@/components/ds";
import { Baba, OnboardingFrame, SetupBar } from "@/components/onboarding/OnboardingParts";
import { label as labelColor, onboardingArt, space } from "@/design/ds";
import { useDraft } from "@/features/onboarding/model/draft";
import { defaultRetroTime, SETUP_STEPS, TIME_CHOICES } from "@/features/onboarding/model/flow";
import { requestNotificationPermission } from "@/lib/notifications";
import {
  formatKoreanTime,
  fromWheelTime,
  toWheelTime,
  WHEEL_HOURS,
  WHEEL_MINUTES,
  WHEEL_PERIODS,
  type WheelTime,
} from "@/lib/time";

/**
 * 알림 — 선택. 기본 시각은 질문 3 답이 정한다(「지쳐서 바로 자요」 9시 · 나머지 10시 반).
 * 다시 온보딩하는 사람은 지금 시각이 먼저 골라져 있다. 「알림 켜기」를 누르면 OS 창이 뜬다.
 */
export default function Notify() {
  const nickname = useDraft((s) => s.nickname);
  const dayEnd = useDraft((s) => s.answers.dayEnd);
  const time = useDraft((s) => s.retroTime) ?? defaultRetroTime(dayEnd);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const custom = !TIME_CHOICES.some((c) => c.time === time);

  const pick = (t: string) => useDraft.getState().set("retroTime", t);
  const wheel = toWheelTime(time);
  const setWheel = (next: Partial<WheelTime>) => pick(fromWheelTime({ ...wheel, ...next }));

  const turnOn = async () => {
    if (asking) return;
    setAsking(true);
    pick(time);
    // 권한이 곧 답이다 — 켜겠다고 했지만 OS 에서 거부하면 알림은 꺼진 것이다
    const { granted } = await requestNotificationPermission();
    track("notify_permission_result", { source: "onboarding", granted });
    useDraft.getState().set("notifyRetro", granted);
    setAsking(false);
    router.push("/research");
  };

  const later = () => {
    // 알림만 끈다 — 시각은 남는다
    pick(time);
    useDraft.getState().set("notifyRetro", false);
    router.push("/research");
  };

  return (
    <>
      <OnboardingFrame
        onBack={() => router.back()}
        progress={<SetupBar index={SETUP_STEPS.indexOf("notify")} count={SETUP_STEPS.length} />}
        art={
          <View style={styles.wrap}>
            <View style={styles.lock}>
              <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 1 1">
                <Defs>
                  <LinearGradient id="lock" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={onboardingArt.lockTop} />
                    <Stop offset="1" stopColor={onboardingArt.lockBottom} />
                  </LinearGradient>
                </Defs>
                <Rect width={1} height={1} fill="url(#lock)" />
              </Svg>
              <Text variant="caption1" color={labelColor.onFill}>
                {formatKoreanTime(time)}
              </Text>
              <View style={styles.note}>
                <Baba size={40} />
                <View style={styles.noteText}>
                  <Text variant="caption1" color={labelColor.alternative}>
                    모멘토리 · 바바
                  </Text>
                  <Text variant="body2" color={labelColor.strong}>
                    {`${nickname.trim()}님, 오늘 하루 어땠어요? 떠오르는 순간 하나만 들려줘요`}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.chips}>
              {TIME_CHOICES.map((c) => (
                <Chip
                  key={c.time}
                  label={c.label}
                  selected={time === c.time}
                  onPress={() => pick(c.time)}
                />
              ))}
              <Chip
                label={custom ? formatKoreanTime(time) : "직접 고를게요"}
                selected={custom}
                onPress={() => setSheetOpen(true)}
              />
            </View>
          </View>
        }
        title={"밤에 바바가\n먼저 알림을 보내요"}
        body="고른 시각에 「오늘 어땠어요?」 하고 물어봐요"
        primary={{ label: "알림 켜기", disabled: asking, onPress: () => void turnOn() }}
        secondary={{ label: "나중에", onPress: later }}
      />

      {sheetOpen ? (
        <BottomSheet title="시간 선택" onDismiss={() => setSheetOpen(false)}>
          <WheelPicker
            columns={[
              {
                key: "period",
                label: "오전 오후",
                items: WHEEL_PERIODS,
                value: wheel.period,
                onChange: (period) => setWheel({ period }),
                width: 88,
              },
              {
                key: "hour",
                label: "시",
                items: WHEEL_HOURS,
                value: wheel.hour,
                onChange: (hour) => setWheel({ hour }),
                width: 72,
                format: (h) => `${h}시`,
              },
              {
                key: "minute",
                label: "분",
                items: WHEEL_MINUTES,
                value: wheel.minute,
                onChange: (minute) => setWheel({ minute }),
                width: 72,
                format: (m) => `${m}분`,
              },
            ]}
          />
          <Button label="완료" fill onPress={() => setSheetOpen(false)} />
        </BottomSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch", gap: space.lg },
  lock: { borderRadius: 18, padding: space.md, overflow: "hidden", gap: space.sm },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: onboardingArt.lockCard,
    borderRadius: 14,
    paddingVertical: space.sm,
    paddingHorizontal: 10,
  },
  noteText: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
});
