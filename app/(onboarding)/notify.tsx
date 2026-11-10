import { track } from "@/features/analytics";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Chip, PaperGroup, PaperRow, Text, TimeSheet } from "@/components/ds";
import { Baba, backOr, OnboardingFrame, SetupBar } from "@/components/onboarding/OnboardingParts";
import { label as labelColor, onboardingArt, space } from "@/design/ds";
import { useDraft } from "@/features/onboarding/model/draft";
import { defaultRetroTime, SETUP_STEPS, TIME_CHOICES } from "@/features/onboarding/model/flow";
import { requestNotificationPermission } from "@/lib/notifications";
import { formatKoreanTime } from "@/lib/time";

/**
 * 알림 — 선택. 기본 시각은 질문 3 답이 정한다(「지쳐서 바로 자요」 9시 · 나머지 10시 반).
 * 다시 온보딩하는 사람은 지금 시각이 먼저 골라져 있다. 「알림 켜기」를 누르면 OS 창이 뜬다.
 * 칩 둘은 바로 고르는 길이고, 그 밖의 시각은 「알림 시간」 줄이 마이와 같은 휠 시트로 연다(2026-11-10).
 */
export default function Notify() {
  const nickname = useDraft((s) => s.nickname);
  const dayEnd = useDraft((s) => s.answers.dayEnd);
  const time = useDraft((s) => s.retroTime) ?? defaultRetroTime(dayEnd);
  // 시트에서 고르는 중인 시각 — `완료` 에만 정해지고 ✕ · 딤은 버린다(마이 알림 시트와 같다)
  const [editing, setEditing] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const pick = (t: string) => useDraft.getState().set("retroTime", t);

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
        onBack={backOr("/calendar")}
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
            </View>
            <PaperGroup>
              <PaperRow
                title="알림 시간"
                icon="bell"
                value={formatKoreanTime(time)}
                accessibilityLabel={`알림 시간 ${formatKoreanTime(time)}, 바꾸기`}
                onPress={() => setEditing(time)}
              />
            </PaperGroup>
          </View>
        }
        title={"밤에 바바가\n먼저 알림을 보내요"}
        body="고른 시각에 「오늘 어땠어요?」 하고 물어봐요"
        primary={{ label: "알림 켜기", disabled: asking, onPress: () => void turnOn() }}
        secondary={{ label: "나중에", onPress: later }}
      />

      {editing != null ? (
        <TimeSheet
          title="시간 선택"
          time={editing}
          onChange={setEditing}
          onDismiss={() => setEditing(null)}
          onDone={() => {
            pick(editing);
            setEditing(null);
          }}
        />
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
