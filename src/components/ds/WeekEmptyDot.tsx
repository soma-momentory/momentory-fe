import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import { View, type ViewStyle } from "react-native";

import { fill } from "@/design/ds";

/**
 * 「이번 주 감정」의 **기록이 없는 날** — 홈의 주간 줄과 리포트의 7일 흐름이 함께 쓴다
 * (2026-09-11 · 사용자 요청 「리포트도 홈처럼 테두리 없애줘」).
 *
 * 색도 테두리도 없는 **옅은 원 하나**로 자리만 지킨다 — 빈 칸을 강조하지 않는다.
 *
 * ## 두 화면이 각자 그리던 것을 한 곳으로
 *
 * 홈은 테두리 없는 원을 직접 그렸고, 리포트는 `EmotionDot` 의 중립 원(옅은 테두리 1.5)을
 * 빌려 썼다. 같은 「기록 없는 날」인데 한쪽만 테두리가 있어 **두 화면이 달라 보였다.**
 * 같아야 하는 원은 한 곳에서만 정한다(`DiaryEmotionRow` 머리말과 같은 판단).
 *
 * ⚠ `EmotionDot` 은 고치지 않았다 — 그 도트는 일기 줄의 작은 표식으로도 쓰이고, 거기서는
 * 테두리가 틴트 면을 떠받친다.
 *
 * ## 「오늘」에도 링을 두르지 않는다 (2026-09-11 · 사용자 요청)
 *
 * 홈은 기록 없는 **오늘** 칸에 옅은 링을 둘렀었다. 그런데 **일기를 지운 날**(대개 오늘)이 그 링 때문에
 * 다른 빈 칸과 달라 보였다 — 「지웠는데 뭔가 남아 있다」로 읽힌다. 빈 칸은 **이유와 상관없이 전부 같다**:
 * 아직 안 쓴 날도, 썼다가 지운 날도 같은 원 하나다.
 *
 * 오늘이 어디인지는 **요일 글자**가 말한다(`WeekEmotionStrip` — 오늘만 `label.strong`).
 */
type Props = {
  /** 지름 — 홈·리포트 모두 26 */
  size?: number;
};

export function WeekEmptyDot({ size = 26 }: Props) {
  // 반지름은 **지름의 절반**이다 — `radius.full`(999)을 쓰지 않는다(`EmotionDot` 주석의
  // 안드로이드 New Architecture 사정이 그대로 적용된다)
  const box: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: fill.normal,
  };

  return <View {...decorativeAccessibilityProps} style={box} />;
}
