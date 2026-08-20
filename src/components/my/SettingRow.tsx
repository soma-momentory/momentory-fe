import { Pressable, StyleSheet, View } from "react-native";

import { Icon, Text, type IconName } from "@/components/ds";
import { label as labelColor, line, overlay, radius, space } from "@/design/ds";

/**
 * 설정 한 줄 — 마이 기본(`M1`)의 그룹 리스트와 기본 정보 수정 목록(`M3`)이 나눠 쓴다.
 *
 * ## ⚠ 이건 `ListCell` 자리에 임시로 서 있는 것이다
 *
 * 시안은 마이의 모든 행을 **Core `ListCell` 하나로 통일**한다(`My.dc.html` 「규칙」).
 * 그 공용 컴포넌트는 **홈·일정 작업이 소유**하고 아직 `components/ds/` 에 없다 —
 * 그래서 마이 안에서만 쓰는 줄로 두었다. `ListCell` 이 들어오면 **이 파일을 지우고
 * 갈아탄다**(마이가 목록이 가장 많아 가장 크게 재사용할 자리다).
 *
 * ## 규칙
 *
 * - **하나의 설정을 두 줄로 나누지 않는다** — 한 행이 이름과 값(시각 등)을 함께 담는다
 * - **누를 곳이 없으면 `›` 를 두지 않는다**(`M3.md`) — 갈 곳이 아직 없는 줄
 *   (문의·약관)이 그렇다. 눌리지도 않고 표식도 없다
 * - 값은 **한 줄로 자른다**(`design.md` 「마이」 — 「현재 값 목록(1줄 말줄임)」)
 * - 줄 높이 56 이라 히트 영역을 따로 깔지 않는다(`RULES.md` 「접근성」)
 */
type Props = {
  label: string;
  /** 이름 아래가 아니라 **같은 줄 오른쪽**에 붙는다. 길면 한 줄로 잘린다 */
  value?: string;
  /** 왼쪽 아이콘 — 시안의 마이 기본 목록만 쓴다(`M3` 목록에는 없다) */
  leading?: IconName;
  onPress?: () => void;
};

export function SettingRow({ label, value, leading, onPress }: Props) {
  const body = (
    <>
      {leading != null ? <Icon name={leading} size={20} color={labelColor.alternative} /> : null}

      <Text variant="body1" color={labelColor.normal}>
        {label}
      </Text>

      {/* 값은 오른쪽 끝에 붙고, 자리가 모자라면 이름이 아니라 값이 줄어든다 */}
      <View style={styles.spacer} />
      {value != null ? (
        <Text variant="body2" color={labelColor.alternative} numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}

      {/* `›` 는 이름이 이미 말한 것을 되풀이한다 — `Icon` 이 스스로 낭독기에서 빠진다 */}
      {onPress != null ? (
        <Icon name="chevron-right" size={20} color={labelColor.assistive} />
      ) : null}
    </>
  );

  if (onPress == null) return <View style={styles.row}>{body}</View>;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      {({ pressed }) => (
        <>
          {body}
          {/* 누름은 면을 바꾸지 않고 스크림을 얹는다 (`design.md` §6) */}
          {pressed ? <View pointerEvents="none" style={styles.scrim} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** 줄 사이 — 카드 안에서만 쓴다 */
export function RowSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 56,
    paddingVertical: space.lg,
    // ⚠ 클립을 두지 않는다 — 누름 스크림이 자기 radius 를 들고 있고, Android 에서
    // 클립 + 자식 재렌더가 겹치면 글자가 안 그려진다(`ds/Button.tsx` 머리말)
  },
  spacer: { flex: 1, minWidth: space.sm },
  // 이름을 밀지 않고 값이 먼저 줄어든다
  value: { flexShrink: 1, textAlign: "right" },
  scrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: overlay.pressLight,
    borderRadius: radius.small,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: line.alternative },
});
