import { router } from "expo-router";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { currentUserId } from "@/features/auth/model/auth";
import { useCalendarSync } from "@/features/calendar/model/calendarSync";
import { useDraft } from "@/features/onboarding/model/draft";
import { requestCalendarAccess } from "@/lib/calendar";

/**
 * `09` · 캘린더 (온보딩 6/6 · 선택)
 *
 * **권한을 묻기 전에 무엇에 쓰는지 먼저 말한다.** 시스템 다이얼로그는
 * "허용/거부"만 물어서, 그 앞에 이유가 없으면 대부분 거부로 끝난다(`09.md`).
 *
 * - **안내는 실제 처리와 같은 말이어야 한다.** 일정 제목은 `Schedule` 로
 *   **저장되므로** "저장하지 않아요"라고 쓸 수 없다 — 이전 문구("일정 제목만
 *   참고하며, 내용은 저장하거나 공유하지 않아요")는 사실과 달라 **폐기됐다**
 * - **시간을 읽지 않는다** — `Schedule.time` 은 MVP 에서 항상 `null`.
 *   그래서 안내에도 "시간"을 넣지 않는다
 * - **실패해도 진행한다.** 연결 실패가 온보딩을 막지 않는다 — 마이에서 다시
 *   시도한다. 두 버튼이 같은 곳으로 가되, `[나중에 할게요]` 로 건너뛰면
 *   완료 화면이 **`10-b`**(카드에 안내 한 줄)가 된다
 * - `[나중에 할게요]` 는 `quiet` 로 두되 **숨기지 않는다.** 거절 경로가 보이지
 *   않으면 허용이 강요가 된다
 *
 * 실제 권한 요청은 **OS 다이얼로그가 그린다**(`expo-calendar`) — 커스텀 권한
 * 화면을 만들지 않는다(`RULES`). 이 화면이 하는 일은 그 앞에 이유를 놓는 것뿐이다.
 *
 * ⚠ **거부해도 막지 않는다.** 허용하지 않았으면 `calendarLinked` 는 `false` 이고
 * 완료 화면은 `10-b` 가 된다 — 연결되지 않았는데 「연결했어요」라고 말할 수는 없다
 * (「안내는 실제 처리와 같은 말이어야 한다」). `09.md` 는 `10-b` 를
 * 「`[나중에 할게요]` 로 건너뛴 경우」로만 적어 뒀지만, 거부도 결과가 같으므로
 * 같은 화면으로 보낸다.
 */
export default function CalendarLink() {
  const set = useDraft((s) => s.set);
  // OS 다이얼로그가 떠 있는 동안의 두 번째 누름 — 다이얼로그를 두 번 열지 않는다
  const asking = useRef(false);

  const link = async () => {
    if (asking.current) return;
    asking.current = true;

    const access = await requestCalendarAccess();
    set("calendarLinked", access.granted);

    if (access.granted) {
      // 첫 적재 — **기다리지 않는다.** 이 화면은 동기화를 위한 곳이 아니고,
      // 실패해도 다음 실행이 같은 것을 다시 보낸다(화해는 멱등이다).
      // 온보딩 커밋(`10`)보다 먼저 갈 수 있지만 순서는 상관없다 — 서버는
      // `externalId` 로 upsert 한다.
      void currentUserId().then((userId) => {
        if (userId != null) void useCalendarSync.getState().sync(userId);
      });
    }

    asking.current = false;
    router.push("/done");
  };

  const later = () => {
    set("calendarLinked", false);
    router.push("/done");
  };

  return (
    <ScreenBackground>
      <OnboardingTopBar step={5} onBack={() => router.back()} />

      <ChatLayout>
        <Avatar />
        <BabaBubble index={0}>마지막으로 하나만 더 부탁드릴게요.</BabaBubble>
        <BabaBubble index={1}>
          오늘 있었던 일을 더 쉽게 떠올릴 수 있도록 캘린더를 연결해볼까요?
        </BabaBubble>
      </ChatLayout>

      <View style={styles.bottom}>
        {/* 무엇을 어디까지 가져가는지를 못박는 카드. 버튼보다 먼저 읽히는 자리다 */}
        <Card>
          <AppText variant="caption" style={styles.notice}>
            일정 제목을 모멘토리에 저장해 회고 질문을 만드는 데 사용해요. 캘린더 원본은 수정하지
            않고, 다른 사람에게 공유하지 않아요.
          </AppText>
        </Card>

        <AppButton label="캘린더 연결하기" onPress={() => void link()} />
        <AppButton label="나중에 할게요" variant="quiet" onPress={later} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  bottom: { gap: 11 },
  // css 12.5/1.6 — body 톤. 카드 안에서 읽히는 문장이라 caption 색이 아니다
  notice: { lineHeight: 20 },
});
