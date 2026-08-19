import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheet, Button, Icon, Text, WheelPicker } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { background, hairline, label as labelColor, radius, space } from "@/design/ds";
import { useDraft } from "@/features/onboarding/model/draft";
import { requestNotificationPermission } from "@/lib/notifications";
import { formatKoreanTime, toHHMM } from "@/lib/time";

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
 *
 * ⚠ `datetimepicker` 의존성은 **여기서 지우지 않는다** — 마이가 아직 쓴다.
 *
 * - **"마지막으로,"를 쓰지 않는다** — 바로 다음 `09` 가 "마지막으로 하나만 더"라
 *   충돌한다(`08.md`)
 * - `[알림 없이 쓸게요]` 를 골라도 **회고 시각은 저장된다** — `notifyRetro` 만 끈다
 * - **저장 직후의 OS 권한 다이얼로그는 OS 가 그린다** — 커스텀 권한 화면 없음
 * - **거부해도 온보딩은 멈추지 않는다.** 거부는 오류가 아니라 답이라, 안내도
 *   재시도도 없이 `notifyRetro` 만 끄고 그대로 `09` 로 간다
 */
// 휠은 **문자열**을 다룬다 — 표시와 값을 하나로 두면 열마다 변환이 생기지 않는다
const PERIODS = ["오전", "오후"];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
/** 분은 5분 단위 — 시안이 정한 눈금 */
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export default function RetroTime() {
  const retroTime = useDraft((s) => s.retroTime);
  const set = useDraft((s) => s.set);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** 다이얼로그가 뜨기 전 한 번 더 눌리면 권한 요청이 둘이 된다 */
  const [asking, setAsking] = useState(false);
  // 초안의 21:30 은 스키마 기본값이라 「고른 것」이 아니다 — 고르기 전에는
  // 칩이 「시간 선택」이고, 고르고 나서야 그 값을 든다
  const [picked, setPicked] = useState(false);

  const wheel = toWheel(retroTime);
  // 굴리는 동안에는 값만 옮긴다 — **확정은 `[완료]` 다**
  const setWheel = (next: Partial<WheelValue>) =>
    set("retroTime", fromWheel({ ...wheel, ...next }));

  /**
   * `[완료]` — **지금 휠에 서 있는 값을 그대로 확정한다.**
   *
   * ⚠ 굴린 순간(`onChange`)에 확정하면 **기본값을 그대로 고른 사람이 넘어가지 못한다** —
   * 초안이 이미 21:30 이라 휠을 움직이지 않으면 `onChange` 가 한 번도 울리지 않는다.
   * 실기기에서 「완료를 눌러도 아무 일이 없다」로 드러난 자리다.
   */
  const confirmTime = () => {
    set("retroTime", fromWheel(wheel));
    setPicked(true);
    setSheetOpen(false);
  };

  const goNext = async (notify: boolean) => {
    if (asking) return;

    // 알림만 끈다 — 회고 시각은 남는다 (08.md)
    if (!notify) {
      set("notifyRetro", false);
      router.push("/calendar");
      return;
    }

    setAsking(true);
    // 권한이 곧 답이다 — 켜겠다고 했지만 OS 에서 거부하면 알림은 꺼진 것이다
    const { granted } = await requestNotificationPermission();
    set("notifyRetro", granted);
    setAsking(false);
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
        <Text variant="caption1" color={labelColor.alternative} style={styles.hint}>
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
                items: PERIODS,
                value: wheel.period,
                onChange: (period) => setWheel({ period }),
                width: 88,
              },
              {
                key: "hour",
                label: "시",
                items: HOURS,
                value: wheel.hour,
                onChange: (hour) => setWheel({ hour }),
                width: 72,
                format: (h) => `${h}시`,
              },
              {
                key: "minute",
                label: "분",
                items: MINUTES,
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

type WheelValue = { period: string; hour: string; minute: string };

/** `"21:30"` → `{ 오후, "9", "30" }`. 시각의 표기는 `lib/time` 이 쥐고 여기선 눈금만 만든다 */
function toWheel(hhmm: string): WheelValue {
  const [h = "21", m = "30"] = hhmm.split(":");
  const hour24 = Number(h);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  // 5분 눈금 밖의 값(서버가 준 21:37 같은 것)은 가장 가까운 눈금으로 내린다
  const nearest = MINUTES.reduce((best, v) =>
    Math.abs(Number(v) - Number(m)) < Math.abs(Number(best) - Number(m)) ? v : best,
  );
  return { period: hour24 < 12 ? "오전" : "오후", hour: String(hour12), minute: nearest };
}

function fromWheel({ period, hour, minute }: WheelValue): string {
  const base = Number(hour) % 12;
  const hour24 = period === "오전" ? base : base + 12;
  // 날짜는 버린다 — `toHHMM` 이 시각만 읽는다
  return toHHMM(new Date(2026, 0, 1, hour24, Number(minute)));
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
  secondary: { alignItems: "center" },
});
