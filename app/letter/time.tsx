import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { BottomSheet, Button, Chip, WheelPicker } from "@/components/ds";
import { Baba, OnboardingFrame } from "@/components/onboarding/OnboardingParts";
import { space } from "@/design/ds";
import { track } from "@/features/analytics";
import { saveLetterPreference } from "@/features/letter/model/letter";
import { useSettings } from "@/features/my/model/settings";
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

/** 편지 시각 칩(PRD 4-8) — 기본은 아침 8:30 */
const LETTER_TIMES = [
  { time: "07:30", label: "출근 전 7:30" },
  { time: "08:30", label: "아침 8:30" },
  { time: "10:00", label: "여유롭게 10:00" },
] as const;

/**
 * 처음 일기를 저장한 직후 한 번 — 「내일 아침 몇 시에 편지 받을까요?」(PRD 4-8).
 *
 * 온보딩 알림 화면(`(onboarding)/notify`)과 같은 문법이다(그림 · 한 줄 · 시각 칩 · 큰 버튼).
 * 고른 값은 서버 프로필에 남긴다 — 기기를 바꿔도 남게. 저장하지 못해도 붙잡지 않고 다음으로 간다
 * (그러면 다음 일기 때 다시 묻는다). 어디로 갈지는 일기 확인(`/retro/draft`)이 `next` 로 넘긴다.
 */
export default function LetterTime() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [time, setTime] = useState(useSettings.getState().notify.letter.time ?? "08:30");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const custom = !LETTER_TIMES.some((c) => c.time === time);
  const wheel = toWheelTime(time);
  const setWheel = (part: Partial<WheelTime>) => setTime(fromWheelTime({ ...wheel, ...part }));

  const finish = async (notify: boolean) => {
    if (busy) return;
    setBusy(true);
    // 권한이 곧 답이다 — 받겠다고 했지만 OS 에서 거부하면 알림은 꺼진 것이다
    const enabled = notify && (await requestNotificationPermission()).granted;
    // 저장하지 못하면 다음 일기 때 다시 묻는다 — 그때 한 번만 세게 성공했을 때만 보낸다
    if (await saveLetterPreference(time, enabled)) {
      track("letter_time_chosen", {
        time: custom ? "custom" : (time.replace(/^0/, "") as "7:30" | "8:30" | "10:00"),
        notify: enabled,
      });
    }
    router.replace(next === "done" ? "/retro/done" : "/(tabs)/rest");
  };

  return (
    <>
      <OnboardingFrame
        art={
          <View style={styles.art}>
            <Baba size={120} />
            <View style={styles.chips}>
              {LETTER_TIMES.map((c) => (
                <Chip
                  key={c.time}
                  label={time === c.time ? `✓ ${c.label}` : c.label}
                  selected={time === c.time}
                  onPress={() => setTime(c.time)}
                />
              ))}
              <Chip
                label={custom ? `✓ ${formatKoreanTime(time)}` : "직접 고를게요"}
                selected={custom}
                onPress={() => setSheetOpen(true)}
              />
            </View>
          </View>
        }
        title={"내일 아침,\n바바가 편지를 보내요"}
        body="몇 시에 받을까요?"
        primary={{ label: "이 시각에 받을게요", disabled: busy, onPress: () => void finish(true) }}
        secondary={{ label: "알림 없이 볼게요", onPress: () => void finish(false) }}
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
  art: { alignSelf: "stretch", alignItems: "center", gap: space.xl },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
});
