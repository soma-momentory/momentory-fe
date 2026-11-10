import { StyleSheet, View } from "react-native";

import { label as labelColor, space } from "@/design/ds";
import { myPaper } from "@/design/ds/myPaper";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";
import {
  formatKoreanTime,
  fromWheelTime,
  toWheelTime,
  WHEEL_HOURS,
  WHEEL_MINUTES,
  WHEEL_PERIODS,
  type WheelTime,
} from "@/lib/time";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { PaperGroup } from "./PaperGroup";
import { Text } from "./Text";
import { WheelPicker } from "./WheelPicker";

/**
 * 시각 하나만 고르는 시트 — 회고 알림 · 편지 알림(마이)과 온보딩 알림이 같은 것을 연다
 * (`DESIGN.md` §11 「시간 선택」).
 *
 * 2026-11-10 · 사용자 요청 — 옛 흰 시트 · 단색 버튼에서 마이 · 홈의 결로 바꾸고 고르기 쉽게 했다:
 * - **고른 시각을 가운데 크게** 보인다(「밤 10:30」) — 휠을 굴리는 대로 바로 바뀐다
 * - 두 칸뿐이라 굴리기 번거롭던 **오전 · 오후는 누르는 칩 둘**이고, 시 · 분만 휠이다(종이 위)
 * - 오른쪽 위 ✕ 로도 닫는다 — 딤 · ✕ · 쓸어내리기가 같은 `onDismiss`(고르던 값은 버린다)
 * - `완료` 는 홈 「일기 작성하기」와 같은 천 라벨이다
 */
export function TimeSheet({
  title,
  time,
  onChange,
  onDismiss,
  onDone,
  onTurnOff,
}: {
  title: string;
  time: string;
  onChange: (time: string) => void;
  onDismiss: () => void;
  onDone: () => void;
  /** 켜져 있을 때만 — 「알림 받지 않기」 */
  onTurnOff?: () => void;
}) {
  const wheel = toWheelTime(time);
  const setWheel = (next: Partial<WheelTime>) => onChange(fromWheelTime({ ...wheel, ...next }));
  const shown = formatKoreanTime(fromWheelTime(wheel));

  return (
    <BottomSheet title={title} closable onDismiss={onDismiss}>
      <View style={styles.preview} accessibilityLiveRegion="polite">
        <Text variant="label2" color={labelColor.alternative}>
          알림 시간
        </Text>
        <View>
          <View style={styles.highlight} />
          <Text variant="title1Hand" color={labelColor.strong}>
            {shown}
          </Text>
        </View>
      </View>

      <PaperGroup padded>
        <View style={styles.periods}>
          {WHEEL_PERIODS.map((period) => (
            <Chip
              key={period}
              label={period}
              selected={wheel.period === period}
              onPress={() => setWheel({ period })}
              style={styles.period}
            />
          ))}
        </View>
        {/* 두 열이 하이라이트 밴드 **하나**를 공유한다 — 열마다 그리면 사이가 끊긴다 */}
        <WheelPicker
          columns={[
            {
              key: "hour",
              label: "시",
              items: WHEEL_HOURS,
              value: wheel.hour,
              onChange: (hour) => setWheel({ hour }),
              width: 88,
              format: (h) => `${h}시`,
            },
            {
              key: "minute",
              label: "분",
              items: WHEEL_MINUTES,
              value: wheel.minute,
              onChange: (minute) => setWheel({ minute }),
              width: 88,
              format: (m) => `${m}분`,
            },
          ]}
        />
      </PaperGroup>

      <ReflectionButton
        testID="time-sheet-done"
        label="완료"
        onPress={onDone}
        style={styles.done}
      />
      {onTurnOff != null ? (
        <View style={styles.secondary}>
          <Button label="알림 받지 않기" variant="text" onPress={onTurnOff} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: "center", gap: space.xs, paddingVertical: space.sm },
  // 마이 묶음 제목과 같은 형광펜 — 글자 아래 절반만 칠한다
  highlight: {
    position: "absolute",
    left: -6,
    right: -6,
    bottom: 6,
    height: 14,
    backgroundColor: myPaper.settingsDot,
  },
  periods: { flexDirection: "row", justifyContent: "center", gap: space.sm },
  period: { minWidth: 88 },
  done: { marginTop: 0, marginHorizontal: 0 },
  secondary: { alignItems: "center" },
});
