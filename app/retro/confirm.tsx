import { router } from "expo-router";
import { StyleSheet } from "react-native";

import { DayScheduleList } from "@/components/archive/DayScheduleList";
import { Button, Card, ChatBubble, ChatScaffold, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { useDay, useTodayContext, visibleSchedules } from "@/features/home/model/day";
import { formatKoreanDate } from "@/lib/day";

/**
 * `C2` · 오늘 일정 확인 — 대화의 첫 턴이다.
 *
 * `DESIGN.md` 「일기」 1번: **「일정 확인(읽기 전용, 완료만 초록 체크) → `다음`」**.
 *
 * ## 읽기 전용이 된 것이 이 화면의 가장 큰 변화다
 *
 * 옛 화면은 여기서 일정을 **고치고 추가하고 감정을 달 수 있었다** — 홈의 카드를
 * 그대로 다시 보여주는 방식이었다. 새 시안은 그걸 전부 걷어내고 **오늘 있었던
 * 일을 떠올리는 한 장면**으로 바꿨다. 고치는 자리는 홈 하나다.
 *
 * 그래서 여기서 사라진 것: `＋ 일정 추가하기` · 탭해서 상세 열기 · 감정 칩 ·
 * 「오늘의 순간」 · 「오늘 기록한 감정」 · 날씨 카드 · 「N/M 마침」 카운트.
 * **일정을 고치고 싶으면 뒤로 나가 홈에서 고친다** — 회고 도중에 고치는 길을
 * 두면 대화 중간에 화면 밖으로 새는 길이 생긴다.
 *
 * ⚠ **일정이 서버로 가는 것은 여기가 아니다** — `talk` 이 `useDay` 에서 직접
 * 조립해 `startRetro` 에 싣는다. 이 화면을 지나든 말든 payload 는 같다.
 *
 * 나가는 길은 상단 `✕` 하나다(시안 `navClose`) — 회고는 시작하면 끝까지 가는
 * 한 줄이고, 중간에 다른 탭으로 새는 길을 만들지 않는다.
 */
export default function RetroConfirm() {
  const schedules = useDay((s) => s.schedules);
  const { date: today } = useTodayContext();

  const shown = visibleSchedules(schedules);

  return (
    <ChatScaffold
      leading="close"
      onLeadingPress={() => router.replace("/home")}
      dock={<Button label="다음" fill onPress={() => router.push("/retro/emotion")} />}
    >
      <ChatBubble>오늘 있었던 일을 잠깐 떠올려봐요.</ChatBubble>

      {/* 말풍선과 같은 쪽에 서는 카드 — 대화의 일부라 왼쪽에 붙고 폭을 다 쓰지 않는다 */}
      {shown.length > 0 ? (
        <Card padding="loose" style={styles.card}>
          <Text variant="label2" color={labelColor.neutral}>
            {formatKoreanDate(today)}
          </Text>
          <DayScheduleList schedules={shown} />
        </Card>
      ) : null}
    </ChatScaffold>
  );
}

const styles = StyleSheet.create({
  // 시안 288 — 대화 폭(296)과 나란히 선다. 자기 내용만큼만 차지한다
  card: { alignSelf: "flex-start", maxWidth: 288, gap: space.xl },
});
