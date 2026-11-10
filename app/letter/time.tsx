import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Chip, PaperGroup, PaperRow, TimeSheet } from "@/components/ds";
import { Baba, OnboardingFrame } from "@/components/onboarding/OnboardingParts";
import { space } from "@/design/ds";
import { track } from "@/features/analytics";
import { saveLetterPreference } from "@/features/letter/model/letter";
import { useSettings } from "@/features/my/model/settings";
import { requestNotificationPermission } from "@/lib/notifications";
import { formatKoreanTime } from "@/lib/time";

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
 * 칩 셋 밖의 시각은 「알림 시간」 줄이 마이 · 온보딩 알림과 같은 시트(`TimeSheet`)로 연다(2026-11-10).
 */
export default function LetterTime() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [time, setTime] = useState(useSettings.getState().notify.letter.time ?? "08:30");
  // 시트에서 고르는 중인 시각 — `완료` 에만 정해지고 ✕ · 딤은 버린다(마이 알림 시트와 같다)
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const custom = !LETTER_TIMES.some((c) => c.time === time);

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
    router.replace(next === "done" ? "/retro/done" : "/(tabs)/rest?afterDiary=1");
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
            </View>
            <PaperGroup style={styles.row}>
              <PaperRow
                title="알림 시간"
                icon="mail"
                value={formatKoreanTime(time)}
                accessibilityLabel={`알림 시간 ${formatKoreanTime(time)}, 바꾸기`}
                onPress={() => setEditing(time)}
              />
            </PaperGroup>
          </View>
        }
        title={"내일 아침,\n바바가 편지를 보내요"}
        body="몇 시에 받을까요?"
        primary={{ label: "이 시각에 받을게요", disabled: busy, onPress: () => void finish(true) }}
        secondary={{ label: "알림 없이 볼게요", onPress: () => void finish(false) }}
      />

      {editing != null ? (
        <TimeSheet
          title="시간 선택"
          time={editing}
          onChange={setEditing}
          onDismiss={() => setEditing(null)}
          onDone={() => {
            setTime(editing);
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  art: { alignSelf: "stretch", alignItems: "center", gap: space.xl },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  row: { alignSelf: "stretch" },
});
