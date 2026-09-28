import { track, captureAnalytics } from "@/features/analytics";
import { router } from "expo-router";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Card, Icon, Text } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { label as labelColor, layout, primary, space } from "@/design/ds";
import { syncDeviceCalendar } from "@/features/calendar/model/foregroundSync";
import { CALENDAR_NOTICE } from "@/features/calendar/model/notice";
import { useDraft } from "@/features/onboarding/model/draft";
import { requestCalendarAccess } from "@/lib/calendar";

/**
 * `09` · 캘린더 (선택)
 *
 * **권한을 묻기 전에 무엇에 쓰는지 먼저 말한다.** 시스템 다이얼로그는
 * "허용/거부"만 물어서, 그 앞에 이유가 없으면 대부분 거부로 끝난다(`09.md`).
 * 새 디자인은 그 이유를 **메시지 아래 정보 카드**로 옮겼다
 * (`Onboarding.dc.html` 「09 안내 문구 → 메시지 아래 정보 카드」).
 *
 * - **안내는 실제 처리와 같은 말이어야 한다.** 일정 제목은 `Schedule` 로
 *   **저장되므로** "저장하지 않아요"라고 쓸 수 없다
 * - **시간을 읽지 않는다** — `Schedule.time` 은 MVP 에서 항상 `null`
 * - **실패해도 진행한다.** 연결 실패가 온보딩을 막지 않는다 — 마이에서 다시
 *   시도한다. 두 버튼이 같은 곳으로 가되 결과가 `10` 카드의 줄을 가른다
 * - `[나중에 할게요]` 를 **숨기지 않는다.** 거절 경로가 보이지 않으면 허용이
 *   강요가 된다 — 새 디자인은 그것을 CTA 아래 텍스트 버튼으로 둔다
 *
 * 실제 권한 요청은 **OS 다이얼로그가 그린다** — 커스텀 권한 화면을 만들지 않는다.
 *
 * ⚠ **거부해도 막지 않는다.** 허용하지 않았으면 `calendarLinked` 는 `false` 이고
 * 완료 화면의 줄이 달라진다 — 연결되지 않았는데 「연결했어요」라고 말할 수는 없다.
 */
export default function CalendarLink() {
  const set = useDraft((s) => s.set);
  // OS 다이얼로그가 떠 있는 동안의 두 번째 누름 — 다이얼로그를 두 번 열지 않는다
  const asking = useRef(false);

  const link = async () => {
    if (asking.current) return;
    asking.current = true;
    track("calendar_link_chosen", { source: "onboarding", choice: "link" });

    const record = captureAnalytics();
    const access = await requestCalendarAccess();
    record("calendar_permission_result", { granted: access.granted });
    set("calendarLinked", access.granted);

    if (access.granted) {
      // 첫 적재 — **기다리지 않는다.** 이 화면은 동기화를 위한 곳이 아니고,
      // 실패해도 다음 실행이 같은 것을 다시 보낸다(화해는 멱등이다)
      void syncDeviceCalendar();
    }

    asking.current = false;
    track("onboarding_step_completed", { step: "calendar" });
    router.push("/done");
  };

  const later = () => {
    track("calendar_link_chosen", { source: "onboarding", choice: "later" });
    set("calendarLinked", false);
    track("onboarding_step_completed", { step: "calendar" });
    router.push("/done");
  };

  return (
    <OnboardingChat
      step="calendar"
      onBack={() => router.back()}
      inline={
        // 무엇을 어디까지 가져가는지를 못박는 카드. 버튼보다 먼저 읽히는 자리다
        <Card style={styles.notice}>
          <View style={styles.noticeHead}>
            <Icon name="calendar" size={20} color={primary.heavy} />
            <Text variant="label1" color={labelColor.strong}>
              {CALENDAR_NOTICE.title}
            </Text>
          </View>
          <Text variant="body2Reading" color={labelColor.neutral}>
            {CALENDAR_NOTICE.body}
          </Text>
        </Card>
      }
    >
      <Button label="캘린더 연결하기" fill onPress={() => void link()} />
      <View style={styles.secondary}>
        <Button label="나중에 할게요" variant="text" onPress={later} />
      </View>
    </OnboardingChat>
  );
}

const styles = StyleSheet.create({
  // 질문 버블과 같은 폭으로 대화 안에 앉는다
  notice: { alignSelf: "flex-start", maxWidth: 288, gap: space.sm },
  noticeHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  // 주 버튼과의 사이는 같은 짝을 쓰는 화면과 같은 값이다(`layout.dockActionGap`) —
  // 대화 독이 기본으로 주는 간격(`layout.keyboardGap` 과 같은 12)에서 그만큼 되당긴다
  secondary: { alignItems: "center", marginTop: layout.dockActionGap - space.md },
});
