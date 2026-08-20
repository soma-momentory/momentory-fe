import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { elevation, label as labelColor, layout, radius, size, space, zIndex } from "@/design/ds";

import { Icon, type IconName } from "./icons/Icon";
import { Text } from "./Text";

/**
 * 토스트 — `01 Core Components.dc.html` 의 `Toast`(변형 normal · positive · negative).
 *
 * **끝난 일을 알리는 한 줄**이다. `RULES.md` 의 「오류·거부·실패는 한 줄 안내로
 * 흡수한다 · 모달 금지」와 어긋나지 않는다 — 오히려 그 「한 줄」의 한 모양이다.
 * 버튼을 달지 않는다(되돌리기 없음 — `DESIGN.md` 「일정」 「삭제는 확인 모달 1회」).
 *
 * ## 색만으로 말하지 않는다
 *
 * 변형이 바꾸는 것은 **아이콘 글리프**이지 글자색이 아니다. 면이 어두운 반전
 * 면이라 `status.*` 원색을 얹으면 대비가 무너진다(`#6D9757` on `#3C2E22` ≈ 2.5).
 * 그래서 글자·아이콘은 늘 `label.onFill` 이고, 무슨 일이 있었는지는 **문장이**
 * 말한다.
 *
 * ⚠ 면은 반전 배경이다. `DESIGN.md` 의 다크 팔레트에 있는
 * `inverse-background(#3C2E22)` 가 라이트의 `label.normal` 과 **같은 값**이라
 * 새 토큰을 만들지 않고 그 토큰을 쓴다(다크 모드는 만들지 않는다 — N1).
 *
 * ## 스스로 사라진다
 *
 * 부르는 화면이 타이머를 들면 화면마다 시간이 갈린다. 여기서 한 번 재고
 * `onDismiss` 로 알린다 — 화면은 「무엇을 알릴지」만 정한다.
 */
type Props = {
  message: string;
  variant?: "normal" | "positive" | "negative";
  onDismiss: () => void;
  /** 시안의 자동 소멸 시간 (`Home Sample.dc.html` — 2600ms) */
  duration?: number;
  /**
   * 화면 바닥에서 띄우는 높이. 기본은 **탭바 56 + 20**(`DESIGN.md` §3 의
   * 스크롤 클리어런스와 같은 값) — 탭이 없는 화면은 줄여 쓴다
   */
  offsetBottom?: number;
};

const ICONS: Record<NonNullable<Props["variant"]>, IconName | null> = {
  normal: null,
  positive: "circle-check",
  negative: "circle-exclamation",
};

export function Toast({
  message,
  variant = "normal",
  onDismiss,
  duration = 2600,
  offsetBottom = layout.scrollClearance,
}: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const icon = ICONS[variant];

  return (
    <View
      // 낭독기에 **끼어들지 않고** 읽힌다 — 사라지는 알림이라 흐름을 끊지 않는다
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      // 잠깐 떠 있는 알림이 그 아래 버튼을 먹지 않게
      pointerEvents="none"
      style={[styles.root, { bottom: offsetBottom }]}
    >
      {icon != null ? <Icon name={icon} size={size.icon.md} color={labelColor.onFill} /> : null}
      <Text variant="body2" color={labelColor.onFill} style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: layout.screenPadding,
    right: layout.screenPadding,
    zIndex: zIndex.overlay,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: size.button.large,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.medium,
    // 반전 면 — 위 주석 참조
    backgroundColor: labelColor.normal,
    ...elevation.floating,
  },
  message: { flex: 1 },
});
