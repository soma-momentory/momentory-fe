import { captureAnalytics, track } from "@/features/analytics";
import { router } from "expo-router";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { Baba, backOr, OnboardingFrame, SetupBar } from "@/components/onboarding/OnboardingParts";
import { background, label as labelColor, line, primary, secondary, space } from "@/design/ds";
import { syncDeviceCalendar } from "@/features/calendar/model/foregroundSync";
import { useDraft } from "@/features/onboarding/model/draft";
import { SETUP_STEPS } from "@/features/onboarding/model/flow";
import { requestCalendarAccess } from "@/lib/calendar";

/** 캘린더 — 선택. 연결하면 일정 제목으로 물어본다. 권한 창은 OS 가 띄운다 */
export default function CalendarLink() {
  // OS 창이 떠 있는 동안의 두 번째 누름 — 창을 두 번 열지 않는다
  const asking = useRef(false);

  const link = async () => {
    if (asking.current) return;
    asking.current = true;
    track("calendar_link_chosen", { source: "onboarding", choice: "link" });
    const record = captureAnalytics();
    const access = await requestCalendarAccess();
    record("calendar_permission_result", { granted: access.granted });
    useDraft.getState().set("calendarLinked", access.granted);
    // 첫 적재는 기다리지 않는다 — 실패해도 다음 실행이 같은 것을 다시 보낸다(화해는 멱등)
    if (access.granted) void syncDeviceCalendar();
    asking.current = false;
    router.push("/notify");
  };

  const later = () => {
    track("calendar_link_chosen", { source: "onboarding", choice: "later" });
    useDraft.getState().set("calendarLinked", false);
    router.push("/notify");
  };

  return (
    <OnboardingFrame
      onBack={backOr("/about")}
      progress={<SetupBar index={SETUP_STEPS.indexOf("calendar")} count={SETUP_STEPS.length} />}
      art={
        <View style={styles.compare}>
          <View style={[styles.card, styles.off]}>
            <Text variant="caption1" color={labelColor.alternative} style={styles.cap}>
              연결 안 하면
            </Text>
            <View style={styles.q}>
              <Baba size={52} />
              <Text variant="body1ReadingHand" color={labelColor.strong}>
                오늘 하루 어땠어요?
              </Text>
            </View>
          </View>
          <Text variant="body2" color={labelColor.alternative} style={styles.arrow}>
            ↓
          </Text>
          <View style={[styles.card, styles.on]}>
            <Text variant="caption1" color={primary.heavy} style={styles.cap}>
              연결하면
            </Text>
            <View style={styles.event}>
              <View style={styles.eventBar} />
              <Text variant="body1ReadingHand" color={labelColor.strong}>
                프젝 회의
              </Text>
            </View>
            <View style={styles.q}>
              <Baba size={52} />
              <Text variant="body1ReadingHand" color={labelColor.strong} style={styles.qText}>
                오늘 <Text style={styles.mark}>「프젝 회의」</Text>는 어땠어요?
              </Text>
            </View>
          </View>
        </View>
      }
      title={"캘린더를 연결하면,\n일정으로 물어봐요"}
      body="「오늘 어땠어요?」 대신 「프젝 회의 어땠어요?」처럼 물어봐서 답하기 쉬워요. 일정 제목만 읽고, 캘린더는 바꾸지 않아요"
      primary={{ label: "캘린더 연결하기", onPress: () => void link() }}
      secondary={{ label: "나중에", onPress: later }}
    />
  );
}

const styles = StyleSheet.create({
  compare: { alignSelf: "stretch", gap: 6 },
  card: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: space.md },
  off: { borderWidth: 1.5, borderStyle: "dashed", borderColor: line.neutral, opacity: 0.75 },
  on: { borderWidth: 2, borderColor: primary.heavy, backgroundColor: background.elevated },
  cap: { marginBottom: 6 },
  q: { flexDirection: "row", alignItems: "center", gap: 6 },
  qText: { flexShrink: 1 },
  mark: { backgroundColor: secondary.normal },
  arrow: { textAlign: "center" },
  event: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: background.alternative,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: space.sm,
  },
  eventBar: { width: 4, height: 18, borderRadius: 2, backgroundColor: primary.heavy },
});
