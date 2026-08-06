import { StyleSheet, View } from "react-native";

import { BackChevron } from "@/components/primitives/BackChevron";
import { ProgressDots } from "@/components/primitives/ProgressDots";

/**
 * 온보딩 상단 — 왼쪽 ‹ · 오른쪽 진행점. `9-mvp.mjs` 는 `mnav(62)` 와 `dots6(_, 66)`
 * 을 각 화면이 따로 얹는다.
 *
 * **뒤로가 없어도 자리를 예약한다**(`BackChevron` `hidden`). 첫 질문에서 자리를
 * 비우면 진행점의 y 가 흔들려 화면을 넘길 때마다 상단이 미세하게 튄다.
 *
 * `step` 이 `null` 이면 점을 그리지 않는다 — `03` 환영이 그렇다.
 * 아직 질문이 시작되지 않았는데 점을 두면 "0/6" 을 세게 만든다.
 */
type Props = {
  /** 0부터. `null` 이면 진행점 없음 */
  step: number | null;
  onBack?: () => void;
};

export function OnboardingTopBar({ step, onBack }: Props) {
  return (
    <View style={styles.bar}>
      <BackChevron hidden={onBack == null} onPress={onBack} />
      <ProgressDots activeIndex={step} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // 점이 없는 화면에서도 높이가 같아야 아래 내용이 위아래로 흔들리지 않는다
    minHeight: 30,
  },
});
