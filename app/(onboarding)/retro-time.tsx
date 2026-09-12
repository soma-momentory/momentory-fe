import { track } from "@/features/analytics";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheet, Button, Icon, Text, WheelPicker } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import {
  background,
  hairline,
  iosVariant,
  label as labelColor,
  layout,
  radius,
  space,
} from "@/design/ds";
import { useDraft } from "@/features/onboarding/model/draft";
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
 * `08` · 회고 시간
 *
 * **알림을 켜지 않아도 끝까지 갈 수 있다.** 시간을 고르는 것과 알림을 받는 것은
 * 다른 결정이라, 같은 화면에 `[다음]` 과 `[알림 없이 쓸게요]` 를 함께 둔다(`08.md`).
 * 새 디자인은 그 보조 행동을 **CTA 아래**로 옮겼다(`Onboarding.dc.html`
 * 「보조 액션(알림 없이·나중에)을 우상단 → 메인 CTA 아래로 이동」).
 *
 * ## OS 피커에서 커스텀 휠로
 *
 * 옛 화면은 `@react-native-community/datetimepicker` 를 열었다. 시안이 **자체 휠
 * 3열**(오전·오후 / 시 1~12 / 분 5분 단위)을 정의하므로 `WheelPicker` 로 바꿨다 —
 * **마이(`M2`)가 같은 것을 쓴다**. 시간 칩을 누르면 바텀시트가 열리고 `완료`로 닫는다.
 * 눈금·변환은 `lib/time` 이 쥔다 — 두 화면이 같은 시각을 같은 칸에 세워야 한다.
 *
 * ⚠ `datetimepicker` 는 마이까지 옮겨 오면서 **쓰는 곳이 없어졌다**. 지우면 dev
 * client 재빌드가 필요해 `PLAN.md` A-0 Phase 5(삭제)에서 함께 뺀다.
 *
 * - **"마지막으로,"를 쓰지 않는다** — 바로 다음 `09` 가 "마지막으로 하나만 더"라
 *   충돌한다(`08.md`)
 * - `[알림 없이 쓸게요]` 를 골라도 **회고 시각은 저장된다** — `notifyRetro` 만 끈다
 * - **저장 직후의 OS 권한 다이얼로그는 OS 가 그린다** — 커스텀 권한 화면 없음
 * - **거부해도 온보딩은 멈추지 않는다.** 거부는 오류가 아니라 답이라, 안내도
 *   재시도도 없이 `notifyRetro` 만 끄고 그대로 `09` 로 간다
 */
// 눈금과 변환은 `lib/time` 에 있다 — **마이(`M2`)가 같은 휠을 연다**
export default function RetroTime() {
  const retroTime = useDraft((s) => s.retroTime);
  const set = useDraft((s) => s.set);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** 다이얼로그가 뜨기 전 한 번 더 눌리면 권한 요청이 둘이 된다 */
  const [asking, setAsking] = useState(false);
  // 초안의 21:30 은 스키마 기본값이라 「고른 것」이 아니다 — 고르기 전에는
  // 칩이 「시간 선택」이고, 고르고 나서야 그 값을 든다
  const [picked, setPicked] = useState(false);

  const wheel = toWheelTime(retroTime);
  // 굴리는 동안에는 값만 옮긴다 — **확정은 `[완료]` 다**
  const setWheel = (next: Partial<WheelTime>) =>
    set("retroTime", fromWheelTime({ ...wheel, ...next }));

  /**
   * `[완료]` — **지금 휠에 서 있는 값을 그대로 확정한다.**
   *
   * ⚠ 굴린 순간(`onChange`)에 확정하면 **기본값을 그대로 고른 사람이 넘어가지 못한다** —
   * 초안이 이미 21:30 이라 휠을 움직이지 않으면 `onChange` 가 한 번도 울리지 않는다.
   * 실기기에서 「완료를 눌러도 아무 일이 없다」로 드러난 자리다.
   */
  const confirmTime = () => {
    set("retroTime", fromWheelTime(wheel));
    setPicked(true);
    setSheetOpen(false);
  };

  const goNext = async (notify: boolean) => {
    if (asking) return;

    // 알림만 끈다 — 회고 시각은 남는다 (08.md)
    if (!notify) {
      set("notifyRetro", false);
      track("onboarding_step_completed", { step: "retroTime" });
      router.push("/calendar");
      return;
    }

    setAsking(true);
    // 권한이 곧 답이다 — 켜겠다고 했지만 OS 에서 거부하면 알림은 꺼진 것이다
    const { granted } = await requestNotificationPermission();
    set("notifyRetro", granted);
    setAsking(false);
    track("onboarding_step_completed", { step: "retroTime" });
    router.push("/calendar");
  };

  return (
    <>
      <OnboardingChat
        step="retroTime"
        onBack={() => router.back()}
        // 고르고 나면 **칩이 고른 시각을 든다.** 답변 버블은 다음 화면부터 쌓이므로
        // (`conversation.ts` `turnsBefore` — 자기 단계는 빼고 그린다) 여기서 칩을
        // 지우면 방금 고른 시각이 화면 어디에도 남지 않는다. 칩은 그대로 눌러서 고친다
        inline={
          <TimeChip
            label={picked ? formatKoreanTime(retroTime) : "시간 선택"}
            onPress={() => setSheetOpen(true)}
          />
        }
      >
        {/*
          CTA 위 안내 한 줄은 **`label2`** 다 (2026-09-13 · 사용자 요청 · **iOS 에서만** 16 · 안드로이드는 `caption1` 그대로).
          헬퍼(`caption1` 12 → 14)로는 눈이 그냥 지나쳐서 한 번 `body2`(18)까지 올렸다가
          주 버튼(19)과 맞먹어 되내렸다. 온보딩 마지막 화면의 같은 줄과 짝이다.
        */}
        <Text
          variant={iosVariant("label2", "caption1")}
          color={labelColor.alternative}
          style={styles.hint}
        >
          편한 시간은 나중에도 바꿀 수 있어요.
        </Text>
        <Button label="다음" fill disabled={!picked} onPress={() => void goNext(true)} />
        {/* 거절을 같은 화면에 둔다. 골라도 회고 시각은 저장된다 */}
        <View style={styles.secondary}>
          <Button label="알림 없이 쓸게요" variant="text" onPress={() => void goNext(false)} />
        </View>
      </OnboardingChat>

      {sheetOpen ? (
        <BottomSheet title="시간 선택" onDismiss={() => setSheetOpen(false)}>
          {/* 세 열이 하이라이트 밴드 **하나**를 공유한다 — 열마다 그리면 사이가 끊긴다 */}
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
          <Button label="완료" fill onPress={confirmTime} />
        </BottomSheet>
      ) : null}
    </>
  );
}

/** 대화에 붙는 답장 칩 — 고르기 전에는 「시간 선택」, 고른 뒤에는 고른 시각을 든다 */
function TimeChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="시간 다시 고르기"
      onPress={onPress}
      style={styles.timeChip}
    >
      <Icon name="clock" size={16} color={labelColor.alternative} />
      <Text variant="body2" color={labelColor.neutral}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 답장 pill 과 같은 모양의 작은 칩 — 누르면 시트가 열린다
  timeChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: 9,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    backgroundColor: background.elevated,
    ...hairline.neutral,
  },
  hint: { textAlign: "center" },
  // 주 버튼과의 사이는 같은 짝을 쓰는 화면과 같은 값이다(`layout.dockActionGap`) —
  // 대화 독이 기본으로 주는 간격(`layout.keyboardGap` 과 같은 12)에서 그만큼 되당긴다
  secondary: { alignItems: "center", marginTop: layout.dockActionGap - space.md },
});
